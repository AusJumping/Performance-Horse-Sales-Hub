import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import PDFDocument from "pdfkit";
import { db } from "@workspace/db";
import { horseSearchesTable, driveSettingsTable, horseSearchAgreementsTable, horseSearchContractsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  createDriveFolder,
  createGoogleDoc,
  exportDocAsPdf,
  safeDriveName,
  formatDateTime,
} from "../lib/googleDrive.js";
import { sendAcknowledgementEmail, sendInternalAlertEmail } from "../lib/email.js";

const router: IRouter = Router();

// ─── Horse Search PDF builder ─────────────────────────────────────────────────

type HorseSearchRow = typeof horseSearchesTable.$inferSelect;

async function buildHorseSearchPdfBuffer(hs: HorseSearchRow): Promise<Buffer> {
  const fd = (hs.formData ?? {}) as Record<string, unknown>;
  const clientName = `${hs.firstName} ${hs.surname}`;
  const serviceLabel = hs.searchServiceLevel === "level2"
    ? "Premium Concierge — $1,000 + 5%"
    : "Standard Search — $500 + $500";

  const NAVY = "#24384e"; const NAVY_LIGHT = "#c5d5e3";
  const RULE = "#dde3ea"; const TEXT = "#1a1a1a"; const MUTED = "#666666";
  const PM = 50;

  function fv(v: unknown): string {
    if (v === null || v === undefined || v === "") return "—";
    if (Array.isArray(v)) return v.length > 0 ? v.join(", ") : "—";
    if (typeof v === "boolean") return v ? "Yes" : "No";
    return String(v).trim();
  }

  function sec(doc: PDFKit.PDFDocument, title: string) {
    if (doc.y > doc.page.height - 100) doc.addPage();
    doc.moveDown(0.7);
    const y = doc.y; const w = doc.page.width - PM * 2;
    doc.rect(PM, y, w, 20).fill(NAVY);
    doc.fillColor("white").fontSize(8).font("Helvetica-Bold")
      .text(title.toUpperCase(), PM + 8, y + 6, { width: w - 16, lineBreak: false });
    doc.fillColor(TEXT); doc.y = y + 26;
  }

  function fld(doc: PDFKit.PDFDocument, label: string, value: string, wide = false) {
    if (!value || value === "—") return;
    if (doc.y > doc.page.height - 80) doc.addPage();
    const w = doc.page.width - PM * 2;
    const lw = wide ? w : 160; const vw = wide ? w : w - lw - 12;
    const sy = doc.y;
    if (wide) {
      doc.fontSize(8).font("Helvetica-Bold").fillColor(NAVY).text(label, PM, sy, { width: lw });
      doc.fontSize(8).font("Helvetica").fillColor(TEXT).text(value, PM, doc.y, { width: vw });
    } else {
      doc.fontSize(8).font("Helvetica-Bold").fillColor(NAVY).text(label, PM, sy, { width: lw });
      const al = doc.y;
      doc.fontSize(8).font("Helvetica").fillColor(TEXT).text(value, PM + lw + 12, sy, { width: vw });
      doc.y = Math.max(al, doc.y);
    }
    doc.moveTo(PM, doc.y + 3).lineTo(doc.page.width - PM, doc.y + 3)
      .strokeColor(RULE).lineWidth(0.5).stroke();
    doc.y += 8;
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: PM, size: "A4", autoFirstPage: true, bufferPages: true,
      info: { Title: `Horse Search — ${clientName}`, Author: "Performance Horse Sales" } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pw = doc.page.width - PM * 2;

    // Header
    doc.rect(0, 0, doc.page.width, 72).fill(NAVY);
    doc.fillColor("white").fontSize(18).font("Helvetica-Bold")
      .text("Performance Horse Sales", PM, 18, { align: "center", width: pw });
    doc.fontSize(9).font("Helvetica").fillColor(NAVY_LIGHT)
      .text("Horse Search Request", PM, 44, { align: "center", width: pw });
    doc.y = 90;

    // Title block
    doc.fillColor(NAVY).fontSize(17).font("Helvetica-Bold")
      .text(clientName, PM, doc.y, { width: pw });
    doc.moveDown(0.2);
    doc.fontSize(10).font("Helvetica").fillColor(TEXT)
      .text(`${hs.location}  •  ${serviceLabel}`, PM, doc.y, { width: pw });
    doc.moveDown(0.2);
    doc.moveTo(PM, doc.y + 4).lineTo(doc.page.width - PM, doc.y + 4)
      .strokeColor(NAVY).lineWidth(1.5).stroke();
    doc.y += 12;

    const dateStr = new Date(hs.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
    doc.fontSize(8).font("Helvetica").fillColor(MUTED)
      .text(`Search #${hs.id}  |  Submitted: ${dateStr}  |  Status: ${hs.status.replace(/_/g, " ").toUpperCase()}`,
        PM, doc.y, { align: "center", width: pw });
    doc.moveDown(0.8);

    // Sections
    sec(doc, "Contact Details");
    fld(doc, "Full Name", clientName);
    fld(doc, "Email", hs.email);
    fld(doc, "Secondary Email", hs.emailOptional ?? "—");
    fld(doc, "Phone", hs.phone);
    fld(doc, "Location", hs.location);
    fld(doc, "Service Level", serviceLabel);

    sec(doc, "About the Search");
    fld(doc, "Main reason for help", fv(fd.mainReason), true);
    fld(doc, "Search factors", fv(fd.searchFactors), true);
    fld(doc, "Preferred location", fv(fd.preferredLocation));
    fld(doc, "Budget", fv(fd.budget));

    sec(doc, "Horse Criteria");
    fld(doc, "Preferred age range", fv(fd.horseAgeRange));
    fld(doc, "Preferred height", fv(fd.horseHeight));
    fld(doc, "Main discipline", fv(fd.mainDiscipline));
    fld(doc, "Horse type", fv(fd.horseType));
    fld(doc, "3 characteristics I like", fv(fd.characteristicsLiked), true);
    fld(doc, "3 deal breakers", fv(fd.dealBreakers), true);
    if (Array.isArray(fd.horseStatements) && fd.horseStatements.length > 0) {
      fld(doc, "Horse must be / have", `• ${(fd.horseStatements as string[]).join("\n• ")}`, true);
    }

    sec(doc, "Goals & Current Level");
    fld(doc, "Rider goals", fv(fd.riderGoals), true);
    fld(doc, "Must compete at level", fv(fd.currentCompetitionLevel));
    fld(doc, "Future goals", fv(fd.futureGoals), true);

    sec(doc, "Rider Profile");
    fld(doc, "Rider competence", fv(fd.riderCompetence));
    fld(doc, "Riding confidence", fv(fd.ridingConfidence), true);
    fld(doc, "Rider history", fv(fd.riderHistory), true);
    fld(doc, "Rider age", fv(fd.riderAge));

    // Signature
    if (hs.signatureData && hs.signatureData.startsWith("data:image")) {
      sec(doc, "Declaration & Signature");
      fld(doc, "Terms agreed", hs.termsAgreed ? "Yes" : "No");
      if (doc.y > doc.page.height - 120) doc.addPage();
      doc.fontSize(8).font("Helvetica-Bold").fillColor(NAVY).text("Digital Signature", PM, doc.y);
      doc.moveDown(0.3);
      const b64 = hs.signatureData.split(",")[1];
      if (b64) {
        const imgBuf = Buffer.from(b64, "base64");
        doc.image(imgBuf, PM, doc.y, { height: 60, fit: [220, 60] });
        doc.y += 70;
        doc.moveTo(PM, doc.y).lineTo(doc.page.width - PM, doc.y)
          .strokeColor(RULE).lineWidth(0.5).stroke();
        doc.y += 8;
      }
    }

    // Footer
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const fy = doc.page.height - 36;
      doc.rect(0, fy, doc.page.width, 36).fill(NAVY);
      doc.fillColor(NAVY_LIGHT).fontSize(7).font("Helvetica")
        .text(`Performance Horse Sales  |  performancehorsesales.com.au  |  Confidential — Internal Use Only  |  Page ${i + 1} of ${range.count}`,
          PM, fy + 13, { align: "center", width: pw });
    }

    doc.end();
  });
}

