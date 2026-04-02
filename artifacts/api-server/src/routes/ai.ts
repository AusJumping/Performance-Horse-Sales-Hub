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

  const formData = submission.formData as Record<string, unknown>;

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

    // Delete existing AI output if any
    await db.delete(aiOutputsTable).where(eq(aiOutputsTable.submissionId, id));

    // Store AI output
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

You are writing a premium horse sales listing for Performance Horse Sales Australia and New Zealand.

Using ONLY the information provided below, write a comprehensive master listing for the horse. Include:
- Opening paragraph introducing the horse
- Details about breed, age, height, sex, colour
- Discipline and competition information (only if provided)
- Training and education background (only if provided)
- Temperament and handling (only if provided)
- Health and soundness (only if provided)
- Suitability and ideal rider (only if provided)
- Location and viewing
- Asking price
- Contact/inquiry instructions (generic)

Do not use headers. Write in flowing, professional prose. Maximum 600 words.

SUBMISSION DATA:
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

You are writing a ProHorseMatch platform listing for Performance Horse Sales Australia and New Zealand.

Using ONLY the information provided below, write a structured listing suitable for ProHorseMatch. Use short, factual bullet points under relevant headings. Include only headings where information has been provided.

Headings to consider (use only if data available): About, Discipline, Level, Training, Temperament, Health, Suitability, Price & Location

SUBMISSION DATA:
${summary}`;
}

function socialCaptionPrompt(summary: string): string {
  return `${AI_RULES}

You are writing an Instagram/Facebook caption for Performance Horse Sales Australia and New Zealand.

Using ONLY the information provided below, write an engaging social media caption (100-150 words). Make it warm, professional, and compelling. End with a call to action to enquire. Do not use excessive exclamation marks or hype language.

SUBMISSION DATA:
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

export default router;
