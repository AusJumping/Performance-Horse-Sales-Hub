import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  horseSearchAgreementsTable,
  horseSearchContractsTable,
  horseSearchesTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// ═══════════════════════════════════════════════════════════════════
// COSTS AGREEMENT
// ═══════════════════════════════════════════════════════════════════

// Admin: get agreement for a horse search
router.get("/horse-searches/:id/agreement", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  const [agreement] = await db
    .select()
    .from(horseSearchAgreementsTable)
    .where(eq(horseSearchAgreementsTable.horseSearchId, id))
    .orderBy(desc(horseSearchAgreementsTable.createdAt))
    .limit(1);
  if (!agreement) return res.status(404).json({ error: "No agreement found" });
  return res.json(agreement);
});

// Admin: create / regenerate agreement
router.post("/horse-searches/:id/agreement", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const [hs] = await db
    .select()
    .from(horseSearchesTable)
    .where(eq(horseSearchesTable.id, id));
  if (!hs) return res.status(404).json({ error: "Horse search not found" });

  const {
    clientName, clientEmail, clientAddress, clientPhone,
    serviceLevel, upfrontFee, consultancyFee, customTerms,
  } = req.body as Record<string, string | undefined>;

  const token = randomUUID();

  // Void any existing pending agreement
  await db
    .update(horseSearchAgreementsTable)
    .set({ status: "voided", updatedAt: new Date() })
    .where(eq(horseSearchAgreementsTable.horseSearchId, id));

  const [agreement] = await db
    .insert(horseSearchAgreementsTable)
    .values({
      horseSearchId: id,
      token,
      status: "pending",
      clientName: clientName || `${hs.firstName} ${hs.surname}`,
      clientEmail: clientEmail || hs.email,
      clientAddress: clientAddress || null,
      clientPhone: clientPhone || hs.phone,
      serviceLevel: serviceLevel || hs.searchServiceLevel,
      upfrontFee: upfrontFee || "$1,000",
      consultancyFee: consultancyFee || "5% of the purchase price (min $1,000, capped at $2,000)",
      customTerms: customTerms || null,
    })
    .returning();

  logger.info("Horse search agreement generated", { horseSearchId: id, token });
  return res.status(201).json(agreement);
});

// Admin: update agreement details
router.patch("/horse-searches/:id/agreement", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const {
    clientName, clientEmail, clientAddress, clientPhone,
    serviceLevel, upfrontFee, consultancyFee, customTerms,
  } = req.body as Record<string, string | undefined>;

  const [updated] = await db
    .update(horseSearchAgreementsTable)
    .set({
      ...(clientName !== undefined ? { clientName } : {}),
      ...(clientEmail !== undefined ? { clientEmail } : {}),
      ...(clientAddress !== undefined ? { clientAddress } : {}),
      ...(clientPhone !== undefined ? { clientPhone } : {}),
      ...(serviceLevel !== undefined ? { serviceLevel } : {}),
      ...(upfrontFee !== undefined ? { upfrontFee } : {}),
      ...(consultancyFee !== undefined ? { consultancyFee } : {}),
      ...(customTerms !== undefined ? { customTerms } : {}),
      updatedAt: new Date(),
    })
    .where(eq(horseSearchAgreementsTable.horseSearchId, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "No agreement found" });
  return res.json(updated);
});

// Admin: void agreement
router.delete("/horse-searches/:id/agreement", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  const result = await db
    .update(horseSearchAgreementsTable)
    .set({ status: "voided", updatedAt: new Date() })
    .where(eq(horseSearchAgreementsTable.horseSearchId, id))
    .returning();
  if (!result.length) return res.status(404).json({ error: "No agreement found" });
  return res.json({ ok: true });
});

// Public: get agreement for signing page
router.get("/horse-search-agreement/:token", async (req, res) => {
  const { token } = req.params;
  const [agreement] = await db
    .select()
    .from(horseSearchAgreementsTable)
    .where(eq(horseSearchAgreementsTable.token, token));
  if (!agreement) return res.status(404).json({ error: "Agreement not found" });
  if (agreement.status === "voided") return res.status(410).json({ error: "This agreement link has been voided." });
  return res.json({
    id: agreement.id,
    token: agreement.token,
    status: agreement.status,
    clientName: agreement.clientName,
    clientEmail: agreement.clientEmail,
    clientAddress: agreement.clientAddress,
    clientPhone: agreement.clientPhone,
    serviceLevel: agreement.serviceLevel,
    upfrontFee: agreement.upfrontFee,
    consultancyFee: agreement.consultancyFee,
    customTerms: agreement.customTerms,
    submittedAt: agreement.submittedAt,
  });
});

