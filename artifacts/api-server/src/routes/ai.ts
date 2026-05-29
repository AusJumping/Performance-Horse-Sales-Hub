import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  submissionsTable,
  aiOutputsTable,
  mediaFilesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

// Get AI output for submission
router.get("/submissions/:id/ai-output", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const [output] = await db
    .select()
    .from(aiOutputsTable)
    .where(eq(aiOutputsTable.submissionId, id));

  if (!output) return res.status(404).json({ error: "No AI output found" });

  res.json(output);
});

// Update AI output
router.patch("/submissions/:id/ai-output", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const updates = req.body as {
    masterListing?: string;
    shortListing?: string;
    proHorseMatchListing?: string;
    socialCaption?: string;
    shortCaptions?: string;
    hashtags?: string;
    buyerSummary?: string;
    keySellingPoints?: string;
    reelOverlayText?: string;
    reelBrief?: string;
  };

  const [existing] = await db
    .select()
    .from(aiOutputsTable)
    .where(eq(aiOutputsTable.submissionId, id));

  if (!existing) return res.status(404).json({ error: "No AI output found" });

  const [updated] = await db
    .update(aiOutputsTable)
    .set(updates)
    .where(eq(aiOutputsTable.submissionId, id))
    .returning();

  res.json(updated);
});

// Generate AI content for submission
router.post("/submissions/:id/generate-ai", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const [submission] = await db
    .select()
    .from(submissionsTable)
    .where(eq(submissionsTable.id, id));

  if (!submission) return res.status(404).json({ error: "Submission not found" });

  // Update status to processing
  await db
    .update(submissionsTable)
    .set({ status: "processing" })
    .where(eq(submissionsTable.id, id));

  const media = await db
    .select()
    .from(mediaFilesTable)
    .where(eq(mediaFilesTable.submissionId, id));

  // Use workingRecord if Sally has edited it; otherwise fall back to original formData
  const workingRecord = submission.workingRecord as Record<string, unknown>;
  const formData = (workingRecord && Object.keys(workingRecord).length > 0)
    ? workingRecord
    : submission.formData as Record<string, unknown>;

  // Build a structured summary of the submission for the AI
  const submissionSummary = buildSubmissionSummary(submission, formData, media);

  try {
    // Generate all outputs in parallel using different prompts
    const [
      masterListing,
      shortListing,
      proHorseMatchListing,
      socialCaption,
      shortCaptions,
      hashtags,
      buyerSummary,
      keySellingPoints,
      reelOverlayText,
      reelBrief,
      aiTags,
    ] = await Promise.all([
      generateContent(masterListingPrompt(submissionSummary)),
      generateContent(shortListingPrompt(submissionSummary)),
      generateContent(proHorseMatchPrompt(submissionSummary)),
      generateContent(socialCaptionPrompt(submissionSummary)),
      generateContent(shortCaptionsPrompt(submissionSummary)),
      generateContent(hashtagsPrompt(submissionSummary)),
      generateContent(buyerSummaryPrompt(submissionSummary)),
      generateContent(keySellingPointsPrompt(submissionSummary)),
      generateContent(reelOverlayPrompt(submissionSummary)),
      generateContent(reelBriefPrompt(submissionSummary)),
      generateContent(tagExtractionPrompt(submissionSummary)),
    ]);

    // Extract tags from AI response
    const extractedTags = aiTags
      .split(/[,\n]/)
      .map((t) => t.trim().toLowerCase().replace(/^[•\-*]\s*/, ""))
      .filter((t) => t.length > 0 && t.length < 50);

    // Preserve ORC text, status and timestamp before wiping the row
    const [existingOutput] = await db
      .select()
      .from(aiOutputsTable)
      .where(eq(aiOutputsTable.submissionId, id));
    const preservedOrc       = existingOutput?.ownerResponseCert ?? null;
    const preservedOrcStatus = existingOutput?.orcStatus ?? null;
    const preservedOrcUpdatedAt = existingOutput?.orcUpdatedAt ?? null;

    // Delete existing AI output if any
    await db.delete(aiOutputsTable).where(eq(aiOutputsTable.submissionId, id));

    // Store AI output — carry forward the saved ORC so edits and status are never wiped
    const [output] = await db
      .insert(aiOutputsTable)
      .values({
        submissionId: id,
        masterListing,
        shortListing,
        proHorseMatchListing,
        socialCaption,
        shortCaptions,
        hashtags,
        buyerSummary,
        keySellingPoints,
        reelOverlayText,
        reelBrief,
        tags: aiTags,
        generatedAt: new Date(),
        ...(preservedOrc ? {
          ownerResponseCert: preservedOrc,
          orcStatus: preservedOrcStatus,
          orcUpdatedAt: preservedOrcUpdatedAt,
        } : {}),
      })
      .returning();

    // Update submission
    await db
      .update(submissionsTable)
      .set({
        aiGenerated: true,
        status: "awaiting_review",
        tags: extractedTags,
      })
      .where(eq(submissionsTable.id, id));

    res.json(output);
  } catch (err) {
    req.log.error({ err }, "AI generation failed");
    // Revert status
    await db
      .update(submissionsTable)
      .set({ status: "new" })
      .where(eq(submissionsTable.id, id));
    res.status(500).json({ error: "AI generation failed" });
  }
});

