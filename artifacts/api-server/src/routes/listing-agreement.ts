import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { submissionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// ── Admin: generate signing link ────────────────────────────────────────────
router.post("/submissions/:id/listing-agreement/generate-link", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const [sub] = await db.select().from(submissionsTable).where(eq(submissionsTable.id, id));
  if (!sub) return res.status(404).json({ error: "Submission not found" });

  const token = randomUUID();

  const [updated] = await db
    .update(submissionsTable)
    .set({
      listingAgreementToken: token,
      listingAgreementStatus: "sent_to_seller",
      listingAgreementSentAt: new Date(),
    })
    .where(eq(submissionsTable.id, id))
    .returning();

  logger.info("Listing agreement signing link generated", { submissionId: id, token });
  return res.status(201).json({ token, submission: updated });
});

// ── Admin: revoke / clear signing link ──────────────────────────────────────
router.delete("/submissions/:id/listing-agreement/signing-link", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  await db
    .update(submissionsTable)
    .set({
      listingAgreementToken: null,
      listingAgreementStatus: "agreement_generated",
      listingAgreementSentAt: null,
    })
    .where(eq(submissionsTable.id, id));

  return res.json({ ok: true });
});

// ── Public: get agreement data by token ─────────────────────────────────────
router.get("/listing-agreement/:token", async (req, res) => {
  const { token } = req.params;

  const [sub] = await db
    .select()
    .from(submissionsTable)
    .where(eq(submissionsTable.listingAgreementToken, token));

  if (!sub) return res.status(404).json({ error: "Agreement not found" });
  if (sub.listingAgreementStatus === "signed") return res.status(410).json({ error: "This agreement has already been signed." });

  return res.json({
    token,
    status: sub.listingAgreementStatus,
    horseName: sub.horseName,
    breed: sub.breed,
    sex: sub.sex,
    age: sub.age,
    colour: sub.colour,
    height: sub.height,
    askingPrice: sub.askingPrice,
    location: sub.location,
    sellerName: sub.sellerName,
    sellerEmail: sub.sellerEmail,
    sellerPhone: sub.sellerPhone,
    commissionRate: sub.commissionRate,
    minimumFee: sub.minimumFee,
    maximumFee: sub.maximumFee,
    listingPeriodDays: sub.listingPeriodDays,
    listingTermsNotes: sub.listingTermsNotes,
    submissionId: sub.id,
  });
});

// ── Public: submit signature ─────────────────────────────────────────────────
router.post("/listing-agreement/:token/submit", async (req, res) => {
  const { token } = req.params;

  const [sub] = await db
    .select()
    .from(submissionsTable)
    .where(eq(submissionsTable.listingAgreementToken, token));

  if (!sub) return res.status(404).json({ error: "Agreement not found" });
  if (sub.listingAgreementStatus === "signed") return res.status(410).json({ error: "Already signed." });

  const { sellerSignature, agreedTerms, agreedFee, agreedPeriod } = req.body as {
    sellerSignature?: string;
    agreedTerms?: boolean;
    agreedFee?: boolean;
    agreedPeriod?: boolean;
  };

  if (!sellerSignature) return res.status(400).json({ error: "Signature is required." });
  if (!agreedTerms || !agreedFee || !agreedPeriod) return res.status(400).json({ error: "All agreement checkboxes must be accepted." });

  const [updated] = await db
    .update(submissionsTable)
    .set({
      listingAgreementStatus: "signed",
      listingAgreementSignedAt: new Date(),
      listingAgreementSellerSignature: sellerSignature,
    })
    .where(eq(submissionsTable.id, sub.id))
    .returning();

  logger.info("Listing agreement signed", { submissionId: sub.id });
  return res.json(updated);
});

export default router;
