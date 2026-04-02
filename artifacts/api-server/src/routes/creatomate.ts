import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { submissionsTable, aiOutputsTable, mediaFilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const CREATOMATE_API_KEY = process.env.CREATOMATE_API_KEY;
const TEMPLATE_ID = "7a86f03f-2c95-4c5c-abf0-5c769043fba6";

const BRAND_NAME = "Performance Horse Sales";
const WEBSITE = "performancehorsesales.com.au";

// POST /api/submissions/:id/reel — trigger a Creatomate reel render
router.post("/submissions/:id/reel", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  if (!CREATOMATE_API_KEY) {
    return res.status(503).json({ error: "Creatomate API key not configured." });
  }

  const [submission] = await db
    .select()
    .from(submissionsTable)
    .where(eq(submissionsTable.id, id));

  if (!submission) return res.status(404).json({ error: "Submission not found" });

  // Get AI output for the reel overlay text
  const [aiOutput] = await db
    .select()
    .from(aiOutputsTable)
    .where(eq(aiOutputsTable.submissionId, id));

  // Get uploaded photos for this submission
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

  // Build the title from reel overlay text or fallback to horse info
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

  // Use uploaded photos (up to 3), falling back to a placeholder if fewer than 3
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

  const payload = {
    template_id: TEMPLATE_ID,
    modifications,
  };

  const renderRes = await fetch("https://api.creatomate.com/v1/renders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CREATOMATE_API_KEY}`,
    },
    body: JSON.stringify(payload),
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
    modifications,
  });
});

// GET /api/submissions/:id/reel/:renderId — poll render status
router.get("/submissions/:id/reel/:renderId", async (req, res) => {
  const { renderId } = req.params;

  if (!CREATOMATE_API_KEY) {
    return res.status(503).json({ error: "Creatomate API key not configured." });
  }

  const statusRes = await fetch(`https://api.creatomate.com/v1/renders/${renderId}`, {
    headers: { Authorization: `Bearer ${CREATOMATE_API_KEY}` },
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