// ── Owner Response Certificate ────────────────────────────────────────────────

// Get ORC
router.get("/submissions/:id/orc", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const [output] = await db.select().from(aiOutputsTable).where(eq(aiOutputsTable.submissionId, id));
  if (!output) return res.status(404).json({ error: "No AI output record found" });

  res.json({
    ownerResponseCert: output.ownerResponseCert,
    orcStatus: output.orcStatus,
    orcUpdatedAt: output.orcUpdatedAt,
  });
});

// Generate ORC
router.post("/submissions/:id/generate-orc", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const [submission] = await db.select().from(submissionsTable).where(eq(submissionsTable.id, id));
  if (!submission) return res.status(404).json({ error: "Submission not found" });

  // Use workingRecord if available, fall back to formData
  const workingRecord = submission.workingRecord as Record<string, unknown>;
  const formData = (workingRecord && Object.keys(workingRecord).length > 0)
    ? workingRecord
    : submission.formData as Record<string, unknown>;

  const summary = buildSubmissionSummary(submission, formData, []);

  try {
    const orc = await generateContent(orcPrompt(submission, formData, summary));

    // Upsert into ai_outputs
    const [existing] = await db.select().from(aiOutputsTable).where(eq(aiOutputsTable.submissionId, id));
    if (existing) {
      await db.update(aiOutputsTable).set({
        ownerResponseCert: orc,
        orcStatus: "generated",
        orcUpdatedAt: new Date(),
      }).where(eq(aiOutputsTable.submissionId, id));
    } else {
      await db.insert(aiOutputsTable).values({
        submissionId: id,
        ownerResponseCert: orc,
        orcStatus: "generated",
        orcUpdatedAt: new Date(),
      });
    }

    res.json({ ownerResponseCert: orc, orcStatus: "generated" });
  } catch (err) {
    req.log.error({ err }, "ORC generation failed");
    res.status(500).json({ error: "ORC generation failed" });
  }
});

// Save edited ORC / update status
router.patch("/submissions/:id/orc", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const { ownerResponseCert, orcStatus } = req.body as {
    ownerResponseCert?: string;
    orcStatus?: string;
  };

  const [existing] = await db.select().from(aiOutputsTable).where(eq(aiOutputsTable.submissionId, id));

  const updates: Record<string, unknown> = { orcUpdatedAt: new Date() };
  if (ownerResponseCert !== undefined) updates.ownerResponseCert = ownerResponseCert;
  if (orcStatus !== undefined) updates.orcStatus = orcStatus;

  if (existing) {
    const [updated] = await db.update(aiOutputsTable).set(updates).where(eq(aiOutputsTable.submissionId, id)).returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(aiOutputsTable).values({
      submissionId: id,
      ...updates,
    } as any).returning();
    res.json(created);
  }
});

// ── Horse Description ──────────────────────────────────────────────────────

