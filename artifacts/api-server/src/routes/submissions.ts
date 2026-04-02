import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  submissionsTable,
  aiOutputsTable,
  mediaFilesTable,
  notesTable,
  statusHistoryTable,
} from "@workspace/db";
import { eq, desc, like, and, sql } from "drizzle-orm";
import { z } from "zod/v4";

const router: IRouter = Router();

// List submissions
router.get("/", async (req, res) => {
  const { status, search, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offset = (pageNum - 1) * limitNum;

  let conditions = [];
  if (status) {
    conditions.push(eq(submissionsTable.status, status));
  }
  if (search) {
    const searchTerm = `%${search}%`;
    conditions.push(
      sql`(${submissionsTable.horseName} ILIKE ${searchTerm} OR ${submissionsTable.sellerName} ILIKE ${searchTerm} OR ${submissionsTable.breed} ILIKE ${searchTerm})`
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [submissions, totalResult] = await Promise.all([
    db
      .select()
      .from(submissionsTable)
      .where(whereClause)
      .orderBy(desc(submissionsTable.createdAt))
      .limit(limitNum)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(submissionsTable)
      .where(whereClause),
  ]);

  res.json({
    submissions,
    total: totalResult[0]?.count ?? 0,
    page: pageNum,
    limit: limitNum,
  });
});

// Create submission
router.post("/", async (req, res) => {
  const body = req.body as {
    formData: Record<string, unknown>;
    sellerName?: string;
    sellerEmail?: string;
    sellerPhone?: string;
    horseName?: string;
    breed?: string;
    age?: string;
    colour?: string;
    height?: string;
    sex?: string;
    askingPrice?: string;
    location?: string;
    discipline?: string;
  };

  const [submission] = await db
    .insert(submissionsTable)
    .values({
      status: "new",
      formData: body.formData ?? {},
      sellerName: body.sellerName ?? null,
      sellerEmail: body.sellerEmail ?? null,
      sellerPhone: body.sellerPhone ?? null,
      horseName: body.horseName ?? null,
      breed: body.breed ?? null,
      age: body.age ?? null,
      colour: body.colour ?? null,
      height: body.height ?? null,
      sex: body.sex ?? null,
      askingPrice: body.askingPrice ?? null,
      location: body.location ?? null,
      discipline: body.discipline ?? null,
      tags: [],
      aiGenerated: false,
    })
    .returning();

  // Record initial status
  await db.insert(statusHistoryTable).values({
    submissionId: submission.id,
    fromStatus: null,
    toStatus: "new",
  });

  res.status(201).json(submission);
});

// Get submission detail
router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const [submission] = await db
    .select()
    .from(submissionsTable)
    .where(eq(submissionsTable.id, id));

  if (!submission) return res.status(404).json({ error: "Not found" });

  const [media, aiOutput, notes, statusHistory] = await Promise.all([
    db.select().from(mediaFilesTable).where(eq(mediaFilesTable.submissionId, id)).orderBy(desc(mediaFilesTable.uploadedAt)),
    db.select().from(aiOutputsTable).where(eq(aiOutputsTable.submissionId, id)).limit(1),
    db.select().from(notesTable).where(eq(notesTable.submissionId, id)).orderBy(desc(notesTable.createdAt)),
    db.select().from(statusHistoryTable).where(eq(statusHistoryTable.submissionId, id)).orderBy(desc(statusHistoryTable.changedAt)),
  ]);

  res.json({
    ...submission,
    media,
    aiOutput: aiOutput[0] ?? null,
    notes,
    statusHistory,
  });
});

// Update submission
router.patch("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const { status, tags, internalNotes } = req.body as {
    status?: string;
    tags?: string[];
    internalNotes?: string;
  };

  const [existing] = await db.select().from(submissionsTable).where(eq(submissionsTable.id, id));
  if (!existing) return res.status(404).json({ error: "Not found" });

  const updates: Partial<typeof submissionsTable.$inferInsert> = {};
  if (status) updates.status = status;
  if (tags !== undefined) updates.tags = tags;

  const [updated] = await db
    .update(submissionsTable)
    .set(updates)
    .where(eq(submissionsTable.id, id))
    .returning();

  if (status && status !== existing.status) {
    await db.insert(statusHistoryTable).values({
      submissionId: id,
      fromStatus: existing.status,
      toStatus: status,
    });
  }

  res.json(updated);
});

// Approve
router.post("/:id/approve", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const [existing] = await db.select().from(submissionsTable).where(eq(submissionsTable.id, id));
  if (!existing) return res.status(404).json({ error: "Not found" });

  const [updated] = await db
    .update(submissionsTable)
    .set({ status: "approved" })
    .where(eq(submissionsTable.id, id))
    .returning();

  await db.insert(statusHistoryTable).values({
    submissionId: id,
    fromStatus: existing.status,
    toStatus: "approved",
  });

  res.json(updated);
});

// Publish
router.post("/:id/publish", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const [existing] = await db.select().from(submissionsTable).where(eq(submissionsTable.id, id));
  if (!existing) return res.status(404).json({ error: "Not found" });

  const [updated] = await db
    .update(submissionsTable)
    .set({ status: "published" })
    .where(eq(submissionsTable.id, id))
    .returning();

  await db.insert(statusHistoryTable).values({
    submissionId: id,
    fromStatus: existing.status,
    toStatus: "published",
  });

  res.json(updated);
});

// List media for submission
router.get("/:id/media", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const media = await db
    .select()
    .from(mediaFilesTable)
    .where(eq(mediaFilesTable.submissionId, id))
    .orderBy(mediaFilesTable.uploadedAt);

  res.json(media);
});

// List notes for submission
router.get("/:id/notes", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const notes = await db
    .select()
    .from(notesTable)
    .where(eq(notesTable.submissionId, id))
    .orderBy(desc(notesTable.createdAt));

  res.json(notes);
});

// Add note
router.post("/:id/notes", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const { content } = req.body as { content: string };
  if (!content) return res.status(400).json({ error: "Content is required" });

  const [note] = await db
    .insert(notesTable)
    .values({ submissionId: id, content })
    .returning();

  res.status(201).json(note);
});

export default router;
