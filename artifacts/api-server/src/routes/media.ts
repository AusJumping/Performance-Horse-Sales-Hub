import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { mediaFilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router: IRouter = Router();
const storageService = new ObjectStorageService();

// POST /api/media/upload-url — generate a GCS presigned PUT URL
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

  try {
    const uploadUrl = await storageService.getObjectEntityUploadURL();

    // Extract UUID from the signed URL path (always ends with /uploads/{uuid})
    const urlObj = new URL(uploadUrl);
    const pathParts = urlObj.pathname.split("/");
    const uuid = pathParts[pathParts.length - 1];
    const objectPath = `/objects/uploads/${uuid}`;

    const [media] = await db
      .insert(mediaFilesTable)
      .values({
        submissionId,
        filename: uuid,
        originalName: filename,
        mimeType: mimeType ?? "application/octet-stream",
        size: 0,
        url: `/api/media/serve/objects/uploads/${uuid}`,
        storagePath: objectPath,
        mediaType: mediaType ?? "photo",
      })
      .returning();

    res.json({
      uploadUrl,
      mediaId: media.id,
      publicUrl: media.url,
    });
  } catch (err) {
    console.error("Failed to generate upload URL:", err);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

// POST /api/media/upload/:mediaId — confirm upload, update size in DB
router.post("/upload/:mediaId", async (req, res) => {
  const mediaId = parseInt(req.params.mediaId);
  if (isNaN(mediaId)) return res.status(400).json({ error: "Invalid media ID" });

  const { size } = req.body as { size?: number };

  await db
    .update(mediaFilesTable)
    .set({ size: size ?? 0 })
    .where(eq(mediaFilesTable.id, mediaId));

  const [updated] = await db
    .select()
    .from(mediaFilesTable)
    .where(eq(mediaFilesTable.id, mediaId));

  res.json(updated);
});

// GET /api/media/serve/objects/:uuid — stream file from GCS (uuid is the upload UUID)
router.get("/serve/objects/uploads/:uuid", async (req, res) => {
  const objectPath = `/objects/uploads/${req.params.uuid}`;
  try {
    const file = await storageService.getObjectEntityFile(objectPath);
    const gcsResponse = await storageService.downloadObject(file, 86400);
    gcsResponse.headers.forEach((value: string, key: string) => res.setHeader(key, value));
    const body = gcsResponse.body;
    if (!body) return res.status(500).end();
    const reader = body.getReader();
    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) { res.end(); return; }
      res.write(Buffer.from(value));
      pump();
    };
    pump();
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      return res.status(404).json({ error: "File not found" });
    }
    console.error("Error serving media:", err);
    res.status(500).json({ error: "Failed to serve file" });
  }
});

// GET /api/media/files/:filename — legacy route: serve by storagePath from DB
router.get("/files/:filename", async (req, res) => {
  const [media] = await db
    .select()
    .from(mediaFilesTable)
    .where(eq(mediaFilesTable.filename, req.params.filename));

  if (!media || !media.storagePath) {
    return res.status(404).json({ error: "File not found" });
  }

  try {
    const file = await storageService.getObjectEntityFile(media.storagePath);
    const gcsResponse = await storageService.downloadObject(file, 86400);
    gcsResponse.headers.forEach((value: string, key: string) => res.setHeader(key, value));
    const body = gcsResponse.body;
    if (!body) return res.status(500).end();
    const reader = body.getReader();
    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) { res.end(); return; }
      res.write(Buffer.from(value));
      pump();
    };
    pump();
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      return res.status(404).json({ error: "File not found" });
    }
    console.error("Error serving media:", err);
    res.status(500).json({ error: "Failed to serve file" });
  }
});

// DELETE /api/media/:mediaId
router.delete("/:mediaId", async (req, res) => {
  const mediaId = parseInt(req.params.mediaId);
  if (isNaN(mediaId)) return res.status(400).json({ error: "Invalid media ID" });

  const [media] = await db
    .select()
    .from(mediaFilesTable)
    .where(eq(mediaFilesTable.id, mediaId));

  if (!media) return res.status(404).json({ error: "Not found" });

  await db.delete(mediaFilesTable).where(eq(mediaFilesTable.id, mediaId));

  res.status(204).send();
});

export default router;