// Generate Horse Description from the ORC
router.post("/submissions/:id/generate-horse-description", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const [submission] = await db.select().from(submissionsTable).where(eq(submissionsTable.id, id));
  if (!submission) return res.status(404).json({ error: "Submission not found" });

  const [aiRow] = await db.select().from(aiOutputsTable).where(eq(aiOutputsTable.submissionId, id));
  const orcText = aiRow?.ownerResponseCert;
  if (!orcText) return res.status(400).json({ error: "Generate the Owner Response Certificate first — the Horse Description is written from it." });

  try {
    const hd = await generateContent(horseDescriptionPrompt(submission, orcText));

    if (aiRow) {
      await db.update(aiOutputsTable).set({
        horseDescription: hd,
        horseDescriptionStatus: "generated",
        horseDescriptionUpdatedAt: new Date(),
      }).where(eq(aiOutputsTable.submissionId, id));
    } else {
      await db.insert(aiOutputsTable).values({
        submissionId: id,
        horseDescription: hd,
        horseDescriptionStatus: "generated",
        horseDescriptionUpdatedAt: new Date(),
      });
    }

    res.json({ horseDescription: hd, horseDescriptionStatus: "generated" });
  } catch (err) {
    req.log.error({ err }, "Horse description generation failed");
    res.status(500).json({ error: "Horse description generation failed" });
  }
});

// Save / update Horse Description
router.patch("/submissions/:id/horse-description", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const { horseDescription, horseDescriptionStatus } = req.body as {
    horseDescription?: string;
    horseDescriptionStatus?: string;
  };

  const [existing] = await db.select().from(aiOutputsTable).where(eq(aiOutputsTable.submissionId, id));

  const updates: Record<string, unknown> = { horseDescriptionUpdatedAt: new Date() };
  if (horseDescription !== undefined) updates.horseDescription = horseDescription;
  if (horseDescriptionStatus !== undefined) updates.horseDescriptionStatus = horseDescriptionStatus;

  if (existing) {
    const [updated] = await db.update(aiOutputsTable).set(updates).where(eq(aiOutputsTable.submissionId, id)).returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(aiOutputsTable).values({ submissionId: id, ...updates } as any).returning();
    res.json(created);
  }
});

async function generateContent(prompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-5",
    max_completion_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });
  return response.choices[0]?.message?.content ?? "";
}

function buildSubmissionSummary(
  submission: { horseName: string | null; breed: string | null; age: string | null; colour: string | null; height: string | null; sex: string | null; askingPrice: string | null; location: string | null; discipline: string | null; sellerName: string | null },
  formData: Record<string, unknown>,
  media: Array<{ mediaType: string; originalName: string }>
): string {
  const mediaInfo = media.length > 0
    ? `\nMedia: ${media.filter(m => m.mediaType === "photo").length} photos, ${media.filter(m => m.mediaType === "video").length} videos, ${media.filter(m => m.mediaType === "document").length} documents uploaded.`
    : "\nMedia: No media files uploaded.";

  // Build readable field list from formData
  const fieldLines: string[] = [];
  for (const [key, value] of Object.entries(formData)) {
    if (value !== null && value !== undefined && value !== "") {
      fieldLines.push(`${key}: ${String(value)}`);
    }
  }

  return `
HORSE LISTING SUBMISSION DATA
==============================
Horse Name: ${submission.horseName ?? "Not provided"}
Breed: ${submission.breed ?? "Not provided"}
Age: ${submission.age ?? "Not provided"}
Colour/Markings: ${submission.colour ?? "Not provided"}
Height: ${submission.height ?? "Not provided"}
Sex: ${submission.sex ?? "Not provided"}
Asking Price: ${submission.askingPrice ? `AUD ${submission.askingPrice}` : "Not provided"}
Location: ${submission.location ?? "Not provided"}
Primary Discipline: ${submission.discipline ?? "Not provided"}
Seller: ${submission.sellerName ?? "Not provided"}
${mediaInfo}

FULL FORM DATA:
${fieldLines.join("\n")}
`;
}

const AI_RULES = `
CRITICAL AI RULES — FOLLOW THESE WITHOUT EXCEPTION:
- Only use information explicitly provided in the submission data above
- Never invent facts, breeding details, competition history, or suitability claims
- Never make up temperament, soundness, training, or behaviour claims
- If a detail is missing or not provided, leave it out entirely — do not infer
- Never use placeholder text or "[Insert X]" style text
- If information is insufficient for a section, skip that section
- Preserve accuracy over sales language
- Tone: polished, professional, warm, premium, credible, clear, sales-focused without exaggeration, horse-savvy, not cheesy, not hype-driven
`;