async function getSettings() {
  const [s] = await db.select().from(driveSettingsTable).limit(1);
  return s ?? null;
}

function formatSearchAsHtml(hs: {
  id: number;
  firstName: string;
  surname: string;
  email: string;
  emailOptional: string | null;
  phone: string;
  location: string;
  searchServiceLevel: string;
  formData: Record<string, unknown>;
  createdAt: Date;
}): string {
  const f = hs.formData;
  const arr = (k: string) => {
    const v = f[k];
    return Array.isArray(v) ? (v as string[]).join(", ") : v ? String(v) : "—";
  };
  const str = (k: string) => {
    const v = f[k];
    return v !== null && v !== undefined && v !== "" ? String(v) : "—";
  };

  const section = (title: string, rows: [string, string][]) => `
    <h2 style="color:#24384e;border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:24px">${title}</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
      ${rows.map(([label, val]) => `
        <tr>
          <td style="padding:5px 12px 5px 0;font-weight:bold;vertical-align:top;white-space:nowrap;width:220px;color:#444">${label}</td>
          <td style="padding:5px 0;color:#222">${val}</td>
        </tr>`).join("")}
    </table>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:820px;margin:0 auto;padding:24px;color:#333">
  <h1 style="color:#24384e;border-bottom:3px solid #24384e;padding-bottom:10px">
    Horse Search Request — ${hs.firstName} ${hs.surname}
  </h1>
  <p style="color:#888;font-size:13px">Performance Horse Sales AU NZ — PHS App Record | Submitted: ${formatDateTime(hs.createdAt)}</p>

  ${section("Contact Details", [
    ["Search #", String(hs.id)],
    ["Name", `${hs.firstName} ${hs.surname}`],
    ["Primary Email", hs.email],
    ["Secondary Email", hs.emailOptional ?? "—"],
    ["Phone", hs.phone],
    ["Location", hs.location],
    ["Search Service", hs.searchServiceLevel],
  ])}

  ${section("About the Search", [
    ["Main Reason for Help", str("mainReason")],
    ["Search Factors", arr("searchFactors")],
    ["Preferred Location", str("preferredLocation")],
    ["Budget", str("budget")],
  ])}

  ${section("Horse Criteria", [
    ["Preferred Age Range", arr("horseAgeRange")],
    ["Preferred Height", arr("horseHeight")],
    ["3 Characteristics I Like", str("characteristicsLiked")],
    ["3 Deal Breakers", str("dealBreakers")],
    ["Main Discipline", str("mainDiscipline")],
    ["Horse Type", str("horseType")],
  ])}

  ${section("Goals & Level", [
    ["Rider Goals", str("riderGoals")],
    ["Horse Must Be Competing At", str("currentCompetitionLevel")],
    ["Future Goals", str("futureGoals")],
  ])}

  ${section("Rider Profile", [
    ["Rider Competence", str("riderCompetence")],
    ["How I Feel Riding", str("ridingConfidence")],
    ["Rider History", str("riderHistory")],
    ["Rider Age / Age Bracket", str("riderAge")],
  ])}

  ${section("Horse Requirements", [
    ["Statements Describing Horse I Want", arr("horseStatements")],
  ])}

  ${section("Management & Restrictions", [
    ["Horse Management", arr("horseManagement")],
    ["Search Restrictions", arr("searchRestrictions")],
    ["Other Information", str("otherInfo")],
  ])}

  <p style="color:#aaa;font-size:11px;border-top:1px solid #eee;padding-top:12px;margin-top:24px">
    Generated by PHS App on ${formatDateTime(new Date())}. Terms agreed: Yes.
  </p>
</body>
</html>`;
}

