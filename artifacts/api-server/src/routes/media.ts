import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { mediaFilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";

const router: IRouter = Router();

// Ensure uploads dir exists
const uploadsDir = process.env.UPLOADS_DIR ?? "/tmp/phs-uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// Get upload URL (store locally and return info)
router.post("/upload-url", async (req, res) => {
  const { submissionId, filename, mimeType, mediaType } = req.body as {
    submissionId: number;
    filename: string;
    mimeType: string;
    mediaType: string;
  };

  if (!submissionId || !filename) {
    return res.status(400).json({ error: "submissionId and filename required" });
  }

  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = path.extname(filename);
  const storedFilename = `${unique}${ext}`;
  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "";

  // Pre-register the media file
  const [media] = await db
    .insert(mediaFilesTable)
    .values({
      submissionId,
      filename: storedFilename,
      originalName: filename,
      mimeType: mimeType ?? "application/octet-stream",
      size: 0,
      url: `${baseUrl}/api/media/files/${storedFilename}`,
      storagePath: path.join(uploadsDir, storedFilename),
      mediaType: mediaType ?? "photo",
    })
    .returning();

  res.json({
    uploadUrl: `${baseUrl}/api/media/upload/${media.id}`,
    mediaId: media.id,
    publicUrl: media.url,
  });
});

// Direct file upload endpoint
router.post("/upload/:mediaId", upload.single("file"), async (req, res) => {
  const mediaId = parseInt(req.params.mediaId);
  if (isNaN(mediaId)) return res.status(400).json({ error: "Invalid media ID" });

  if (!req.file) return res.status(400).json({ error: "No file provided" });

  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "";

  await db
    .update(mediaFilesTable)
    .set({
      filename: req.file.filename,
      size: req.file.size,
      url: `${baseUrl}/api/media/files/${req.file.filename}`,
      storagePath: req.file.path,
    })
    .where(eq(mediaFilesTable.id, mediaId));

  const [updated] = await db
    .select()
    .from(mediaFilesTable)
    .where(eq(mediaFilesTable.id, mediaId));

  res.json(updated);
});

// Serve uploaded files
router.get("/files/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }
  res.sendFile(filePath);
});

// Delete media
router.delete("/:mediaId", async (req, res) => {
  const mediaId = parseInt(req.params.mediaId);
  if (isNaN(mediaId)) return res.status(400).json({ error: "Invalid media ID" });

  const [media] = await db
    .select()
    .from(mediaFilesTable)
    .where(eq(mediaFilesTable.id, mediaId));

  if (!media) return res.status(404).json({ error: "Not found" });

  if (media.storagePath && fs.existsSync(media.storagePath)) {
    fs.unlinkSync(media.storagePath);
  }

  await db.delete(mediaFilesTable).where(eq(mediaFilesTable.id, mediaId));

  res.status(204).send();
});

export default router;