function masterListingPrompt(summary: string): string {
  return `${AI_RULES}

You are writing a branded, structured, buyer-facing Master Listing for Performance Horse Sales Australia and New Zealand (PHS).

This is NOT a freeform prose summary. It is a curated sales listing written in the style of an experienced equine sales professional — the benchmark is Sally Empringham's listing style at PHS.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL APPROACH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO:
- Curate. Include only the most commercially relevant information.
- Structure the listing in a predictable, branded format with labelled sections.
- Help buyers scan quickly. Use the quick facts block. Use headings.
- Filter for suitability clearly — help the right buyer find this horse.
- Present the horse honestly and positively.
- Sound like a horse-savvy, commercially aware sales professional.
- Be polished, calm, credible, warm and selective.

DO NOT:
- Include every data point just because it exists.
- Write one long block of flowing prose.
- Use gushy, overblown, cliché-heavy, or cheesy language.
- Invent facts, results, or suitability claims.
- Use placeholder text such as [Insert X].
- Front-load the listing with negatives or make it read like a risk report.
- Sound generic, robotic, too clinical, or like a typical marketplace ad.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIRED STRUCTURE — FOLLOW THIS EXACTLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Output the listing in this shape. Use the exact headings shown.

[HORSE NAME IN CAPITALS]

Proudly presented by Performance Horse Sales AU NZ
All enquiries to PHS — 0428 239 317 | performancehorsesales.com.au
Expression of Interest: performancehorsesales.com.au/eoi

Asking price: [price — if not provided, omit this line]
Height: [height]
Age: [age]
Gender: [gender/sex]
Colour: [colour]
Breed: [breed]
Discipline: [primary discipline]
Rider suitability: [one clear, concise suitability line]
Location: [location]
Please see Owner's Response Certificate for full details.

SIGNIFICANT RESULTS
(Only include this section if competition results were provided. List them as short, punchy bullet points. Omit this section entirely if no results were provided.)
- [Result 1]
- [Result 2]

Introduction:
[One concise, polished prose paragraph introducing the horse and his/her overall appeal. Lead with what makes this horse commercially interesting. Do not repeat the quick facts block. No bullet points.]

Education, skills and experience:
[A prose paragraph covering competition experience, training background, disciplines, flatwork or jumping education. Only what was provided. No bullet points.]

General demeanour under saddle:
[A prose paragraph describing how the horse feels to ride. Honest but measured. Note any pressure points in calm, professional language — the goal is honest filtering, not alarm. No bullet points.]

Current workload / fitness:
[A prose paragraph on current work status and fitness. Only if information was provided. No bullet points.]

Handling:
[A prose paragraph on ground manners, loading, travel, farrier, vet, day-to-day behaviour. Only if provided. No bullet points.]

Feeding and management:
[A brief prose paragraph — buyer-relevant management summary only. Omit specific supplement brands unless clearly important. Only if provided. No bullet points.]

Medical history:
[A brief, factual prose paragraph — buyer-relevant summary only. Do not include exhaustive vet detail here — that belongs in the ORC. Only if provided. No bullet points.]

Rider Suitability:
[A clear, commercially useful prose paragraph. Who is the ideal buyer? What experience level, goals and situation does this horse suit? Use honest, measured wording for any limitations. No bullet points.]

Reason for sale:
[A short prose sentence or two. Honest and concise. Only if provided. No bullet points.]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTENT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Omit any section entirely if there is not enough real information to justify it.
- Do not invent content to fill a heading.
- Do not repeat information across sections.
- Keep narrative sections concise — this is a listing, not a report.
- Tack details, detailed supplement schedules, and minor admin details belong in supporting docs, not here.
- Enquiries must be directed to PHS (not the owner directly).
- Do not introduce urgency phrases such as "priced to sell quickly" unless the seller has explicitly stated this.
- Do not include unsupported superlatives.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUALITY CHECK — BEFORE OUTPUTTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before finalising the listing, verify:
1. Does this read like a curated sales listing, not a data summary?
2. Is rider suitability clear early in the listing?
3. Is the structure scan-friendly with headings present?
4. Have I included only the most buyer-relevant detail?
5. Is the tone calm, professional, credible, and warm?
6. Have I avoided sounding defensive, clinical, generic, or gushy?
7. Is all content strictly grounded in the submitted facts?

If the answer to any of these is no, revise before outputting.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUBMISSION DATA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${summary}`;
}