// ── POST /api/horse-searches ───────────────────────────────────────────────
router.post("/", async (req, res) => {
  const body = req.body as {
    firstName: string;
    surname: string;
    email: string;
    emailOptional?: string;
    phone: string;
    location: string;
    searchServiceLevel: string;
    formData: Record<string, unknown>;
    termsAgreed: boolean;
    signatureData?: string;
  };

  if (!body.firstName || !body.surname || !body.email || !body.phone || !body.location || !body.searchServiceLevel) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const [hs] = await db.insert(horseSearchesTable).values({
    firstName: body.firstName,
    surname: body.surname,
    email: body.email,
    emailOptional: body.emailOptional ?? null,
    phone: body.phone,
    location: body.location,
    searchServiceLevel: body.searchServiceLevel,
    formData: body.formData ?? {},
    termsAgreed: body.termsAgreed ?? false,
    signatureData: body.signatureData ?? null,
    status: "new",
  }).returning();

  // Send emails (non-blocking)
  setImmediate(() => sendAcknowledgementEmail({
    to: body.email,
    firstName: body.firstName || "there",
    formType: "search",
  }));
  const hsSnap = hs;
  setImmediate(async () => {
    let pdfAttachment: { filename: string; content: Buffer } | undefined;
    try {
      const buf = await buildHorseSearchPdfBuffer(hsSnap);
      const safeName = `${body.firstName}_${body.surname}`.replace(/[^a-zA-Z0-9]/g, "_");
      pdfAttachment = { filename: `${safeName}_Horse_Search.pdf`, content: buf };
    } catch (_) { /* PDF failed — send email without attachment */ }
    await sendInternalAlertEmail({
      formType: "search",
      recordId: hsSnap.id,
      name: `${body.firstName} ${body.surname}`.trim(),
      email: body.email,
      phone: body.phone ?? undefined,
      location: body.location ?? undefined,
      pdfAttachment,
    });
  });

  // Auto-create Drive folder in background (non-blocking)
  setImmediate(async () => {
    try {
      const settings = await getSettings();
      if (!settings?.rootFolderId) return;

      // Ensure "Search Folders" parent exists
      let searchParentId = settings.searchFolderParentId;
      if (!searchParentId) {
        const sf = await createDriveFolder("Search Folders", settings.rootFolderId);
        searchParentId = sf.id;
        await db.update(driveSettingsTable)
          .set({ searchFolderParentId: sf.id, searchFolderLink: sf.webViewLink, updatedAt: new Date() })
          .where(eq(driveSettingsTable.id, settings.id));
      }

      // Create individual folder for this search
      const folderName = safeDriveName(`${body.firstName} ${body.surname} - Search`);
      const folder = await createDriveFolder(folderName, searchParentId);

      // Create Google Doc summary
      const docTitle = `${folderName} — Criteria`;
      const doc = await createGoogleDoc(
        docTitle,
        formatSearchAsHtml({ ...hs, createdAt: hs.createdAt ?? new Date() }),
        folder.id
      );

      // Export PDF copy to the same folder (non-fatal if it fails)
      try {
        await exportDocAsPdf(doc.id, `${docTitle}.pdf`, folder.id);
      } catch {}

      await db.update(horseSearchesTable)
        .set({
          driveFolderId: folder.id,
          driveFolderLink: folder.webViewLink,
          driveDocId: doc.id,
          driveDocLink: doc.webViewLink,
          driveSetupStatus: "done",
          updatedAt: new Date(),
        })
        .where(eq(horseSearchesTable.id, hs.id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await db.update(horseSearchesTable)
        .set({ driveSetupStatus: "failed", driveSetupError: msg, updatedAt: new Date() })
        .where(eq(horseSearchesTable.id, hs.id)).catch(() => {});
    }
  });

  res.status(201).json(hs);
});

// ── GET /api/horse-searches ────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const items = await db.select().from(horseSearchesTable).orderBy(desc(horseSearchesTable.createdAt));
  res.json(items);
});

