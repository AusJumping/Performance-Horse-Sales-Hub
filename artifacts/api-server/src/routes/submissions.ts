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
import { ObjectStorageService } from "../lib/objectStorage";
import { sendAcknowledgementEmail, sendInternalAlertEmail } from "../lib/email.js";

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
    sellerIntent?: string;
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

  // Extract sellerIntent from body or formData
  const sellerIntent = body.sellerIntent
    ?? (body.formData?.sellerIntent as string | undefined)
    ?? null;

  // workingRecord starts as a full copy of formData so Sally can edit it
  const formData = body.formData ?? {};

  const [submission] = await db
    .insert(submissionsTable)
    .values({
      status: "new",
      formData,
      workingRecord: formData,
      sellerIntent,
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

  // Send emails (non-blocking — never fails the submission)
  const firstName = (body.sellerName ?? "").split(" ")[0] || "there";
  if (body.sellerEmail) {
    setImmediate(() => sendAcknowledgementEmail({
      to: body.sellerEmail!,
      firstName,
      formType: "seller",
      horseName: body.horseName ?? undefined,
    }));
  }
  setImmediate(() => sendInternalAlertEmail({
    formType: "seller",
    recordId: submission.id,
    name: body.sellerName ?? "Unknown",
    email: body.sellerEmail ?? "—",
    phone: body.sellerPhone ?? undefined,
    horseName: body.horseName ?? undefined,
    location: body.location ?? undefined,
  }));

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

// Update submission (status, tags — NOT formData which is locked)
router.patch("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const { status, tags } = req.body as {
    status?: string;
    tags?: string[];
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

// Update working record (Sally's editable copy — separate from locked formData)
router.patch("/:id/working-record", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const { workingRecord, horseName, breed, age, colour, height, sex, askingPrice, location, discipline, sellerName, sellerEmail, sellerPhone } = req.body as {
    workingRecord?: Record<string, unknown>;
    horseName?: string;
    breed?: string;
    age?: string;
    colour?: string;
    height?: string;
    sex?: string;
    askingPrice?: string;
    location?: string;
    discipline?: string;
    sellerName?: string;
    sellerEmail?: string;
    sellerPhone?: string;
  };

  const [existing] = await db.select().from(submissionsTable).where(eq(submissionsTable.id, id));
  if (!existing) return res.status(404).json({ error: "Not found" });

  const updates: Partial<typeof submissionsTable.$inferInsert> = {
    workingRecordUpdatedAt: new Date(),
  };
  if (workingRecord !== undefined) updates.workingRecord = workingRecord;
  if (horseName !== undefined) updates.horseName = horseName;
  if (breed !== undefined) updates.breed = breed;
  if (age !== undefined) updates.age = age;
  if (colour !== undefined) updates.colour = colour;
  if (height !== undefined) updates.height = height;
  if (sex !== undefined) updates.sex = sex;
  if (askingPrice !== undefined) updates.askingPrice = askingPrice;
  if (location !== undefined) updates.location = location;
  if (discipline !== undefined) updates.discipline = discipline;
  if (sellerName !== undefined) updates.sellerName = sellerName;
  if (sellerEmail !== undefined) updates.sellerEmail = sellerEmail;
  if (sellerPhone !== undefined) updates.sellerPhone = sellerPhone;

  const [updated] = await db
    .update(submissionsTable)
    .set(updates)
    .where(eq(submissionsTable.id, id))
    .returning();

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
    .set({ status: "approved_to_market" })
    .where(eq(submissionsTable.id, id))
    .returning();

  await db.insert(statusHistoryTable).values({
    submissionId: id,
    fromStatus: existing.status,
    toStatus: "approved_to_market",
  });

  res.json(updated);
});

// Publish (mark as live)
router.post("/:id/publish", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const [existing] = await db.select().from(submissionsTable).where(eq(submissionsTable.id, id));
  if (!existing) return res.status(404).json({ error: "Not found" });

  const [updated] = await db
    .update(submissionsTable)
    .set({ status: "live" })
    .where(eq(submissionsTable.id, id))
    .returning();

  await db.insert(statusHistoryTable).values({
    submissionId: id,
    fromStatus: existing.status,
    toStatus: "live",
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

// ── Listing Agreement (Phase 5) ─────────────────────────────────────────────

router.patch("/:id/listing-agreement", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const {
    commissionRate,
    minimumFee,
    maximumFee,
    listingPeriodDays,
    listingTermsNotes,
    listingAgreementStatus,
    listingAgreementSentAt,
    listingAgreementSignedAt,
  } = req.body as {
    commissionRate?: string;
    minimumFee?: string;
    maximumFee?: string;
    listingPeriodDays?: number;
    listingTermsNotes?: string;
    listingAgreementStatus?: string;
    listingAgreementSentAt?: string | null;
    listingAgreementSignedAt?: string | null;
  };

  const updates: Record<string, unknown> = {};
  if (commissionRate !== undefined) updates.commissionRate = commissionRate;
  if (minimumFee !== undefined) updates.minimumFee = minimumFee;
  if (maximumFee !== undefined) updates.maximumFee = maximumFee;
  if (listingPeriodDays !== undefined) updates.listingPeriodDays = listingPeriodDays;
  if (listingTermsNotes !== undefined) updates.listingTermsNotes = listingTermsNotes;
  if (listingAgreementStatus !== undefined) updates.listingAgreementStatus = listingAgreementStatus;
  if (listingAgreementSentAt !== undefined) updates.listingAgreementSentAt = listingAgreementSentAt ? new Date(listingAgreementSentAt) : null;
  if (listingAgreementSignedAt !== undefined) updates.listingAgreementSignedAt = listingAgreementSignedAt ? new Date(listingAgreementSignedAt) : null;

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "No fields provided" });

  const [updated] = await db
    .update(submissionsTable)
    .set(updates)
    .where(eq(submissionsTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Submission not found" });
  res.json(updated);
});

// Delete submission (cascade: GCS media files + all related DB records)
router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const [existing] = await db.select().from(submissionsTable).where(eq(submissionsTable.id, id));
  if (!existing) return res.status(404).json({ error: "Not found" });

  // Delete media files from GCS first (best-effort — don't fail if GCS errors)
  const mediaFiles = await db.select().from(mediaFilesTable).where(eq(mediaFilesTable.submissionId, id));
  if (mediaFiles.length > 0) {
    const storage = new ObjectStorageService();
    await Promise.allSettled(
      mediaFiles
        .filter((f) => f.storagePath?.startsWith("/objects/"))
        .map((f) => storage.deleteObject(f.storagePath!))
    );
  }

  // Delete all related DB records then the submission itself
  await db.delete(mediaFilesTable).where(eq(mediaFilesTable.submissionId, id));
  await db.delete(aiOutputsTable).where(eq(aiOutputsTable.submissionId, id));
  await db.delete(notesTable).where(eq(notesTable.submissionId, id));
  await db.delete(statusHistoryTable).where(eq(statusHistoryTable.submissionId, id));
  await db.delete(submissionsTable).where(eq(submissionsTable.id, id));

  res.json({ ok: true });
});

export default router;
