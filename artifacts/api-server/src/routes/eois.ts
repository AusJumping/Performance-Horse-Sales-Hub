import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { eoisTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { createHmac } from "crypto";
import PDFDocument from "pdfkit";
import { sendAcknowledgementEmail, sendInternalAlertEmail } from "../lib/email.js";
import { ObjectStorageService } from "../lib/objectStorage.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// ─── PDF helpers ─────────────────────────────────────────────────────────────

const NAVY      = "#24384e";
const NAVY_LIGHT = "#c5d5e3";
const COPPER    = "#8b4a2e";
const RULE      = "#dde3ea";
const TEXT      = "#1a1a1a";
const MUTED     = "#666666";
const PAGE_MARGIN = 50;

function sanitiseFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, "_").replace(/_+/g, "_").slice(0, 50);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length > 0 ? value.join("\n• ") : "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value).trim();
}

function drawSectionHeader(doc: PDFKit.PDFDocument, title: string) {
  if (doc.y > doc.page.height - 100) doc.addPage();
  doc.moveDown(0.7);
  const rectY = doc.y;
  const pageW = doc.page.width - PAGE_MARGIN * 2;
  doc.rect(PAGE_MARGIN, rectY, pageW, 20).fill(NAVY);
  doc
    .fillColor("white")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text(title.toUpperCase(), PAGE_MARGIN + 8, rectY + 6, { width: pageW - 16, lineBreak: false });
  doc.fillColor(TEXT);
  doc.y = rectY + 26;
}

function drawField(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  opts: { wide?: boolean } = {}
) {
  if (!value || value === "—") return;
  if (doc.y > doc.page.height - 80) doc.addPage();

  const pageW = doc.page.width - PAGE_MARGIN * 2;
  const labelW = opts.wide ? pageW : 155;
  const valueW = opts.wide ? pageW : pageW - labelW - 12;
  const startY = doc.y;

  if (opts.wide) {
    doc.fontSize(8).font("Helvetica-Bold").fillColor(NAVY)
      .text(label, PAGE_MARGIN, startY, { width: labelW });
    doc.fontSize(8).font("Helvetica").fillColor(TEXT)
      .text(value, PAGE_MARGIN, doc.y, { width: valueW });
  } else {
    doc.fontSize(8).font("Helvetica-Bold").fillColor(NAVY)
      .text(label, PAGE_MARGIN, startY, { width: labelW });
    const afterLabel = doc.y;
    doc.fontSize(8).font("Helvetica").fillColor(TEXT)
      .text(value, PAGE_MARGIN + labelW + 12, startY, { width: valueW });
    const afterValue = doc.y;
    doc.y = Math.max(afterLabel, afterValue);
  }

  doc
    .moveTo(PAGE_MARGIN, doc.y + 3)
    .lineTo(doc.page.width - PAGE_MARGIN, doc.y + 3)
    .strokeColor(RULE).lineWidth(0.5).stroke();
  doc.y += 8;
}

// ─── PDF generation ───────────────────────────────────────────────────────────

type EoiRow = typeof eoisTable.$inferSelect;