// ── GET /api/horse-searches/:id ───────────────────────────────────────────
router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  const [hs] = await db.select().from(horseSearchesTable).where(eq(horseSearchesTable.id, id));
  if (!hs) return res.status(404).json({ error: "Not found" });
  res.json(hs);
});

// ── PATCH /api/horse-searches/:id ────────────────────────────────────────
router.patch("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  const { status, adminNotes } = req.body as { status?: string; adminNotes?: string };
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (status !== undefined) updates.status = status;
  if (adminNotes !== undefined) updates.adminNotes = adminNotes;
  const [updated] = await db.update(horseSearchesTable).set(updates).where(eq(horseSearchesTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(updated);
});

// ── DELETE /api/horse-searches/:id ───────────────────────────────────────
router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  const [deleted] = await db.delete(horseSearchesTable).where(eq(horseSearchesTable.id, id)).returning();
  if (!deleted) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

// ── POST /api/horse-searches/:id/retry-drive ─────────────────────────────
router.post("/:id/retry-drive", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const [hs] = await db.select().from(horseSearchesTable).where(eq(horseSearchesTable.id, id));
  if (!hs) return res.status(404).json({ error: "Not found" });
  if (hs.driveFolderId) return res.json({ message: "Drive folder already exists", driveFolderLink: hs.driveFolderLink });

  const settings = await getSettings();
  if (!settings?.rootFolderId) return res.status(400).json({ error: "Google Drive root folder not configured." });

  try {
    await db.update(horseSearchesTable)
      .set({ driveSetupStatus: "creating", driveSetupError: null, updatedAt: new Date() })
      .where(eq(horseSearchesTable.id, id));

    let searchParentId = settings.searchFolderParentId;
    if (!searchParentId) {
      const sf = await createDriveFolder("Search Folders", settings.rootFolderId);
      searchParentId = sf.id;
      await db.update(driveSettingsTable)
        .set({ searchFolderParentId: sf.id, searchFolderLink: sf.webViewLink, updatedAt: new Date() })
        .where(eq(driveSettingsTable.id, settings.id));
    }

    const folderName = safeDriveName(`${hs.firstName} ${hs.surname} - Search`);
    const folder = await createDriveFolder(folderName, searchParentId);
    const docTitle = `${folderName} — Criteria`;
    const doc = await createGoogleDoc(
      docTitle,
      formatSearchAsHtml({ ...hs, formData: hs.formData as Record<string, unknown> }),
      folder.id
    );

    // Export PDF copy (non-fatal)
    try {
      await exportDocAsPdf(doc.id, `${docTitle}.pdf`, folder.id);
    } catch {}

    const [updated] = await db.update(horseSearchesTable)
      .set({
        driveFolderId: folder.id,
        driveFolderLink: folder.webViewLink,
        driveDocId: doc.id,
        driveDocLink: doc.webViewLink,
        driveSetupStatus: "done",
        updatedAt: new Date(),
      })
      .where(eq(horseSearchesTable.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db.update(horseSearchesTable)
      .set({ driveSetupStatus: "failed", driveSetupError: msg, updatedAt: new Date() })
      .where(eq(horseSearchesTable.id, id));
    res.status(500).json({ error: msg });
  }
});

// ═══════════════════════════════════════════════════════════════════
// COSTS AGREEMENT — admin routes (public signing routes are in horse-search-documents.ts)
// ═══════════════════════════════════════════════════════════════════

router.get("/:id/agreement", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  const [agreement] = await db
    .select().from(horseSearchAgreementsTable)
    .where(eq(horseSearchAgreementsTable.horseSearchId, id))
    .orderBy(desc(horseSearchAgreementsTable.createdAt)).limit(1);
  if (!agreement) return res.status(404).json({ error: "No agreement found" });
  return res.json(agreement);
});

router.post("/:id/agreement", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  const [hs] = await db.select().from(horseSearchesTable).where(eq(horseSearchesTable.id, id));
  if (!hs) return res.status(404).json({ error: "Horse search not found" });

  const { upfrontFee, consultancyFee, customTerms } = req.body as Record<string, string | undefined>;
  const token = randomUUID();

  await db.update(horseSearchAgreementsTable)
    .set({ status: "voided", updatedAt: new Date() })
    .where(eq(horseSearchAgreementsTable.horseSearchId, id));

  const [agreement] = await db.insert(horseSearchAgreementsTable).values({
    horseSearchId: id, token, status: "pending",
    clientName: `${hs.firstName} ${hs.surname}`,
    clientEmail: hs.email, clientPhone: hs.phone,
    serviceLevel: hs.searchServiceLevel,
    upfrontFee: upfrontFee || "$1,000",
    consultancyFee: consultancyFee || "5% of the purchase price (min $1,000, capped at $2,000)",
    customTerms: customTerms || null,
  }).returning();

  return res.status(201).json(agreement);
});

