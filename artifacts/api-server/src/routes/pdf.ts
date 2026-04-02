import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { submissionsTable, mediaFilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import PDFDocument from "pdfkit";

const router: IRouter = Router();

const NAVY = "#24384e";
const NAVY_LIGHT = "#c5d5e3";
const RULE = "#dde3ea";
const TEXT = "#1a1a1a";
const MUTED = "#666666";
const PAGE_MARGIN = 50;

function sanitiseFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, "_").replace(/_+/g, "_").slice(0, 50);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value).trim();
}

function stripHH(height: string | null | undefined): string {
  if (!height) return "";
  return height.toString().replace(/hh$/i, "").trim();
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
    .text(title.toUpperCase(), PAGE_MARGIN + 8, rectY + 6, {
      width: pageW - 16,
      lineBreak: false,
    });

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
    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .fillColor(NAVY)
      .text(label, PAGE_MARGIN, startY, { width: labelW });
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor(TEXT)
      .text(value, PAGE_MARGIN, doc.y, { width: valueW });
  } else {
    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .fillColor(NAVY)
      .text(label, PAGE_MARGIN, startY, { width: labelW });
    const afterLabel = doc.y;

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor(TEXT)
      .text(value, PAGE_MARGIN + labelW + 12, startY, { width: valueW });
    const afterValue = doc.y;

    doc.y = Math.max(afterLabel, afterValue);
  }

  doc
    .moveTo(PAGE_MARGIN, doc.y + 3)
    .lineTo(doc.page.width - PAGE_MARGIN, doc.y + 3)
    .strokeColor(RULE)
    .lineWidth(0.5)
    .stroke();
  doc.y += 8;
}

const FORM_SECTIONS: Array<{
  title: string;
  fields: Array<{ label: string; key: string; wide?: boolean }>;
}> = [
  {
    title: "Contact Details",
    fields: [
      { label: "First Name", key: "firstName" },
      { label: "Last Name / Surname", key: "secondName" },
      { label: "Email", key: "email" },
      { label: "Phone", key: "phoneNumber" },
      { label: "Street Address", key: "streetAddress" },
      { label: "Suburb / Town / State / Postcode", key: "suburbTownStatePostcode" },
    ],
  },
  {
    title: "Horse Details",
    fields: [
      { label: "Horse Name", key: "horseName" },
      { label: "Breed", key: "breed" },
      { label: "Age", key: "age" },
      { label: "Height", key: "height" },
      { label: "Gender / Sex", key: "gender" },
      { label: "Colour & Markings", key: "colour" },
      { label: "Registrations / Brand", key: "registrations" },
    ],
  },
  {
    title: "Disciplines & Competition",
    fields: [
      { label: "Disciplines", key: "disciplines" },
      { label: "Currently Competing", key: "currentlyCompeting" },
      { label: "Competition History", key: "competitionHistory" },
      { label: "Competition History (Detail)", key: "competitionHistoryAdditionalInfo", wide: true },
      { label: "Needs Work To Improve", key: "needsWorkToImprove", wide: true },
    ],
  },
  {
    title: "Education & Training",
    fields: [
      { label: "General Education", key: "generalEducation" },
      { label: "Education Detail", key: "educationAdditionalInfo", wide: true },
      { label: "Skills", key: "skills", wide: true },
      { label: "Fitness Level", key: "fitnessLevel" },
    ],
  },
  {
    title: "Under Saddle",
    fields: [
      { label: "Under Saddle Summary", key: "underSaddle", wide: true },
      { label: "Under Saddle Detail", key: "underSaddleAdditionalInfo", wide: true },
      { label: "Gear / Tack Needs", key: "gearTackNeeds", wide: true },
    ],
  },
  {
    title: "Character & Handling",
    fields: [
      { label: "Handling Behaviour", key: "handlingBehaviour", wide: true },
      { label: "Vices or Quirks", key: "vicesOrQuirks", wide: true },
      { label: "Vices Detail", key: "vicesAdditionalInfo", wide: true },
      { label: "Behaviour Out of Work", key: "behaviourInOutOfWork", wide: true },
    ],
  },
  {
    title: "Management",
    fields: [
      { label: "Management", key: "management" },
      { label: "Management Detail", key: "managementAdditionalInfo", wide: true },
      { label: "Farrier", key: "farrier" },
      { label: "Farrier Detail", key: "farrierAdditionalInfo", wide: true },
      { label: "Feeding", key: "feeding" },
      { label: "Feeding Detail", key: "feedingAdditionalInfo", wide: true },
    ],
  },
  {
    title: "Health & Veterinary",
    fields: [
      { label: "Vaccinated For", key: "vaccinatedFor" },
      { label: "Last Vaccination Date", key: "lastVaccinationDate" },
      { label: "Last Dental Date", key: "lastDentalDate" },
      { label: "Dental Detail", key: "dentalAdditionalInfo", wide: true },
      { label: "Vet Checks", key: "vetChecks" },
      { label: "Medical / Management Issues", key: "medicalManagementIssues", wide: true },
      { label: "Medical Detail", key: "medicalAdditionalInfo", wide: true },
    ],
  },
  {
    title: "Buyer / Rider Suitability",
    fields: [
      { label: "Ideal Home", key: "idealHome", wide: true },
      { label: "Minimum Rider Level", key: "minimumRiderLevel", wide: true },
      { label: "Rider Suitability", key: "riderSuitabilityExtra", wide: true },
      { label: "Suitability Notes", key: "riderSuitabilityVariesInfo", wide: true },
      { label: "Horse Requires", key: "horseRequires", wide: true },
    ],
  },
  {
    title: "Listing & Sale",
    fields: [
      { label: "Preferred Sales Price", key: "preferredSalesPrice" },
      { label: "Reason for Sale", key: "reasonForSale", wide: true },
      { label: "Listing Service Type", key: "listingServiceType" },
      { label: "Additional Marketing", key: "additionalMarketing" },
      { label: "Photos / Video Commitment", key: "photosVideoCommitment" },
    ],
  },
  {
    title: "Declaration",
    fields: [
      { label: "General Terms Agreed", key: "generalTermsAgreed" },
      { label: "Declaration", key: "declaration18" },
      { label: "Signature", key: "signature" },
      { label: "Digital Signature Confirmation", key: "digitalSignatureConfirmation", wide: true },
    ],
  },
];