// Public: submit signed agreement
router.post("/horse-search-agreement/:token/submit", async (req, res) => {
  const { token } = req.params;
  const [agreement] = await db
    .select()
    .from(horseSearchAgreementsTable)
    .where(eq(horseSearchAgreementsTable.token, token));
  if (!agreement) return res.status(404).json({ error: "Agreement not found" });
  if (agreement.status !== "pending") return res.status(409).json({ error: "This agreement has already been submitted or is no longer active." });

  const { clientName, clientEmail, clientAddress, clientPhone, clientSignature, agreedTerms, agreedFee, agreedReady } = req.body as Record<string, any>;

  const [updated] = await db
    .update(horseSearchAgreementsTable)
    .set({
      status: "submitted",
      clientName: clientName || agreement.clientName,
      clientEmail: clientEmail || agreement.clientEmail,
      clientAddress: clientAddress || agreement.clientAddress,
      clientPhone: clientPhone || agreement.clientPhone,
      clientSignature: clientSignature || null,
      agreedTerms: agreedTerms === true,
      agreedFee: agreedFee === true,
      agreedReady: agreedReady === true,
      submittedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(horseSearchAgreementsTable.token, token))
    .returning();

  logger.info("Horse search agreement submitted", { token });
  return res.json(updated);
});

// ═══════════════════════════════════════════════════════════════════
// BILL OF SALE / CONTRACT
// ═══════════════════════════════════════════════════════════════════

// Admin: get contract for a horse search
router.get("/horse-searches/:id/search-contract", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  const [contract] = await db
    .select()
    .from(horseSearchContractsTable)
    .where(eq(horseSearchContractsTable.horseSearchId, id))
    .orderBy(desc(horseSearchContractsTable.createdAt))
    .limit(1);
  if (!contract) return res.status(404).json({ error: "No contract found" });
  return res.json(contract);
});

// Admin: create / regenerate contract
router.post("/horse-searches/:id/search-contract", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const [hs] = await db
    .select()
    .from(horseSearchesTable)
    .where(eq(horseSearchesTable.id, id));
  if (!hs) return res.status(404).json({ error: "Horse search not found" });

  const {
    horseName, salesPrice, holdingDepositAmount, horseDescription, customClauses,
    sellerName, sellerEmail, sellerAddress, sellerPhone,
    sellerBankAccountName, sellerBankBsb, sellerBankAccount,
    buyerName, buyerEmail, buyerAddress, buyerPhone,
  } = req.body as Record<string, string | undefined>;

  const token = randomUUID();

  // Void any existing pending contract
  await db
    .update(horseSearchContractsTable)
    .set({ status: "voided", updatedAt: new Date() })
    .where(eq(horseSearchContractsTable.horseSearchId, id));

  const [contract] = await db
    .insert(horseSearchContractsTable)
    .values({
      horseSearchId: id,
      token,
      status: "pending",
      horseName: horseName || "Horse",
      salesPrice: salesPrice || null,
      holdingDepositAmount: holdingDepositAmount || null,
      horseDescription: horseDescription || null,
      customClauses: customClauses || null,
      sellerName: sellerName || null,
      sellerEmail: sellerEmail || null,
      sellerAddress: sellerAddress || null,
      sellerPhone: sellerPhone || null,
      sellerBankAccountName: sellerBankAccountName || null,
      sellerBankBsb: sellerBankBsb || null,
      sellerBankAccount: sellerBankAccount || null,
      buyerName: buyerName || `${hs.firstName} ${hs.surname}`,
      buyerEmail: buyerEmail || hs.email,
      buyerAddress: buyerAddress || null,
      buyerPhone: buyerPhone || hs.phone,
    })
    .returning();

  logger.info("Horse search contract generated", { horseSearchId: id, token });
  return res.status(201).json(contract);
});

// Admin: update contract details
router.patch("/horse-searches/:id/search-contract", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const {
    horseName, salesPrice, holdingDepositAmount, horseDescription, customClauses,
    sellerName, sellerEmail, sellerAddress, sellerPhone,
    sellerBankAccountName, sellerBankBsb, sellerBankAccount,
    buyerName, buyerEmail, buyerAddress, buyerPhone,
  } = req.body as Record<string, string | undefined>;

  const [updated] = await db
    .update(horseSearchContractsTable)
    .set({
      ...(horseName !== undefined ? { horseName } : {}),
      ...(salesPrice !== undefined ? { salesPrice: salesPrice || null } : {}),
      ...(holdingDepositAmount !== undefined ? { holdingDepositAmount: holdingDepositAmount || null } : {}),
      ...(horseDescription !== undefined ? { horseDescription: horseDescription || null } : {}),
      ...(customClauses !== undefined ? { customClauses: customClauses || null } : {}),
      ...(sellerName !== undefined ? { sellerName } : {}),
      ...(sellerEmail !== undefined ? { sellerEmail } : {}),
      ...(sellerAddress !== undefined ? { sellerAddress } : {}),
      ...(sellerPhone !== undefined ? { sellerPhone } : {}),
      ...(sellerBankAccountName !== undefined ? { sellerBankAccountName } : {}),
      ...(sellerBankBsb !== undefined ? { sellerBankBsb } : {}),
      ...(sellerBankAccount !== undefined ? { sellerBankAccount } : {}),
      ...(buyerName !== undefined ? { buyerName } : {}),
      ...(buyerEmail !== undefined ? { buyerEmail } : {}),
      ...(buyerAddress !== undefined ? { buyerAddress } : {}),
      ...(buyerPhone !== undefined ? { buyerPhone } : {}),
      updatedAt: new Date(),
    })
    .where(eq(horseSearchContractsTable.horseSearchId, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "No contract found" });
  return res.json(updated);
});