router.patch("/:id/agreement", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  const { upfrontFee, consultancyFee, customTerms, clientName, clientEmail, clientAddress, clientPhone } = req.body as Record<string, string | undefined>;
  const [updated] = await db.update(horseSearchAgreementsTable).set({
    ...(clientName !== undefined ? { clientName } : {}),
    ...(clientEmail !== undefined ? { clientEmail } : {}),
    ...(clientAddress !== undefined ? { clientAddress } : {}),
    ...(clientPhone !== undefined ? { clientPhone } : {}),
    ...(upfrontFee !== undefined ? { upfrontFee } : {}),
    ...(consultancyFee !== undefined ? { consultancyFee } : {}),
    ...(customTerms !== undefined ? { customTerms } : {}),
    updatedAt: new Date(),
  }).where(eq(horseSearchAgreementsTable.horseSearchId, id)).returning();
  if (!updated) return res.status(404).json({ error: "No agreement found" });
  return res.json(updated);
});

router.delete("/:id/agreement", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  const result = await db.update(horseSearchAgreementsTable)
    .set({ status: "voided", updatedAt: new Date() })
    .where(eq(horseSearchAgreementsTable.horseSearchId, id)).returning();
  if (!result.length) return res.status(404).json({ error: "No agreement found" });
  return res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════════
// BILL OF SALE — admin routes
// ═══════════════════════════════════════════════════════════════════

router.get("/:id/search-contract", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  const [contract] = await db
    .select().from(horseSearchContractsTable)
    .where(eq(horseSearchContractsTable.horseSearchId, id))
    .orderBy(desc(horseSearchContractsTable.createdAt)).limit(1);
  if (!contract) return res.status(404).json({ error: "No contract found" });
  return res.json(contract);
});