async function buildEoiPdfBuffer(eoi: EoiRow): Promise<Buffer> {
  const fd = (eoi.formData ?? {}) as Record<string, unknown>;
  const buyerName = `${eoi.buyerFirstName} ${eoi.buyerSurname}`;
  const horseName = eoi.horseName || "Any PHS Horse";

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: PAGE_MARGIN,
      size: "A4",
      autoFirstPage: true,
      bufferPages: true,
      info: {
        Title: `EOI — ${buyerName} — ${horseName}`,
        Author: "Performance Horse Sales",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageW = doc.page.width - PAGE_MARGIN * 2;

    // ── Header bar ─────────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 72).fill(NAVY);
    doc.fillColor("white").fontSize(18).font("Helvetica-Bold")
      .text("Performance Horse Sales", PAGE_MARGIN, 18, { align: "center", width: pageW });
    doc.fontSize(9).font("Helvetica").fillColor(NAVY_LIGHT)
      .text("Buyer Expression of Interest — Summary", PAGE_MARGIN, 44, { align: "center", width: pageW });
    doc.y = 90;

    // ── EOI title block ────────────────────────────────────────────────────────
    doc.fillColor(NAVY).fontSize(17).font("Helvetica-Bold")
      .text(horseName, PAGE_MARGIN, doc.y, { width: pageW });
    doc.moveDown(0.2);
    doc.fontSize(10).font("Helvetica").fillColor(TEXT)
      .text(`Buyer: ${buyerName}  •  ${eoi.buyerLocation}`, PAGE_MARGIN, doc.y, { width: pageW });
    doc.moveDown(0.2);

    const requestTypes = (fd.requestTypes as string[] | undefined) ?? [];
    if (requestTypes.length > 0) {
      doc.fontSize(9).font("Helvetica").fillColor(COPPER)
        .text(`Requesting: ${requestTypes.join(", ")}`, PAGE_MARGIN, doc.y, { width: pageW });
      doc.moveDown(0.2);
    }

    doc.moveTo(PAGE_MARGIN, doc.y + 4)
      .lineTo(doc.page.width - PAGE_MARGIN, doc.y + 4)
      .strokeColor(NAVY).lineWidth(1.5).stroke();
    doc.y += 12;

    // ── Metadata strip ─────────────────────────────────────────────────────────
    const dateStr = new Date(eoi.createdAt).toLocaleDateString("en-AU", {
      day: "numeric", month: "long", year: "numeric",
    });
    doc.fontSize(8).font("Helvetica").fillColor(MUTED)
      .text(
        `EOI #${eoi.id}  |  Submitted: ${dateStr}  |  Status: ${eoi.status.replace(/_/g, " ").toUpperCase()}  |  Waiver: ${eoi.waiverAgreed ? "Agreed" : "Not agreed"}`,
        PAGE_MARGIN, doc.y, { align: "center", width: pageW }
      );
    doc.moveDown(0.8);

    // ── Section 1: Buyer Contact ───────────────────────────────────────────────
    drawSectionHeader(doc, "Buyer Contact Details");
    drawField(doc, "Full Name", buyerName);
    drawField(doc, "Email", eoi.buyerEmail);
    drawField(doc, "Phone", eoi.buyerPhone);
    drawField(doc, "Location", eoi.buyerLocation);
    drawField(doc, "Decision-maker role", formatValue(fd.decisionMakerRole));

    // ── Section 2: Request ─────────────────────────────────────────────────────
    drawSectionHeader(doc, "What the Buyer is Requesting");
    drawField(doc, "Form covers", formatValue(fd.coverageType));
    if (requestTypes.length > 0) {
      drawField(doc, "Requesting", `• ${requestTypes.join("\n• ")}`, { wide: true });
    }
    drawField(doc, "Preferred viewing date", formatValue(fd.preferredViewingDate));
    drawField(doc, "Information / video requested", formatValue(fd.requestedInfo), { wide: true });
    drawField(doc, "Additional info request", formatValue(fd.additionalInfoRequest), { wide: true });

    // ── Section 3: Coach & Viewing ─────────────────────────────────────────────
    drawSectionHeader(doc, "Coach & Viewing");
    drawField(doc, "Coach", formatValue(fd.coachName));
    const viewingFactors = fd.viewingFactors as string[] | undefined;
    if (viewingFactors && viewingFactors.length > 0) {
      drawField(doc, "Viewing factors", `• ${viewingFactors.join("\n• ")}`, { wide: true });
    }

    // ── Section 4: Horse Requirements ─────────────────────────────────────────
    drawSectionHeader(doc, "Horse Requirements — Budget & Research");
    drawField(doc, "Research confirmed", formatValue(fd.hasResearched));
    drawField(doc, "Budget readiness", formatValue(fd.budgetStatus));
    drawField(doc, "Budget amount", formatValue(fd.budgetAmount));

    // ── Section 5: Disciplines & Activities ───────────────────────────────────
    drawSectionHeader(doc, "Disciplines & Activities");
    const disciplines = fd.disciplines as string[] | undefined;
    if (disciplines && disciplines.length > 0) {
      drawField(doc, "Suitable disciplines", `• ${disciplines.join("\n• ")}`, { wide: true });
    }
    const activities = fd.activities as string[] | undefined;
    if (activities && activities.length > 0) {
      drawField(doc, "How they like to ride", `• ${activities.join("\n• ")}`, { wide: true });
    }

    // ── Section 6: Horse Type ──────────────────────────────────────────────────
    drawSectionHeader(doc, "Horse Type & Non-negotiables");
    drawField(doc, "Horse description", formatValue(fd.horseDescription), { wide: true });
    const horseAttrs = fd.horseTypeAttributes as string[] | undefined;
    if (horseAttrs && horseAttrs.length > 0) {
      drawField(doc, "Type attributes", `• ${horseAttrs.join("\n• ")}`, { wide: true });
    }
    const nonNeg = fd.nonNegotiables as string[] | undefined;
    if (nonNeg && nonNeg.length > 0) {
      drawField(doc, "Non-negotiables", `• ${nonNeg.join("\n• ")}`, { wide: true });
    }

    // ── Section 7: Rider Goals ─────────────────────────────────────────────────
    drawSectionHeader(doc, "Rider Goals & Competence");
    drawField(doc, "Performance goals", formatValue(fd.riderGoals));
    drawField(doc, "Goal detail", formatValue(fd.additionalGoalInfo), { wide: true });
    drawField(doc, "Competence level", formatValue(fd.riderCompetenceLevel), { wide: true });

    // ── Section 8: Rider Profile ───────────────────────────────────────────────
    drawSectionHeader(doc, "Rider Profile");
    drawField(doc, "Confidence level", formatValue(fd.riderConfidence), { wide: true });
    drawField(doc, "Circumstances", formatValue(fd.riderCircumstances), { wide: true });
    drawField(doc, "Rider age", formatValue(fd.riderAge));
    drawField(doc, "Additional rider info", formatValue(fd.riderInfo), { wide: true });

    // ── Section 9: Purchase Details ────────────────────────────────────────────
    drawSectionHeader(doc, "Purchase & Vetting");
    const purchaseFactors = fd.purchaseFactors as string[] | undefined;
    if (purchaseFactors && purchaseFactors.length > 0) {
      drawField(doc, "Purchase factors", `• ${purchaseFactors.join("\n• ")}`, { wide: true });
    }
    drawField(doc, "Other non-negotiables", formatValue(fd.otherNonNegotiables), { wide: true });
    drawField(doc, "Vetting level", formatValue(fd.vettingLevel), { wide: true });
    drawField(doc, "Vet check expectations", formatValue(fd.vetExpectations), { wide: true });

    // ── Section 10: Horse Management ──────────────────────────────────────────
    drawSectionHeader(doc, "Horse Management & Buyer Experience");
    const mgmt = fd.managementConditions as string[] | undefined;
    if (mgmt && mgmt.length > 0) {
      drawField(doc, "Management conditions", `• ${mgmt.join("\n• ")}`, { wide: true });
    }
    drawField(doc, "Agistment location", formatValue(fd.agistmentLocation), { wide: true });
    drawField(doc, "Experience & support", formatValue(fd.experienceLevel), { wide: true });
    drawField(doc, "Settling expectations", formatValue(fd.settlingExpectations), { wide: true });
    drawField(doc, "Other management", formatValue(fd.otherManagementFactors), { wide: true });

    // ── Section 11: Legal ──────────────────────────────────────────────────────
    drawSectionHeader(doc, "Legal — Waiver & Declaration");
    drawField(doc, "Waiver agreed", eoi.waiverAgreed ? "Yes — waiver accepted" : "No");
    drawField(doc, "Declaration agreed", eoi.declarationAgreed ? "Yes — declaration signed" : "No");

    if (eoi.signatureData && eoi.signatureData.startsWith("data:image")) {
      if (doc.y > doc.page.height - 120) doc.addPage();
      doc.fontSize(8).font("Helvetica-Bold").fillColor(NAVY).text("Digital Signature", PAGE_MARGIN, doc.y);
      doc.moveDown(0.3);
      const base64Data = eoi.signatureData.split(",")[1];
      if (base64Data) {
        const imgBuf = Buffer.from(base64Data, "base64");
        doc.image(imgBuf, PAGE_MARGIN, doc.y, { height: 60, fit: [220, 60] });
        doc.y += 70;
        doc.moveTo(PAGE_MARGIN, doc.y).lineTo(doc.page.width - PAGE_MARGIN, doc.y)
          .strokeColor(RULE).lineWidth(0.5).stroke();
        doc.y += 8;
      }
    }

    // ── Section 12: Admin Notes ────────────────────────────────────────────────
    if (eoi.adminNotes && eoi.adminNotes.trim()) {
      drawSectionHeader(doc, "Admin Notes");
      drawField(doc, "Notes", eoi.adminNotes, { wide: true });
    }

    // ── Footer on every page ───────────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const footerY = doc.page.height - 36;
      doc.rect(0, footerY, doc.page.width, 36).fill(NAVY);
      doc.fillColor(NAVY_LIGHT).fontSize(7).font("Helvetica")
        .text(
          `Performance Horse Sales  |  performancehorsesales.com.au  |  Confidential — Internal Use Only  |  Page ${i + 1} of ${range.count}`,
          PAGE_MARGIN, footerY + 13, { align: "center", width: pageW }
        );
    }

    doc.end();
  });
}

