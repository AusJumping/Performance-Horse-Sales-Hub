import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { contractsTable, submissionsTable, aiOutputsTable } from "@workspace/db";
import { eq, desc, and, ne } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

const FULLY_SIGNED_STATUSES = ["fully_signed", "submitted"];

// ── Admin: get contract for submission ─────────────────────────────────────
router.get("/submissions/:id/contract", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const [contract] = await db
    .select()
    .from(contractsTable)
    .where(eq(contractsTable.submissionId, id))
    .orderBy(desc(contractsTable.createdAt))
    .limit(1);

  if (!contract) return res.status(404).json({ error: "No contract found" });
  return res.json(contract);
});

// ── Admin: create / regenerate contract ────────────────────────────────────
router.post("/submissions/:id/contract", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const {
    salesPrice, holdingDepositAmount, customClauses,
    sellerName, sellerEmail, sellerAddress, sellerPhone,
    sellerBankAccountName, sellerBankBsb, sellerBankAccount,
    buyerName, buyerEmail, buyerAddress, buyerPhone,
  } = req.body as {
    salesPrice?: string; holdingDepositAmount?: string; customClauses?: string;
    sellerName?: string; sellerEmail?: string; sellerAddress?: string; sellerPhone?: string;
    sellerBankAccountName?: string; sellerBankBsb?: string; sellerBankAccount?: string;
    buyerName?: string; buyerEmail?: string; buyerAddress?: string; buyerPhone?: string;
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
    sellerName: sellerName || (submission.sellerName ?? null),
    sellerEmail: sellerEmail || (submission.sellerEmail ?? null),
    sellerAddress: sellerAddress || null,
    sellerPhone: sellerPhone || null,
    sellerBankAccountName: sellerBankAccountName || null,
    sellerBankBsb: sellerBankBsb || null,
    sellerBankAccount: sellerBankAccount || null,
    buyerName: buyerName || null,
    buyerEmail: buyerEmail || null,
    buyerAddress: buyerAddress || null,
    buyerPhone: buyerPhone || null,
  }).returning();

  logger.info("Contract generated", { submissionId: id, token });
  return res.status(201).json(contract);
});

// ── Admin: update party details on existing contract ───────────────────────
router.patch("/submissions/:id/contract", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const {
    salesPrice, holdingDepositAmount, customClauses,
    sellerName, sellerEmail, sellerAddress, sellerPhone,
    sellerBankAccountName, sellerBankBsb, sellerBankAccount,
    buyerName, buyerEmail, buyerAddress, buyerPhone,
  } = req.body as Record<string, string | undefined>;

  const [updated] = await db
    .update(contractsTable)
    .set({
      ...(salesPrice !== undefined ? { salesPrice: salesPrice || null } : {}),
      ...(holdingDepositAmount !== undefined ? { holdingDepositAmount: holdingDepositAmount || null } : {}),
      ...(customClauses !== undefined ? { customClauses: customClauses || null } : {}),
      sellerName: sellerName ?? undefined,
      sellerEmail: sellerEmail ?? undefined,
      sellerAddress: sellerAddress ?? undefined,
      sellerPhone: sellerPhone ?? undefined,
      sellerBankAccountName: sellerBankAccountName ?? undefined,
      sellerBankBsb: sellerBankBsb ?? undefined,
      sellerBankAccount: sellerBankAccount ?? undefined,
      buyerName: buyerName ?? undefined,
      buyerEmail: buyerEmail ?? undefined,
      buyerAddress: buyerAddress ?? undefined,
      buyerPhone: buyerPhone ?? undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(contractsTable.submissionId, id), ne(contractsTable.status, "voided")))
    .returning();

  if (!updated) return res.status(404).json({ error: "No active contract found" });
  return res.json(updated);
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
    sellerSignedAt: contract.sellerSignedAt,
    buyerSignedAt: contract.buyerSignedAt,
    sellerName: contract.sellerName,
    sellerEmail: contract.sellerEmail,
    sellerAddress: contract.sellerAddress,
    sellerPhone: contract.sellerPhone,
    sellerBankAccountName: contract.sellerBankAccountName,
    sellerBankBsb: contract.sellerBankBsb,
    sellerBankAccount: contract.sellerBankAccount,
    buyerName: contract.buyerName,
    buyerEmail: contract.buyerEmail,
    buyerAddress: contract.buyerAddress,
    buyerPhone: contract.buyerPhone,
  });
});