router.post("/:id/search-contract", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  const [hs] = await db.select().from(horseSearchesTable).where(eq(horseSearchesTable.id, id));
  if (!hs) return res.status(404).json({ error: "Horse search not found" });

  const {
    horseName, salesPrice, holdingDepositAmount, horseDescription, customClauses,
    sellerName, sellerEmail, sellerAddress, sellerPhone,
    sellerBankAccountName, sellerBankBsb, sellerBankAccount,
    buyerName, buyerEmail, buyerAddress, buyerPhone,
  } = req.body as Record<string, string | undefined>;

  const token = randomUUID();

  await db.update(horseSearchContractsTable)
    .set({ status: "voided", updatedAt: new Date() })
    .where(eq(horseSearchContractsTable.horseSearchId, id));

  const [contract] = await db.insert(horseSearchContractsTable).values({
    horseSearchId: id, token, status: "pending",
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
  }).returning();

  return res.status(201).json(contract);
});

router.patch("/:id/search-contract", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  const {
    horseName, salesPrice, holdingDepositAmount, horseDescription, customClauses,
    sellerName, sellerEmail, sellerAddress, sellerPhone,
    sellerBankAccountName, sellerBankBsb, sellerBankAccount,
    buyerName, buyerEmail, buyerAddress, buyerPhone,
  } = req.body as Record<string, string | undefined>;

  const [updated] = await db.update(horseSearchContractsTable).set({
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
  }).where(eq(horseSearchContractsTable.horseSearchId, id)).returning();
  if (!updated) return res.status(404).json({ error: "No contract found" });
  return res.json(updated);
});

router.delete("/:id/search-contract", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  const result = await db.update(horseSearchContractsTable)
    .set({ status: "voided", updatedAt: new Date() })
    .where(eq(horseSearchContractsTable.horseSearchId, id)).returning();
  if (!result.length) return res.status(404).json({ error: "No contract found" });
  return res.json({ ok: true });
});

export default router;