// ─── API Routes ───────────────────────────────────────────────────────────────

// POST /api/eois — public EOI submission
router.post("/", async (req, res) => {
  try {
    const {
      buyerEmail, buyerFirstName, buyerSurname, buyerLocation, buyerPhone,
      horseName, formData, signatureData, waiverAgreed, declarationAgreed,
    } = req.body;

    const coverageType = (formData as Record<string, unknown>)?.coverageType;
    const horseNameRequired = !coverageType || coverageType === "a specific horse";
    if (!buyerEmail || !buyerFirstName || !buyerSurname || !buyerLocation || !buyerPhone || (horseNameRequired && !horseName)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const [eoi] = await db.insert(eoisTable).values({
      buyerEmail,
      buyerFirstName,
      buyerSurname,
      buyerLocation,
      buyerPhone,
      horseName,
      formData: formData || {},
      signatureData: signatureData || null,
      waiverAgreed: waiverAgreed === true,
      declarationAgreed: declarationAgreed === true,
      status: "new",
    }).returning();

    // Send emails (non-blocking)
    const eoiFirstName = buyerFirstName || "there";
    setImmediate(() => sendAcknowledgementEmail({
      to: buyerEmail,
      firstName: eoiFirstName,
      formType: "eoi",
      horseName: horseName ?? undefined,
    }));
    setImmediate(() => sendInternalAlertEmail({
      formType: "eoi",
      recordId: eoi.id,
      name: `${buyerFirstName} ${buyerSurname}`.trim(),
      email: buyerEmail,
      phone: buyerPhone ?? undefined,
      horseName: horseName ?? undefined,
      location: buyerLocation ?? undefined,
    }));

    // Auto-save signed PDF to object storage (non-blocking)
    const eoiSnapshot = eoi;
    setImmediate(async () => {
      try {
        const pdf = await buildEoiPdfBuffer(eoiSnapshot);
        const storage = new ObjectStorageService();
        const storagePath = await storage.uploadBuffer(`eoi-pdfs/${eoiSnapshot.id}.pdf`, pdf, "application/pdf");
        await db.update(eoisTable).set({ pdfStoragePath: storagePath }).where(eq(eoisTable.id, eoiSnapshot.id));
        logger.info({ eoiId: eoiSnapshot.id }, "EOI PDF auto-saved to storage");
      } catch (err) {
        logger.warn({ err, eoiId: eoiSnapshot.id }, "Failed to auto-save EOI PDF (non-fatal)");
      }
    });

    res.json(eoi);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit EOI" });
  }
});

// GET /api/eois — admin: list all EOIs
router.get("/", async (_req, res) => {
  try {
    const eois = await db.select().from(eoisTable).orderBy(desc(eoisTable.createdAt));
    res.json(eois);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch EOIs" });
  }
});

// GET /api/eois/:id/pdf — admin: generate and download EOI PDF on demand
router.get("/:id/pdf", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [eoi] = await db.select().from(eoisTable).where(eq(eoisTable.id, id));
    if (!eoi) return res.status(404).json({ error: "Not found" });

    const buyerName = `${eoi.buyerFirstName} ${eoi.buyerSurname}`;
    const horseName = eoi.horseName || "Any_PHS_Horse";
    const safeFilename = `EOI_${sanitiseFilename(buyerName)}_${sanitiseFilename(horseName)}.pdf`;

    const buf = await buildEoiPdfBuffer(eoi);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
    res.end(buf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

// GET /api/eois/:id/stored-pdf — admin: redirect to the auto-saved PDF (with signature)
router.get("/:id/stored-pdf", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [eoi] = await db.select().from(eoisTable).where(eq(eoisTable.id, id));
    if (!eoi) return res.status(404).json({ error: "Not found" });
    if (!eoi.pdfStoragePath) return res.status(404).json({ error: "No stored PDF found for this EOI" });

    const storage = new ObjectStorageService();
    const url = await storage.getObjectEntityDownloadURL(eoi.pdfStoragePath, 600);
    res.redirect(url);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to retrieve stored PDF" });
  }
});


// GET /api/eois/:id — admin: get single EOI
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const [eoi] = await db.select().from(eoisTable).where(eq(eoisTable.id, id));
    if (!eoi) return res.status(404).json({ error: "Not found" });
    res.json(eoi);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch EOI" });
  }
});

