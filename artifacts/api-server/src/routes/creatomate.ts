import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  submissionsTable,
  aiOutputsTable,
  mediaFilesTable,
  reelTemplatesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const storageService = new ObjectStorageService();

const BRAND_NAME = "Performance Horse Sales";
const WEBSITE = "performancehorsesales.com.au";

// ─── Reel Template CRUD ──────────────────────────────────────────────────────

// GET /api/reel-templates
router.get("/reel-templates", async (_req, res) => {
  const templates = await db.select().from(reelTemplatesTable);
  // Mask API keys in the list view
  const masked = templates.map((t) => ({
    ...t,
    apiKey: `••••••${t.apiKey.slice(-6)}`,
  }));
  res.json(masked);
});

// GET /api/reel-templates/:id (full, for render use — server only)
async function getTemplate(id: number) {
  const [t] = await db.select().from(reelTemplatesTable).where(eq(reelTemplatesTable.id, id));
  return t ?? null;
}

// POST /api/reel-templates
router.post("/reel-templates", async (req, res) => {
  const { name, description, apiKey, templateId, isDefault, overlayTextField, text2Field, text3Field, text4Field, text5Field, text6Field, brandTextField, websiteTextField, image1Field, image2Field, image3Field, image4Field, logoField, logoUrl, apiVersion } = req.body;
  if (!name || !apiKey || !templateId) {
    return res.status(400).json({ error: "name, apiKey and templateId are required." });
  }
  if (isDefault) {
    await db.update(reelTemplatesTable).set({ isDefault: false });
  }
  const [created] = await db
    .insert(reelTemplatesTable)
    .values({
      name,
      description: description ?? null,
      apiKey,
      templateId,
      isDefault: !!isDefault,
      ...(overlayTextField !== undefined && { overlayTextField }),
      ...(text2Field !== undefined && { text2Field }),
      ...(text3Field !== undefined && { text3Field }),
      ...(text4Field !== undefined && { text4Field }),
      ...(text5Field !== undefined && { text5Field }),
      ...(text6Field !== undefined && { text6Field }),
      ...(brandTextField !== undefined && { brandTextField }),
      ...(websiteTextField !== undefined && { websiteTextField }),
      ...(image1Field !== undefined && { image1Field }),
      ...(image2Field !== undefined && { image2Field }),
      ...(image3Field !== undefined && { image3Field }),
      ...(image4Field !== undefined && { image4Field }),
      ...(logoField !== undefined && { logoField }),
      ...(logoUrl !== undefined && { logoUrl }),
      ...(apiVersion !== undefined && { apiVersion }),
    })
    .returning();
  res.status(201).json({ ...created, apiKey: `••••••${created.apiKey.slice(-6)}` });
});

// PATCH /api/reel-templates/:id
router.patch("/reel-templates/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  const { name, description, apiKey, templateId, isDefault, overlayTextField, text2Field, text3Field, text4Field, text5Field, text6Field, brandTextField, websiteTextField, image1Field, image2Field, image3Field, image4Field, logoField, logoUrl, apiVersion } = req.body;
  if (isDefault) {
    await db.update(reelTemplatesTable).set({ isDefault: false });
  }
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (apiKey !== undefined && apiKey !== "") updates.apiKey = apiKey;
  if (templateId !== undefined) updates.templateId = templateId;
  if (isDefault !== undefined) updates.isDefault = !!isDefault;
  if (overlayTextField !== undefined) updates.overlayTextField = overlayTextField;
  if (text2Field !== undefined) updates.text2Field = text2Field;
  if (text3Field !== undefined) updates.text3Field = text3Field;
  if (text4Field !== undefined) updates.text4Field = text4Field;
  if (text5Field !== undefined) updates.text5Field = text5Field;
  if (text6Field !== undefined) updates.text6Field = text6Field;
  if (brandTextField !== undefined) updates.brandTextField = brandTextField;
  if (websiteTextField !== undefined) updates.websiteTextField = websiteTextField;
  if (image1Field !== undefined) updates.image1Field = image1Field;
  if (image2Field !== undefined) updates.image2Field = image2Field;
  if (image3Field !== undefined) updates.image3Field = image3Field;
  if (image4Field !== undefined) updates.image4Field = image4Field;
  if (logoField !== undefined) updates.logoField = logoField;
  if (logoUrl !== undefined) updates.logoUrl = logoUrl;
  if (apiVersion !== undefined) updates.apiVersion = apiVersion;
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No fields to update." });
  }
  const [updated] = await db
    .update(reelTemplatesTable)
    .set(updates)
    .where(eq(reelTemplatesTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Template not found" });
  res.json({ ...updated, apiKey: `••••••${updated.apiKey.slice(-6)}` });
});

