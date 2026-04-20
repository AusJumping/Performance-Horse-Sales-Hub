import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { eoisTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import PDFDocument from "pdfkit";

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

// ─── API Routes ───────────────────────────────────────────────────────────────

// POST /api/eois — public EOI submission
router.post("/", async (req, res) => {
  try {
    const {
      buyerEmail, buyerFirstName, buyerSurname, buyerLocation, buyerPhone,
      horseName, formData, signatureData, waiverAgreed, declarationAgreed,
    } = req.body;

    if (!buyerEmail || !buyerFirstName || !buyerSurname || !buyerLocation || !buyerPhone || !horseName) {
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

// GET /api/eois/:id/pdf — admin: download EOI summary PDF
router.get("/:id/pdf", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [eoi] = await db.select().from(eoisTable).where(eq(eoisTable.id, id));
    if (!eoi) return res.status(404).json({ error: "Not found" });

    const fd = (eoi.formData ?? {}) as Record<string, unknown>;
    const buyerName = `${eoi.buyerFirstName} ${eoi.buyerSurname}`;
    const horseName = eoi.horseName;
    const safeFilename = `EOI_${sanitiseFilename(buyerName)}_${sanitiseFilename(horseName)}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);

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

    doc.pipe(res);
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate PDF" });
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

export default router;
