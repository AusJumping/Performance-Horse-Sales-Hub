import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { contractsTable, submissionsTable, aiOutputsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// ── Admin: get contract for submission ─────────────────────────────────────
router.get("/submissions/:id/contract", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const [contract] = await db
    .select()
    .from(contractsTable)
    .where(eq(contractsTable.submissionId, id))
    .orderBy(contractsTable.createdAt)
    .limit(1);

  if (!contract) return res.status(404).json({ error: "No contract found" });
  return res.json(contract);
});

// ── Admin: create / regenerate contract ────────────────────────────────────
router.post("/submissions/:id/contract", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const { salesPrice, holdingDepositAmount, customClauses } = req.body as {
    salesPrice?: string;
    holdingDepositAmount?: string;
    customClauses?: string;
  };

  const [submission] = await db
    .select()
    .from(submissionsTable)
    .where(eq(submissionsTable.id, id));
  if (!submission) return res.status(404).json({ error: "Submission not found" });

  const [aiOutput] = await db
    .select()
    .from(aiOutputsTable)
    .where(eq(aiOutputsTable.submissionId, id));

  const horseDescription = aiOutput?.masterListing ?? null;

  const token = randomUUID();

  // Void any existing pending contract first
  await db
    .update(contractsTable)
    .set({ status: "voided", updatedAt: new Date() })
    .where(eq(contractsTable.submissionId, id));

  const [contract] = await db.insert(contractsTable).values({
    submissionId: id,
    token,
    status: "pending",
    horseName: submission.horseName ?? "Horse",
    salesPrice: salesPrice ?? submission.askingPrice ?? null,
    holdingDepositAmount: holdingDepositAmount || null,
    horseDescription: horseDescription || null,
    customClauses: customClauses || null,
  }).returning();

  logger.info("Contract generated", { submissionId: id, token });
  return res.status(201).json(contract);
});

// ── Admin: void contract ────────────────────────────────────────────────────
router.delete("/submissions/:id/contract", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const result = await db
    .update(contractsTable)
    .set({ status: "voided", updatedAt: new Date() })
    .where(eq(contractsTable.submissionId, id))
    .returning();

  if (!result.length) return res.status(404).json({ error: "No contract found" });
  return res.json({ ok: true });
});

// ── Public: get contract details ────────────────────────────────────────────
router.get("/contract/:token", async (req, res) => {
  const { token } = req.params;

  const [contract] = await db
    .select()
    .from(contractsTable)
    .where(eq(contractsTable.token, token));

  if (!contract) return res.status(404).json({ error: "Contract not found" });
  if (contract.status === "voided") {
    return res.status(410).json({ error: "This contract link has been voided." });
  }

  return res.json({
    id: contract.id,
    token: contract.token,
    status: contract.status,
    horseName: contract.horseName,
    salesPrice: contract.salesPrice,
    holdingDepositAmount: contract.holdingDepositAmount,
    horseDescription: contract.horseDescription,
    customClauses: contract.customClauses,
    submittedAt: contract.submittedAt,
  });
});

// ── Public: submit contract ─────────────────────────────────────────────────
router.post("/contract/:token/submit", async (req, res) => {
  const { token } = req.params;

  const [contract] = await db
    .select()
    .from(contractsTable)
    .where(eq(contractsTable.token, token));

  if (!contract) return res.status(404).json({ error: "Contract not found" });
  if (contract.status !== "pending") {
    return res.status(409).json({ error: "This contract has already been submitted or is no longer active." });
  }

  const {
    fillerName, fillerEmail, fillerRole,
    buyerName, buyerEmail, sellerName, sellerEmail,
    buyerSignature, sellerSignature,
    agreedSalesPrice, agreedHoldingDeposit, agreedDescription,
    agreedSection3, agreedSection4, agreedSellerDeclaration, agreedBuyerDeclaration,
  } = req.body as Record<string, any>;

  const [updated] = await db
    .update(contractsTable)
    .set({
      status: "submitted",
      fillerName: fillerName || null,
      fillerEmail: fillerEmail || null,
      fillerRole: fillerRole || null,
      buyerName: buyerName || null,
      buyerEmail: buyerEmail || null,
      sellerName: sellerName || null,
      sellerEmail: sellerEmail || null,
      buyerSignature: buyerSignature || null,
      sellerSignature: sellerSignature || null,
      agreedSalesPrice: agreedSalesPrice === true,
      agreedHoldingDeposit: agreedHoldingDeposit === true,
      agreedDescription: agreedDescription === true,
      agreedSection3: agreedSection3 === true,
      agreedSection4: agreedSection4 === true,
      agreedSellerDeclaration: agreedSellerDeclaration === true,
      agreedBuyerDeclaration: agreedBuyerDeclaration === true,
      submittedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(contractsTable.token, token))
    .returning();

  logger.info("Contract submitted", { token, fillerName, fillerRole });
  return res.json(updated);
});

export default router;