// DELETE /api/reel-templates/:id
router.delete("/reel-templates/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  await db.delete(reelTemplatesTable).where(eq(reelTemplatesTable.id, id));
  res.json({ ok: true });
});

// ─── Reel Render ─────────────────────────────────────────────────────────────

// POST /api/submissions/:id/reel
// Body: { templateId: number }  (DB id of the reel template to use)
router.post("/submissions/:id/reel", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const templateDbId = parseInt(req.body?.templateId);
  if (isNaN(templateDbId)) {
    return res.status(400).json({ error: "templateId (reel template ID) is required." });
  }

  const template = await getTemplate(templateDbId);
  if (!template) return res.status(404).json({ error: "Reel template not found." });

  const [submission] = await db
    .select()
    .from(submissionsTable)
    .where(eq(submissionsTable.id, id));
  if (!submission) return res.status(404).json({ error: "Submission not found" });

  const [aiOutput] = await db
    .select()
    .from(aiOutputsTable)
    .where(eq(aiOutputsTable.submissionId, id));

  const photos = await db
    .select()
    .from(mediaFilesTable)
    .where(eq(mediaFilesTable.submissionId, id))
    .then((files) => files.filter((f) => f.mediaType === "photo"));

  if (photos.length === 0) {
    return res.status(400).json({
      error: "No photos uploaded for this submission. Please upload at least 1 photo first.",
    });
  }

  // Send all overlay lines (stripping "1." numbering), or fallback to horse info
  const title = aiOutput?.reelOverlayText
    ? aiOutput.reelOverlayText
        .split("\n")
        .map((line) => line.replace(/^\d+\.\s*/, "").trim())
        .filter(Boolean)
        .join("\n")
    : [
        submission.horseName,
        submission.breed,
        submission.age ? `${submission.age} yo` : null,
        submission.height ? `${submission.height}hh` : null,
        submission.askingPrice || null,
      ]
        .filter(Boolean)
        .join(" · ");

  const PLACEHOLDER = "https://creatomate.com/files/assets/82c2f851-ebc6-426b-ba42-158df4293368";

  // Generate presigned GCS GET URLs so Creatomate can fetch them from any environment
  const getPhotoUrl = async (photo: (typeof photos)[0] | undefined, fallback: (typeof photos)[0] | undefined) => {
    const p = photo ?? fallback;
    if (!p) return PLACEHOLDER;
    if (p.storagePath && p.storagePath.startsWith("/objects/")) {
      try {
        const url = await storageService.getObjectEntityDownloadURL(p.storagePath, 900);
        console.log(`[reel] presigned URL generated for ${p.storagePath}: ${url.slice(0, 80)}...`);
        return url;
      } catch (err) {
        console.error(`[reel] failed to generate presigned URL for ${p.storagePath}:`, err);
      }
    }
    // storagePath missing or presign failed — fall back to placeholder so
    // Creatomate gets a valid image rather than an inaccessible relative URL
    console.warn(`[reel] using placeholder for photo id=${p.id}, url=${p.url}`);
    return PLACEHOLDER;
  };

  const [img1, img2, img3, img4] = await Promise.all([
    getPhotoUrl(photos[0], undefined),
    getPhotoUrl(photos[1], photos[0]),
    getPhotoUrl(photos[2], photos[0]),
    getPhotoUrl(photos[3] ?? photos[2] ?? photos[0], photos[0]),
  ]);

  // Split overlay text lines evenly across all configured text slots
  const overlayLines = title
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const textSlots = [
    template.overlayTextField,
    template.text2Field,
    template.text3Field,
    template.text4Field,
    template.text5Field,
    template.text6Field,
  ].filter(Boolean) as string[];

  const modifications: Record<string, string> = {};

  if (textSlots.length === 1) {
    // Only one field — put everything in it
    modifications[textSlots[0]] = overlayLines.join("\n");
  } else {
    // Distribute lines as evenly as possible across slots
    const linesPerSlot = Math.ceil(overlayLines.length / textSlots.length);
    textSlots.forEach((field, i) => {
      const chunk = overlayLines.slice(i * linesPerSlot, (i + 1) * linesPerSlot);
      if (chunk.length > 0) modifications[field] = chunk.join("\n");
    });
  }

  // Image source fields — only add if the field name is configured
  if (template.image1Field) modifications[template.image1Field] = img1;
  if (template.image2Field) modifications[template.image2Field] = img2;
  if (template.image3Field) modifications[template.image3Field] = img3;
  if (template.image4Field) modifications[template.image4Field] = img4;
  // Only add brand/website fields if configured (some templates don't have them)
  if (template.brandTextField) modifications[template.brandTextField] = BRAND_NAME;
  if (template.websiteTextField) modifications[template.websiteTextField] = WEBSITE;
  // Logo image — only add if both the field name and URL are configured
  if (template.logoField && template.logoUrl) modifications[template.logoField] = template.logoUrl;

  console.log(`[reel] sending modifications to Creatomate:`, JSON.stringify(modifications, null, 2));

  const apiVersion = template.apiVersion ?? "v1";
  const renderRes = await fetch(`https://api.creatomate.com/${apiVersion}/renders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${template.apiKey}`,
    },
    body: JSON.stringify({ template_id: template.templateId, modifications }),
  });

  if (!renderRes.ok) {
    const errText = await renderRes.text();
    return res.status(502).json({ error: `Creatomate error: ${errText}` });
  }

  const renders = await renderRes.json();
  const render = Array.isArray(renders) ? renders[0] : renders;

  res.json({
    renderId: render.id,
    status: render.status,
    url: render.url ?? null,
    previewUrl: render.snapshot_url ?? null,
  });
});