function shortListingPrompt(summary: string): string {
  return `${AI_RULES}

You are writing a concise horse sales listing for Performance Horse Sales Australia and New Zealand.

Using ONLY the information provided below, write a short listing (150-200 words) that captures the key highlights of this horse. This is for secondary platforms and quick-view listings.

SUBMISSION DATA:
${summary}`;
}

function proHorseMatchPrompt(summary: string): string {
  return `${AI_RULES}

You are writing a ProHorseMatch platform listing for Performance Horse Sales Australia and New Zealand (PHS).

This listing must follow the same branded, structured format as the PHS Master Listing — not a generic bullet-point summary. It is a curated, buyer-facing sales listing written in the style of an experienced equine sales professional.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL APPROACH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO:
- Curate. Include only the most commercially relevant information.
- Structure the listing in a predictable, branded format with labelled sections.
- Help buyers scan quickly. Use the quick facts block. Use headings.
- Filter for suitability clearly — help the right buyer find this horse.
- Present the horse honestly and positively.
- Sound like a horse-savvy, commercially aware sales professional.
- Be polished, calm, credible, warm and selective.

DO NOT:
- Include every data point just because it exists.
- Write one long block of flowing prose.
- Use gushy, overblown, cliché-heavy, or cheesy language.
- Invent facts, results, or suitability claims.
- Use placeholder text such as [Insert X].
- Front-load the listing with negatives or make it read like a risk report.
- Sound generic, robotic, too clinical, or like a typical marketplace ad.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIRED STRUCTURE — FOLLOW THIS EXACTLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Output the listing in this shape. Use the exact headings shown.

[HORSE NAME IN CAPITALS]

Proudly presented by Performance Horse Sales AU NZ
All enquiries to PHS — 0428 239 317 | performancehorsesales.com.au
Expression of Interest: performancehorsesales.com.au/eoi

Asking price: [price — if not provided, omit this line]
Height: [height]
Age: [age]
Gender: [gender/sex]
Colour: [colour]
Breed: [breed]
Discipline: [primary discipline]
Rider suitability: [one clear, concise suitability line]
Location: [location]
Please see Owner's Response Certificate for full details.

SIGNIFICANT RESULTS
(Only include this section if competition results were provided. List them as short, punchy bullet points. Omit this section entirely if no results were provided.)
- [Result 1]
- [Result 2]

Introduction:
- [Key selling point 1]
- [Key selling point 2]
- [Key selling point 3 — only if supported by data]

Education, skills and experience:
- [Discipline/competition experience point]
- [Training background point]
- [Additional education point — only if provided]

General demeanour under saddle:
- [Rideability point 1]
- [Rideability point 2 — honest, measured; note any pressure points calmly]

Current workload / fitness:
- [Current work status — only if provided]

Handling:
- [Ground manner / loading / travel point — only if provided]
- [Farrier / vet behaviour — only if provided]

Feeding and management:
- [Buyer-relevant management point — only if provided; omit supplement brand detail]

Medical history:
- [Factual, buyer-relevant medical point — only if provided; exhaustive detail belongs in the ORC]

Rider Suitability:
- [Who this horse suits — experience level, goals, situation]
- [Any suitability limitations — honest and measured, not alarming]

Reason for sale:
- [Honest and concise — only if provided]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTENT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Omit any section entirely if there is not enough real information to justify it.
- Do not invent content to fill a heading.
- Do not repeat information across sections.
- Keep bullet points short and factual — this is a scan-friendly platform listing.
- Tack details, detailed supplement schedules, and minor admin details belong in supporting docs, not here.
- Enquiries must be directed to PHS (not the owner directly).
- Do not introduce urgency phrases such as "priced to sell quickly" unless the seller has explicitly stated this.
- Do not include unsupported superlatives.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUBMISSION DATA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${summary}`;
}