const KNOWN_KEYS = new Set([
  ...FORM_SECTIONS.flatMap((s) => s.fields.map((f) => f.key)),
  "agreeToDeclaration",
  "videoLinks",
]);

router.get("/submissions/:id/pdf", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const [submission] = await db
    .select()
    .from(submissionsTable)
    .where(eq(submissionsTable.id, id));

  if (!submission) return res.status(404).json({ error: "Submission not found" });

  const media = await db
    .select()
    .from(mediaFilesTable)
    .where(eq(mediaFilesTable.submissionId, id));

  const formData = (submission.formData ?? {}) as Record<string, unknown>;

  const clientName =
    submission.sellerName ??
    [formData["firstName"], formData["secondName"]].filter(Boolean).join(" ") ??
    "Client";
  const horseName = submission.horseName ?? (formData["horseName"] as string) ?? "Horse";
  const safeName = `${sanitiseFilename(clientName)}_${sanitiseFilename(horseName)}_Submission.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);

  const doc = new PDFDocument({
    margin: PAGE_MARGIN,
    size: "A4",
    autoFirstPage: true,
    info: {
      Title: `${clientName} — ${horseName} Seller Submission`,
      Author: "Performance Horse Sales",
    },
  });

  doc.pipe(res);

  const pageW = doc.page.width - PAGE_MARGIN * 2;

  // ── Header bar ───────────────────────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 72).fill(NAVY);

  doc
    .fillColor("white")
    .fontSize(18)
    .font("Helvetica-Bold")
    .text("Performance Horse Sales", PAGE_MARGIN, 18, { align: "center", width: pageW });

  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor(NAVY_LIGHT)
    .text("Official Seller Submission Form", PAGE_MARGIN, 44, { align: "center", width: pageW });

  doc.y = 90;

  // ── Horse summary ─────────────────────────────────────────────────────────────
  const rawHeight = stripHH(submission.height ?? (formData["height"] as string));
  const displayHeight = rawHeight ? `${rawHeight}hh` : null;

  const line1Parts = [
    submission.breed ?? (formData["breed"] as string),
    submission.sex ?? (formData["gender"] as string),
    submission.age ? `${submission.age}` : (formData["age"] as string),
    displayHeight,
    submission.colour ?? (formData["colour"] as string),
  ].filter(Boolean);

  const line2Parts = [
    submission.location ?? (formData["suburbTownStatePostcode"] as string),
    submission.askingPrice ?? (formData["preferredSalesPrice"] as string),
  ].filter(Boolean);

  doc
    .fillColor(NAVY)
    .fontSize(17)
    .font("Helvetica-Bold")
    .text(horseName, PAGE_MARGIN, doc.y, { width: pageW });

  doc.moveDown(0.15);

  if (line1Parts.length > 0) {
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(TEXT)
      .text(line1Parts.join("  •  "), PAGE_MARGIN, doc.y, { width: pageW });
    doc.moveDown(0.25);
  }

  if (line2Parts.length > 0) {
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(MUTED)
      .text(line2Parts.join("     |     "), PAGE_MARGIN, doc.y, { width: pageW });
    doc.moveDown(0.25);
  }

  doc
    .moveTo(PAGE_MARGIN, doc.y + 4)
    .lineTo(doc.page.width - PAGE_MARGIN, doc.y + 4)
    .strokeColor(NAVY)
    .lineWidth(1.5)
    .stroke();

  doc.y += 12;

  // ── Submission metadata strip ─────────────────────────────────────────────────
  const dateStr = new Date(submission.createdAt).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor(MUTED)
    .text(
      `Submitted by: ${clientName}   |   Date: ${dateStr}   |   Submission ID: #${submission.id}   |   Status: ${submission.status.replace(/_/g, " ").toUpperCase()}`,
      PAGE_MARGIN,
      doc.y,
      { align: "center", width: pageW }
    );

  doc.moveDown(0.8);

  // ── Form sections ─────────────────────────────────────────────────────────────
  for (const section of FORM_SECTIONS) {
    const fieldsWithData = section.fields.filter((f) => {
      const val = formData[f.key];
      return val !== undefined && val !== null && String(val).trim() !== "";
    });
    if (fieldsWithData.length === 0) continue;

    drawSectionHeader(doc, section.title);
    for (const field of fieldsWithData) {
      const rawVal = formData[field.key];
      const strVal = String(rawVal ?? "");
      // Signature drawn as base64 image — embed it in the PDF
      if (field.key === "signature" && strVal.startsWith("data:image")) {
        if (doc.y > doc.page.height - 120) doc.addPage();
        doc
          .fontSize(8)
          .font("Helvetica-Bold")
          .fillColor(NAVY)
          .text("Signature", PAGE_MARGIN, doc.y);
        doc.moveDown(0.3);
        const base64Data = strVal.split(",")[1];
        if (base64Data) {
          const imgBuf = Buffer.from(base64Data, "base64");
          doc.image(imgBuf, PAGE_MARGIN, doc.y, { height: 60, fit: [200, 60] });
          doc.y += 70;
          doc
            .moveTo(PAGE_MARGIN, doc.y)
            .lineTo(doc.page.width - PAGE_MARGIN, doc.y)
            .strokeColor(RULE)
            .lineWidth(0.5)
            .stroke();
          doc.y += 8;
        }
      } else {
        drawField(doc, field.label, formatValue(rawVal), { wide: field.wide });
      }
    }
  }

  // ── Unknown / extra fields ────────────────────────────────────────────────────
  const extraFields = Object.entries(formData).filter(
    ([k, v]) =>
      !KNOWN_KEYS.has(k) &&
      v !== null &&
      v !== undefined &&
      String(v).trim() !== "" &&
      !k.startsWith("_")
  );

  if (extraFields.length > 0) {
    drawSectionHeader(doc, "Additional Submitted Data");
    for (const [key, value] of extraFields) {
      const label = key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (s) => s.toUpperCase())
        .trim();
      drawField(doc, label, formatValue(value), { wide: true });
    }
  }

  // ── Video links from form ─────────────────────────────────────────────────────
  const videoLinks = String(formData["videoLinks"] || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (videoLinks.length > 0) {
    drawSectionHeader(doc, "Video Links (Provided by Seller)");
    for (const link of videoLinks) {
      drawField(doc, "Link", link, { wide: true });
    }
  }

  // ── Uploaded media ────────────────────────────────────────────────────────────
  if (media.length > 0) {
    drawSectionHeader(doc, "Uploaded Media");
    const photos = media.filter((m) => m.mediaType === "photo");
    const videos = media.filter((m) => m.mediaType === "video");
    const docs = media.filter((m) => m.mediaType === "document");

    if (photos.length > 0)
      drawField(doc, `Photos (${photos.length})`, photos.map((m) => m.originalName).join(", "), { wide: true });
    if (videos.length > 0)
      drawField(doc, `Videos (${videos.length})`, videos.map((m) => m.originalName).join(", "), { wide: true });
    if (docs.length > 0)
      drawField(doc, `Documents (${docs.length})`, docs.map((m) => m.originalName).join(", "), { wide: true });
  }

  // ── Footer on every page ──────────────────────────────────────────────────────
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const footerY = doc.page.height - 36;
    doc.rect(0, footerY, doc.page.width, 36).fill(NAVY);
    doc
      .fillColor(NAVY_LIGHT)
      .fontSize(7)
      .font("Helvetica")
      .text(
        `Performance Horse Sales  |  performancehorsesales.com.au  |  Confidential — Internal Use Only  |  Page ${i + 1} of ${range.count}`,
        PAGE_MARGIN,
        footerY + 13,
        { align: "center", width: pageW }
      );
  }

  doc.end();
});

export default router;