// GET /api/submissions/:id/reel/:renderId — poll render status
// Body or query: templateId (needed to pick the right API key + version)
router.get("/submissions/:id/reel/:renderId", async (req, res) => {
  const templateDbId = parseInt((req.query.templateId as string) ?? "0");
  const { renderId } = req.params;

  let apiKey: string | undefined;
  let apiVersion = "v1";

  if (!isNaN(templateDbId) && templateDbId > 0) {
    const template = await getTemplate(templateDbId);
    apiKey = template?.apiKey;
    if (template?.apiVersion) apiVersion = template.apiVersion;
  }

  // Fallback to env var for backward compat
  if (!apiKey) apiKey = process.env.CREATOMATE_API_KEY;

  if (!apiKey) {
    return res.status(503).json({ error: "No API key available for this template." });
  }

  const statusRes = await fetch(`https://api.creatomate.com/${apiVersion}/renders/${renderId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!statusRes.ok) {
    const errText = await statusRes.text();
    return res.status(502).json({ error: `Creatomate error: ${errText}` });
  }

  const render = await statusRes.json();

  res.json({
    renderId: render.id,
    status: render.status,
    url: render.url ?? null,
    previewUrl: render.snapshot_url ?? null,
  });
});

// GET /api/submissions/:id/reel/:renderId/download — proxy video for true file download
router.get("/submissions/:id/reel/:renderId/download", async (req, res) => {
  const { id, renderId } = req.params;
  const templateDbId = parseInt((req.query.templateId as string) ?? "0");

  let apiKey: string | undefined;
  let apiVersion = "v1";
  if (!isNaN(templateDbId) && templateDbId > 0) {
    const template = await getTemplate(templateDbId);
    apiKey = template?.apiKey;
    if (template?.apiVersion) apiVersion = template.apiVersion;
  }
  if (!apiKey) apiKey = process.env.CREATOMATE_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "No API key" });

  // Fetch the render to get the video URL
  const statusRes = await fetch(`https://api.creatomate.com/${apiVersion}/renders/${renderId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!statusRes.ok) return res.status(502).json({ error: "Failed to fetch render status" });
  const render = await statusRes.json();

  if (render.status !== "succeeded" || !render.url) {
    return res.status(400).json({ error: "Render not ready or has no URL" });
  }

  // Stream the video from Creatomate with a download header
  const videoRes = await fetch(render.url);
  if (!videoRes.ok) return res.status(502).json({ error: "Failed to fetch video from Creatomate" });

  const contentType = videoRes.headers.get("content-type") ?? "video/mp4";
  const fileName = `reel-submission-${id}.mp4`;
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  if (videoRes.headers.get("content-length")) {
    res.setHeader("Content-Length", videoRes.headers.get("content-length")!);
  }

  const reader = videoRes.body?.getReader();
  if (!reader) return res.status(502).end();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch {
    res.end();
  }
});

export default router;