// ── Public: submit contract (per-party) ─────────────────────────────────────
router.post("/contract/:token/submit", async (req, res) => {
  const { token } = req.params;

  const [contract] = await db
    .select()
    .from(contractsTable)
    .where(eq(contractsTable.token, token));

  if (!contract) return res.status(404).json({ error: "Contract not found" });
  if (contract.status === "voided") {
    return res.status(410).json({ error: "This contract link has been voided." });
  }
  if (FULLY_SIGNED_STATUSES.includes(contract.status)) {
    return res.status(409).json({ error: "This contract has already been fully signed by both parties." });
  }

  const {
    role,
    name, email, address, phone,
    signature,
    agreedSalesPrice, agreedHoldingDeposit, agreedDescription,
    agreedSection3, agreedSection4, agreedSellerDeclaration, agreedBuyerDeclaration,
  } = req.body as Record<string, any>;

  if (role === "seller") {
    if (contract.sellerSignedAt) {
      return res.status(409).json({ error: "The seller has already signed this contract." });
    }
    if (!signature) return res.status(400).json({ error: "Signature is required." });

    const bothSigned = !!contract.buyerSignedAt;
    const now = new Date();
    const [updated] = await db
      .update(contractsTable)
      .set({
        status: bothSigned ? "fully_signed" : "seller_signed",
        sellerName: name || contract.sellerName,
        sellerEmail: email || contract.sellerEmail,
        sellerAddress: address || contract.sellerAddress,
        sellerPhone: phone || contract.sellerPhone,
        sellerSignature: signature,
        sellerSignedAt: now,
        fillerRole: "seller",
        agreedSalesPrice: agreedSalesPrice === true,
        agreedDescription: agreedDescription === true,
        agreedSection3: agreedSection3 === true,
        agreedSection4: agreedSection4 === true,
        agreedSellerDeclaration: agreedSellerDeclaration === true,
        ...(bothSigned ? { submittedAt: now } : {}),
        updatedAt: now,
      })
      .where(eq(contractsTable.token, token))
      .returning();

    logger.info("Contract seller signed", { token, bothSigned });
    return res.json(updated);
  }

  if (role === "buyer") {
    if (contract.buyerSignedAt) {
      return res.status(409).json({ error: "The buyer has already signed this contract." });
    }
    if (!signature) return res.status(400).json({ error: "Signature is required." });

    const bothSigned = !!contract.sellerSignedAt;
    const now = new Date();
    const [updated] = await db
      .update(contractsTable)
      .set({
        status: bothSigned ? "fully_signed" : "buyer_signed",
        buyerName: name || contract.buyerName,
        buyerEmail: email || contract.buyerEmail,
        buyerAddress: address || contract.buyerAddress,
        buyerPhone: phone || contract.buyerPhone,
        buyerSignature: signature,
        buyerSignedAt: now,
        fillerRole: "buyer",
        agreedHoldingDeposit: agreedHoldingDeposit === true,
        agreedDescription: agreedDescription === true,
        agreedSection3: agreedSection3 === true,
        agreedSection4: agreedSection4 === true,
        agreedBuyerDeclaration: agreedBuyerDeclaration === true,
        ...(bothSigned ? { submittedAt: now } : {}),
        updatedAt: now,
      })
      .where(eq(contractsTable.token, token))
      .returning();

    logger.info("Contract buyer signed", { token, bothSigned });
    return res.json(updated);
  }

  return res.status(400).json({ error: "Invalid role. Must be 'seller' or 'buyer'." });
});

export default router;