function socialCaptionPrompt(summary: string): string {
  return `${AI_RULES}

You are writing the Social Caption (Main) for Performance Horse Sales Australia and New Zealand (PHS).

This caption will be published on Instagram and Facebook. It must NOT read like a compressed listing, a data summary, a spec sheet, or a marketplace ad. It must feel like a thoughtful, warm, polished social media introduction to the horse — written by a person who understands both horses and buyers.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL STYLE RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO:
- Sound like a real person speaking naturally to an audience
- Be conversational, warm, credible, and easy to read
- Curate — choose the most appealing points, not all of them
- Space the post well so each idea breathes
- Let facts enter the narrative naturally, not in blunt lists
- Be persuasive in a calm, honest way
- Make rider suitability clear but frame it as thoughtful guidance, not a warning label

DO NOT:
- Open with a long string of stats or specs
- Write like software summarising a form
- Use em dashes anywhere — use commas or full stops instead
- Use cheesy, pushy, gimmicky, or overly promotional phrases
- Cram every available detail into the caption
- Write one giant paragraph
- Use phrases like "genuine sale", "enquire now for videos", or "proven X with placings at..." in a blunt, ad-like way
- Make the horse sound like a problem when noting suitability
- Repeat negatives

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUIRED STRUCTURE — FOLLOW THIS SHAPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Hook line
Open with a strong, natural first sentence that gives people a reason to keep reading.
Do NOT open with stats. Examples of good hook styles:
- "Some horses are ready to help a rider keep building."
- "For the right rider, this is the kind of horse that can be genuinely rewarding."
- "There is a lot to like about a horse who is educated, careful and already proven."

2. Short follow-up paragraph
Expand on what makes this horse appealing. Focus on overall value, feel, or appeal.

3. Education / competition paragraph
Bring in competition level, education, or background in a smooth, readable way.
Do not list too many achievements in one sentence.

4. Suitability paragraph
Be honest and clear about who this horse suits.
This should feel like thoughtful guidance for the right buyer, not a warning.

5. Optional closing paragraph
Briefly reinforce what makes this horse appealing for the right buyer. Keep it short.

6. Facts block (end of post)
A clean, scan-friendly summary:
[Height] | [Age] | [Breed] | [Gender]
Discipline: [Discipline]
Rider suitability: [Suitability]
Price: [Price — if provided]
Location: [Location]

7. Enquiry line
A simple, professional enquiry line directing to PHS.
Example: "All enquiries to Performance Horse Sales — 0428 239 317 | performancehorsesales.com.au"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTENT FILTERING RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Usually include:
- The horse's main appeal and overall type
- Age, height, breed if helpful to the narrative
- Discipline and level
- Key strengths
- Rider suitability
- Location and price

Usually omit or minimise:
- Full breeding strings in the opening line
- Technical tack details
- Detailed feed programs
- Long medical summaries
- Too many competition results in one paragraph
- Overly specific maintenance notes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUALITY CHECK BEFORE OUTPUTTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Does this sound like a person talking naturally, not summarising a form?
2. Is the opening engaging rather than just factual?
3. Have I selected only the most important and appealing details?
4. Is the post easy to read on social media?
5. Is rider suitability clear but not harsh?
6. Does the tone feel warm, polished, and credible?
7. Have I avoided em dashes completely?
8. Have I avoided sounding like a generic advertisement?

If the answer to any of these is no, revise before outputting.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUBMISSION DATA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${summary}`;
}

function shortCaptionsPrompt(summary: string): string {
  return `${AI_RULES}

You are writing short social media caption variations for Performance Horse Sales Australia and New Zealand.

Using ONLY the information provided below, write exactly 3 short caption variations for Facebook and Instagram. Each caption must be:
- 30-60 words maximum
- Different in tone or angle from the others (e.g. one factual, one emotive, one hook-style)
- Professional and sales-focused without hype

Format your response exactly like this, with each caption on its own numbered line:

1. [Caption text here]

2. [Caption text here]

3. [Caption text here]

SUBMISSION DATA:
${summary}`;
}