// Admin: void contract
router.delete("/horse-searches/:id/search-contract", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  const result = await db
    .update(horseSearchContractsTable)
    .set({ status: "voided", updatedAt: new Date() })
    .where(eq(horseSearchContractsTable.horseSearchId, id))
    .returning();
  if (!result.length) return res.status(404).json({ error: "No contract found" });
  return res.json({ ok: true });
});

// Public: get contract for signing page
router.get("/horse-search-contract/:token", async (req, res) => {
  const { token } = req.params;
  const [contract] = await db
    .select()
    .from(horseSearchContractsTable)
    .where(eq(horseSearchContractsTable.token, token));
  if (!contract) return res.status(404).json({ error: "Contract not found" });
  if (contract.status === "voided") return res.status(410).json({ error: "This contract link has been voided." });
  return res.json({
    id: contract.id,
    token: contract.token,
    status: contract.status,
    horseName: contract.horseName,
    salesPrice: contract.salesPrice,
    holdingDepositAmount: contract.holdingDepositAmount,
    horseDescription: contract.horseDescription,
    customClauses: contract.customClauses,
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
    sellerSignedAt: contract.sellerSignedAt,
    buyerSignedAt: contract.buyerSignedAt,
    submittedAt: contract.submittedAt,
  });
});

// Public: submit signed contract (two-party flow)
router.post("/horse-search-contract/:token/submit", async (req, res) => {
  const { token } = req.params;
  const [contract] = await db
    .select()
    .from(horseSearchContractsTable)
    .where(eq(horseSearchContractsTable.token, token));
  if (!contract) return res.status(404).json({ error: "Contract not found" });
  if (contract.status === "voided") return res.status(410).json({ error: "This contract has been voided." });
  if (contract.status === "fully_signed" || contract.status === "submitted") {
    return res.status(409).json({ error: "This contract has already been fully signed." });
  }

  const {
    fillerName, fillerEmail, fillerRole,
    sellerName, sellerEmail, sellerAddress, sellerPhone,
    buyerName, buyerEmail, buyerAddress, buyerPhone,
    buyerSignature, sellerSignature,
    agreedSalesPrice, agreedHoldingDeposit, agreedDescription,
    agreedSection3, agreedSection4, agreedSellerDeclaration, agreedBuyerDeclaration,
  } = req.body as Record<string, any>;

  // Block if this party already signed
  if (fillerRole === "seller" && contract.sellerSignedAt) {
    return res.status(409).json({ error: "The seller has already signed this contract." });
  }
  if (fillerRole === "buyer" && contract.buyerSignedAt) {
    return res.status(409).json({ error: "The buyer has already signed this contract." });
  }

  const now = new Date();
  const sellerNowSigned = fillerRole === "seller" || !!contract.sellerSignedAt;
  const buyerNowSigned  = fillerRole === "buyer"  || !!contract.buyerSignedAt;
  const newStatus = sellerNowSigned && buyerNowSigned ? "fully_signed"
    : fillerRole === "seller" ? "seller_signed"
    : "buyer_signed";

  const [updated] = await db
    .update(horseSearchContractsTable)
    .set({
      status: newStatus,
      fillerName: fillerName || null,
      fillerEmail: fillerEmail || null,
      fillerRole: fillerRole || null,
      sellerName: sellerName || contract.sellerName,
      sellerEmail: sellerEmail || contract.sellerEmail,
      sellerAddress: sellerAddress || contract.sellerAddress,
      sellerPhone: sellerPhone || contract.sellerPhone,
      buyerName: buyerName || contract.buyerName,
      buyerEmail: buyerEmail || contract.buyerEmail,
      buyerAddress: buyerAddress || contract.buyerAddress,
      buyerPhone: buyerPhone || contract.buyerPhone,
      ...(fillerRole === "seller"
        ? { sellerSignature: sellerSignature || null, sellerSignedAt: now, agreedSellerDeclaration: agreedSellerDeclaration === true }
        : { buyerSignature: buyerSignature || null, buyerSignedAt: now, agreedBuyerDeclaration: agreedBuyerDeclaration === true }),
      agreedSalesPrice: agreedSalesPrice === true,
      agreedHoldingDeposit: agreedHoldingDeposit === true,
      agreedDescription: agreedDescription === true,
      agreedSection3: agreedSection3 === true,
      agreedSection4: agreedSection4 === true,
      submittedAt: newStatus === "fully_signed" ? now : contract.submittedAt,
      updatedAt: now,
    })
    .where(eq(horseSearchContractsTable.token, token))
    .returning();

  logger.info("Horse search contract signed", { token, fillerName, fillerRole, newStatus });
  return res.json(updated);
});

export default router;