// PATCH /api/eois/:id — admin: update status / notes
router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const { status, adminNotes } = req.body;

    const [updated] = await db.update(eoisTable)
      .set({
        ...(status !== undefined && { status }),
        ...(adminNotes !== undefined && { adminNotes }),
        updatedAt: new Date(),
      })
      .where(eq(eoisTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update EOI" });
  }
});

// ─── Delete EOI ───────────────────────────────────────────────────────────────

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const deleted = await db.delete(eoisTable).where(eq(eoisTable.id, id)).returning();
    if (!deleted.length) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete EOI" });
  }
});

// ─── One-time sample data seed (admin-protected, idempotent) ─────────────────

router.post("/seed-samples", async (req, res) => {
  try {
    const secret = process.env.SESSION_SECRET ?? "phs-fallback-secret";
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) return res.status(503).json({ error: "ADMIN_PASSWORD not configured" });

    const expectedToken = createHmac("sha256", secret).update(adminPassword).digest("hex");
    const authHeader = req.headers.authorization ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token !== expectedToken) return res.status(401).json({ error: "Unauthorised" });

    const [{ value: existing }] = await db.select({ value: count() }).from(eoisTable);
    if (Number(existing) > 0) {
      return res.json({ message: `Skipped — ${existing} EOIs already exist.` });
    }

    const samples = [
      {
        buyerFirstName: "Jessica",
        buyerSurname: "Hartley",
        buyerEmail: "jessica.hartley@gmail.com",
        buyerPhone: "0412 345 678",
        buyerLocation: "Bowral, NSW",
        horseName: "Warwick Park Obsidian",
        waiverAgreed: true,
        declarationAgreed: true,
        status: "suitable",
        adminNotes: "Seller thinks she sounds like a good match. Will arrange viewing next week.",
        formData: {
          ageRange: "8–12 years",
          riderGoals: "I want to compete in showjumping at 1m–1.1m level and eventually move into eventing. I have my own float and agistment arranged.",
          disciplines: ["Showjumping", "Eventing"],
          heightRange: "16–16.2hh",
          ppePurchase: "Intend to purchase",
          budgetStatus: "Finance pre-approved",
          requestTypes: ["Private viewing", "Video call with owner"],
          currentHorses: "1 horse (retired)",
          additionalInfo: "I have competed at Equissage and Camden Show. Happy to provide rider video via WhatsApp.",
          trialRequested: true,
          insuranceStatus: "Will arrange prior to purchase",
          ridingFrequency: "5–6 days per week",
          riderCompetenceLevel: "Intermediate — competing at club level",
        },
      },
      {
        buyerFirstName: "Ben",
        buyerSurname: "McAllister",
        buyerEmail: "ben.mcallister@outlook.com",
        buyerPhone: "0487 654 321",
        buyerLocation: "Scone, NSW",
        horseName: "Highfields Copperhead",
        waiverAgreed: true,
        declarationAgreed: true,
        status: "viewing_booked",
        adminNotes: "Viewing confirmed Saturday 26 April at 10am. Seller advised.",
        formData: {
          ageRange: "5–9 years",
          riderGoals: "Looking for a quality performance horse for campdrafting and working stockhorse competition at open level. Have 20 years experience with performance horses.",
          disciplines: ["Campdrafting", "Working Stockhorse"],
          heightRange: "15.2–16hh",
          ppePurchase: "Already insured through existing policy",
          budgetStatus: "Funds available",
          requestTypes: ["Private viewing"],
          currentHorses: "4 horses in work",
          additionalInfo: "Happy to travel for a viewing. Can provide references from trainers.",
          trialRequested: false,
          insuranceStatus: "Existing equine insurance policy",
          ridingFrequency: "Daily",
          riderCompetenceLevel: "Advanced — professional rider",
        },
      },
      {
        buyerFirstName: "Claire",
        buyerSurname: "Wu",
        buyerEmail: "claire.wu@icloud.com",
        buyerPhone: "0401 111 222",
        buyerLocation: "Dural, NSW",
        horseName: "Warwick Park Obsidian",
        waiverAgreed: true,
        declarationAgreed: true,
        status: "not_suitable",
        adminNotes: "Horse is too advanced for beginner rider — advised not suitable for safety reasons.",
        formData: {
          ageRange: "10–18 years",
          riderGoals: "I have just started riding and am looking for a quiet, confidence-giving horse for trail riding and light arena work. Lessons once a week.",
          disciplines: ["Trail Riding", "Pleasure"],
          heightRange: "14.2–15.2hh",
          ppePurchase: "Need to arrange",
          budgetStatus: "Budget set — not seeking finance",
          requestTypes: ["Extra photos/video", "Private viewing"],
          currentHorses: "None",
          additionalInfo: "",
          trialRequested: true,
          insuranceStatus: "Not yet arranged",
          ridingFrequency: "1–2 days per week",
          riderCompetenceLevel: "Beginner — less than 2 years riding",
        },
      },
      {
        buyerFirstName: "Amelia",
        buyerSurname: "Foster",
        buyerEmail: "amelia.foster@gmail.com",
        buyerPhone: "0455 789 012",
        buyerLocation: "Berry, NSW",
        horseName: "Ridgeline Zephyr",
        waiverAgreed: true,
        declarationAgreed: true,
        status: "new",
        adminNotes: null,
        formData: {
          ageRange: "7–12 years",
          riderGoals: "Looking for an eventing horse to compete at EvA80–EvA95. Currently training with Sarah Jones. Have own agistment and float.",
          disciplines: ["Eventing", "Dressage"],
          heightRange: "16–16.3hh",
          ppePurchase: "Will arrange prior to purchase",
          budgetStatus: "Finance pre-approved",
          requestTypes: ["Video call with owner", "Private viewing"],
          currentHorses: "1 horse (sold recently)",
          additionalInfo: "Can provide rider video. Competed at Glenworth Valley and Nowra EC.",
          trialRequested: true,
          insuranceStatus: "Will arrange prior to purchase",
          ridingFrequency: "4–5 days per week",
          riderCompetenceLevel: "Intermediate — competing at club level",
        },
      },
      {
        buyerFirstName: "Mark",
        buyerSurname: "Davidson",
        buyerEmail: "mark.davidson@bigpond.com",
        buyerPhone: "0421 333 444",
        buyerLocation: "Orange, NSW",
        horseName: "Highfields Copperhead",
        waiverAgreed: true,
        declarationAgreed: true,
        status: "under_review",
        adminNotes: "Sent to seller for assessment. Awaiting response.",
        formData: {
          ageRange: "6–12 years",
          riderGoals: "Returning to competition after a few years off. Looking for a solid campdrafter to start back at maiden/novice level and work up. Have all facilities.",
          disciplines: ["Campdrafting"],
          heightRange: "15–16hh",
          ppePurchase: "Already have cover",
          budgetStatus: "Funds available",
          requestTypes: ["Private viewing"],
          currentHorses: "2 paddock horses",
          additionalInfo: "Competed at NSW State Campdraft. Happy to discuss over the phone first.",
          trialRequested: false,
          insuranceStatus: "Existing policy",
          ridingFrequency: "Weekends and occasional weekday",
          riderCompetenceLevel: "Experienced amateur — competed at state level previously",
        },
      },
    ];

    await db.insert(eoisTable).values(samples);
    res.json({ message: `Seeded ${samples.length} sample EOIs successfully.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Seed failed" });
  }
});

export default router;