function hashtagsPrompt(summary: string): string {
  return `${AI_RULES}

You are generating hashtags for a Performance Horse Sales Australia and New Zealand social media post.

Using ONLY the information provided below, generate 20-30 relevant hashtags. Mix broad equestrian hashtags with specific ones relevant to this horse's breed, discipline, location, and characteristics. Format as a single line with each hashtag separated by a space.

SUBMISSION DATA:
${summary}`;
}

function buyerSummaryPrompt(summary: string): string {
  return `${AI_RULES}

You are writing an internal buyer-match summary for Performance Horse Sales Australia and New Zealand staff.

Using ONLY the information provided below, write a concise internal summary (80-120 words) that helps staff match this horse with suitable buyers. Describe who the ideal buyer is and what they are looking for, based only on what the seller has provided.

SUBMISSION DATA:
${summary}`;
}

function keySellingPointsPrompt(summary: string): string {
  return `${AI_RULES}

You are identifying key selling points for Performance Horse Sales Australia and New Zealand.

Using ONLY the information provided below, list 5-8 key selling points for this horse. Format as a bulleted list with a brief explanation for each point. Only include genuine selling points supported by the submission data.

SUBMISSION DATA:
${summary}`;
}

function reelOverlayPrompt(summary: string): string {
  return `${AI_RULES}

You are writing social media reel text overlay copy for Performance Horse Sales Australia and New Zealand.

Using ONLY the information provided below, write 6-8 short text overlay lines suitable for a 30-60 second Instagram/TikTok reel. Each line should be punchy, 3-8 words maximum. These will be displayed on screen over video footage. Format as a numbered list.

SUBMISSION DATA:
${summary}`;
}

function reelBriefPrompt(summary: string): string {
  return `${AI_RULES}

You are creating a reel production brief for Performance Horse Sales Australia and New Zealand.

Using ONLY the information provided below, create a detailed reel brief. Include:
- Recommended aspect ratio: 9:16 (portrait/Instagram Reels)
- Recommended duration: 30-45 seconds
- Opening hook (first 3 seconds)
- Scene-by-scene breakdown (6-8 scenes) with suggested clip content and on-screen text
- Timing suggestions per scene
- Music direction (style/mood, not specific tracks)
- Colour grade direction
- Caption suggestion
- Call to action
- Notes for Canva/CapCut/Creatomate

Base all content strictly on the submission data provided.

SUBMISSION DATA:
${summary}`;
}

function orcPrompt(
  submission: { horseName: string | null; breed: string | null; age: string | null; colour: string | null; height: string | null; sex: string | null; askingPrice: string | null; location: string | null; discipline: string | null; sellerName: string | null },
  formData: Record<string, unknown>,
  summary: string
): string {
  // Pull structured fields for the ORC
  const f = (key: string) => {
    const v = formData[key];
    return v && v !== "" ? String(v) : null;
  };

  return `You are creating an Owner Response Certificate (ORC) for Performance Horse Sales Australia and New Zealand.

The ORC is a FACTUAL, STRUCTURED document that will be shared with buyers. It is based on information provided by the seller. It is NOT a sales document and must NOT use marketing language, adjectives, or persuasive tone. It is a clean, organised factual record.

STRICT RULES:
- Only include information that was explicitly provided in the submission data
- Do not invent, infer, or embellish any details
- Do not use salesy language, superlatives, or adjectives
- If a section has no data, write "Not provided" — do not skip the section
- Use plain, factual language throughout
- Format as a structured document with clear section headings
- NEVER reference the source of information in the output — do not use phrases like "stated by seller", "as per seller's note", "seller noted", "seller stated", "according to the seller", "as noted", "as described", "owner noted", or any similar attribution. Simply state the facts directly.
- DO NOT include: asking price, preferred sale price, listing service type, marketing options, additional marketing selections, seller contact details, seller email, seller phone, or seller address — these are private and must not appear in this document
- DO NOT include: feeding notes or feeding details, photos/video commitment or delivery method, listing service selection or fee details — these are internal admin only and must not appear in this document
- For horse location, include SUBURB AND STATE ONLY (e.g. "Bowral, NSW") — never include a street address or full property address

REQUIRED SECTIONS (include all, even if data is sparse):

1. HORSE DETAILS
   - Name, breed, age, colour/markings, height, sex, registration/papers

2. DISCIPLINES AND LEVEL
   - Disciplines competed in or trained for
   - Competition level

3. COMPETITION AND PERFORMANCE HISTORY
   - Specific results and records (only if provided)

4. TRAINING AND EDUCATION
   - Current training schedule, trainers, education background
   - Behaviour in and out of work (e.g. whether the horse needs regular riding to stay reliable, whether it is safe to ride after a spell)
   - Gear and tack requirements (e.g. snaffle, specific bit, specific saddle — or no specific tack needed)
   - Additional notes on education and competition history

5. TEMPERAMENT AND HANDLING
   - How the horse behaves on the ground and under saddle
   - Float/transport, farrier, vet behaviour

6. MANAGEMENT AND HEALTH
   - Management preferences (e.g. herd, paddocked alone, stabled — include all options provided)
   - Known health history, medications, injuries
   - Dental, farrier, worming details
   - Previous vet checks

7. SUITABILITY
   - Rider level and type described
   - Any restrictions or requirements noted

8. REASON FOR SALE AND IDEAL HOME
   - Reason for sale (if provided)
   - Preferred home or rider type (if provided)

9. ADDITIONAL INFORMATION
   - Any other relevant details that do not fit the above sections

Format each section with the heading in CAPITALS followed by bullet points or short sentences.

SELLER DATA:
${summary}`;
}

