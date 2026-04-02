import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  submissionsTable,
  aiOutputsTable,
  mediaFilesTable,
  reelTemplatesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

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
  const { name, description, apiKey, templateId, isDefault } = req.body;
  if (!name || !apiKey || !templateId) {
    return res.status(400).json({ error: "name, apiKey and templateId are required." });
  }
  if (isDefault) {
    await db.update(reelTemplatesTable).set({ isDefault: false });
  }
  const [created] = await db
    .insert(reelTemplatesTable)
    .values({ name, description: description ?? null, apiKey, templateId, isDefault: !!isDefault })
    .returning();
  res.status(201).json({ ...created, apiKey: `••••••${created.apiKey.slice(-6)}` });
});

// PATCH /api/reel-templates/:id
router.patch("/reel-templates/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  const { name, description, apiKey, templateId, isDefault } = req.body;
  if (isDefault) {
    await db.update(reelTemplatesTable).set({ isDefault: false });
  }
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (apiKey !== undefined) updates.apiKey = apiKey;
  if (templateId !== undefined) updates.templateId = templateId;
  if (isDefault !== undefined) updates.isDefault = !!isDefault;
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

  const title =
    aiOutput?.reelOverlayText?.split("\n").filter(Boolean)[0] ||
    [
      submission.horseName,
      submission.breed,
      submission.age ? `${submission.age} yo` : null,
      submission.height ? `${submission.height}hh` : null,
      submission.askingPrice || null,
    ]
      .filter(Boolean)
      .join(" · ");

  const PLACEHOLDER = "https://creatomate.com/files/assets/82c2f851-ebc6-426b-ba42-158df4293368";
  const img1 = photos[0]?.url ?? PLACEHOLDER;
  const img2 = photos[1]?.url ?? photos[0]?.url ?? PLACEHOLDER;
  const img3 = photos[2]?.url ?? photos[0]?.url ?? PLACEHOLDER;

  const modifications: Record<string, string> = {
    "Image-1.source": img1,
    "Image-2.source": img2,
    "Image-3.source": img3,
    "Brand.text": BRAND_NAME,
    "Website.text": WEBSITE,
    "Title.text": title,
  };

  const renderRes = await fetch("https://api.creatomate.com/v1/renders", {
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
// Body or query: templateId (needed to pick the right API key)
router.get("/submissions/:id/reel/:renderId", async (req, res) => {
  const templateDbId = parseInt((req.query.templateId as string) ?? "0");
  const { renderId } = req.params;

  let apiKey: string | undefined;

  if (!isNaN(templateDbId) && templateDbId > 0) {
    const template = await getTemplate(templateDbId);
    apiKey = template?.apiKey;
  }

  // Fallback to env var for backward compat
  if (!apiKey) apiKey = process.env.CREATOMATE_API_KEY;

  if (!apiKey) {
    return res.status(503).json({ error: "No API key available for this template." });
  }

  const statusRes = await fetch(`https://api.creatomate.com/v1/renders/${renderId}`, {
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

export default router;