function tagExtractionPrompt(summary: string): string {
  return `${AI_RULES}

You are extracting internal classification tags for Performance Horse Sales Australia and New Zealand.

Using ONLY the information provided below, suggest 5-10 internal tags for this horse from the following categories:
Discipline tags: showjumper, dressage, eventer, western, trail, hack, campdraft, pony-club, endurance, showing, rodeo, multi-discipline
Suitability tags: junior-mount, beginner-suitable, amateur-suitable, advanced-rider, professional-level, family-horse, competition-horse, schoolmaster, young-horse, project-horse
Other tags: mare, gelding, stallion, registered, unregistered, competition-record, priced-to-sell

Return only a comma-separated list of relevant tags, no explanations.

SUBMISSION DATA:
${summary}`;
}

function horseDescriptionPrompt(
  submission: { horseName: string | null; breed: string | null; age: string | null; sex: string | null; location: string | null },
  orcText: string
): string {
  return `You are a specialist copywriter for Performance Horse Sales Australia and New Zealand — a premium equine sales agency.

Your task is to write a compelling, well-crafted horse listing description based on the Owner Response Certificate (ORC) provided below. The ORC contains verified factual information provided by the seller. Your description must be accurate — do not invent, exaggerate, or add details not present in the ORC.

STRICT RULES:
- Write in flowing prose — no bullet points or numbered lists
- Do not use emojis
- Do not use salesy clichés (e.g. "don't miss out", "once in a lifetime", "the perfect horse")
- Do not use superlatives unless directly supported by fact (e.g. "multiple champion" is fine if stated; "exceptional" with no basis is not)
- Be emotive and engaging, but remain credible and horse-savvy
- Tone: premium, warm, confident, knowledgeable — written for a discerning horse buyer
- Length: 250–400 words
- Write in third person (e.g. "He is...", "She offers...", "This gelding...")
- Do not repeat the horse's name more than 3 times — vary with pronouns

STRUCTURE (prose — not headings, just natural flow):
1. Opening: Introduce the horse — name, breed, age, sex — and the impression they make overall
2. What they do: disciplines, training, competition highlights if present
3. Who they are: character, temperament, ground manners — bring them to life
4. Health and care: briefly if notable
5. Ideal home: what kind of rider or situation would suit them, as described by the seller
6. Closing sentence: a confident, warm sign-off that leaves the reader wanting to enquire

HORSE: ${submission.horseName ?? "Unknown"} (${submission.sex ?? ""} ${submission.breed ?? ""}, ${submission.age ?? "?"} yo)
LOCATION: ${submission.location ?? "Not specified"}

OWNER RESPONSE CERTIFICATE:
${orcText}`;
}

export default router;
