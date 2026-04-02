import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { submissionsTable, mediaFilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import PDFDocument from "pdfkit";

const router: IRouter = Router();

const NAVY = "#24384e";
const LIGHT_GREY = "#f5f5f5";
const MID_GREY = "#888888";
const DARK = "#222222";

function sanitiseFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, "_").replace(/_+/g, "_").slice(0, 50);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function drawSectionHeader(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(0.6);
  doc
    .rect(doc.x, doc.y, doc.page.width - doc.page.margins.left - doc.page.margins.right, 20)
    .fill(NAVY);
  doc
    .fillColor("white")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text(title.toUpperCase(), doc.page.margins.left + 6, doc.y - 17, {
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 12,
    });
  doc.fillColor(DARK).moveDown(0.8);
}

function drawField(doc: PDFKit.PDFDocument, label: string, value: string) {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const labelWidth = 180;
  const valueWidth = pageWidth - labelWidth - 10;
  const startX = doc.page.margins.left;
  const startY = doc.y;

  doc
    .fontSize(8)
    .font("Helvetica-Bold")
    .fillColor(NAVY)
    .text(label, startX, startY, { width: labelWidth, continued: false });

  const labelHeight = doc.y - startY;

  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor(DARK)
    .text(value, startX + labelWidth + 10, startY, { width: valueWidth });

  const valueHeight = doc.y - startY;
  const rowHeight = Math.max(labelHeight, valueHeight);

  doc.y = startY + rowHeight + 4;
}

const FORM_SECTIONS: Array<{
  title: string;
  fields: Array<{ label: string; key: string }>;
}> = [
  {
    title: "Contact Details",
    fields: [
      { label: "First Name", key: "firstName" },
      { label: "Last Name", key: "lastName" },
      { label: "Email", key: "email" },
      { label: "Phone", key: "phone" },
      { label: "Location", key: "location" },
    ],
  },
  {
    title: "Listing Service",
    fields: [
      { label: "Service Agreed", key: "listingServiceAgreed" },
      { label: "Asking Price", key: "askingPrice" },
      { label: "Price Notes", key: "priceNotes" },
    ],
  },
  {
    title: "Horse Details",
    fields: [
      { label: "Horse Name", key: "horseName" },
      { label: "Breed", key: "breed" },
      { label: "Age", key: "age" },
      { label: "Height", key: "height" },
      { label: "Sex", key: "sex" },
      { label: "Colour / Markings", key: "colour" },
      { label: "Sire", key: "sire" },
      { label: "Dam", key: "dam" },
      { label: "Registered Name", key: "registeredName" },
      { label: "Registration / Brand", key: "registration" },
      { label: "Microchip", key: "microchip" },
    ],
  },
  {
    title: "Disciplines & Education",
    fields: [
      { label: "Disciplines", key: "disciplines" },
      { label: "Education Level", key: "educationLevel" },
      { label: "Competition History", key: "competitionHistory" },
      { label: "Rider Suitability", key: "riderSuitability" },
    ],
  },
  {
    title: "Character & Handling",
    fields: [
      { label: "General Character", key: "character" },
      { label: "Vices", key: "vices" },
      { label: "Handling", key: "handling" },
      { label: "Float Loading", key: "floatLoading" },
      { label: "Farrier", key: "farrier" },
      { label: "Feeding / Management", key: "feeding" },
    ],
  },
  {
    title: "Under Saddle",
    fields: [
      { label: "Gaits", key: "gaits" },
      { label: "Aids", key: "aids" },
      { label: "Contact / Outline", key: "contact" },
      { label: "Jumping", key: "jumping" },
      { label: "Ground Manners", key: "groundManners" },
    ],
  },
  {
    title: "Gear & Equipment",
    fields: [
      { label: "Gear Included", key: "gearIncluded" },
      { label: "Gear Notes", key: "gearNotes" },
    ],
  },
  {
    title: "Health & Veterinary",
    fields: [
      { label: "Vet Checks", key: "vetChecks" },
      { label: "Vaccinations", key: "vaccinations" },
      { label: "Medical History", key: "medicalHistory" },
      { label: "Current Soundness", key: "soundness" },
    ],
  },
  {
    title: "Additional Information",
    fields: [
      { label: "Why Selling", key: "whySelling" },
      { label: "Additional Notes", key: "additionalNotes" },
      { label: "Trial / Viewing", key: "trial" },
    ],
  },
  {
    title: "Declarations",
    fields: [
      { label: "Terms Agreed", key: "termsAgreed" },
      { label: "General Terms Agreed", key: "generalTermsAgreed" },
      { label: "Confirmation", key: "confirmation" },
    ],
  },
];

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

  const clientName = submission.sellerName ?? (formData["firstName"] as string) ?? "Client";
  const horseName = submission.horseName ?? (formData["horseName"] as string) ?? "Horse";
  const safeName = `${sanitiseFilename(clientName)}_${sanitiseFilename(horseName)}_Submission.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);

  const doc = new PDFDocument({
    margin: 50,
    size: "A4",
    info: {
      Title: `${clientName} — ${horseName} Seller Submission`,
      Author: "Performance Horse Sales",
    },
  });

  doc.pipe(res);

  // ── Cover header ────────────────────────────────────────────────────────────
  doc
    .rect(0, 0, doc.page.width, 90)
    .fill(NAVY);

  doc
    .fillColor("white")
    .fontSize(20)
    .font("Helvetica-Bold")
    .text("Performance Horse Sales", 50, 24, { align: "center" });

  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#c5d5e3")
    .text("Official Seller Submission Form", { align: "center" });

  doc.moveDown(2.2);

  // ── Horse summary box ────────────────────────────────────────────────────────
  const summaryY = doc.y;
  doc
    .rect(50, summaryY, doc.page.width - 100, 70)
    .fillAndStroke(LIGHT_GREY, "#dddddd");

  doc
    .fillColor(NAVY)
    .fontSize(16)
    .font("Helvetica-Bold")
    .text(horseName, 60, summaryY + 10, { width: doc.page.width - 120 });

  doc
    .fillColor(DARK)
    .fontSize(9)
    .font("Helvetica");

  const summaryLine1 = [
    submission.breed,
    submission.age ? `${submission.age} yo` : null,
    submission.sex,
    submission.colour,
    submission.height ? `${submission.height}hh` : null,
  ].filter(Boolean).join("  •  ");

  const summaryLine2 = [
    submission.location ? `Location: ${submission.location}` : null,
    submission.askingPrice ? `Asking Price: ${submission.askingPrice}` : null,
  ].filter(Boolean).join("     ");

  doc.text(summaryLine1, 60, summaryY + 34, { width: doc.page.width - 120 });
  doc.text(summaryLine2, 60, summaryY + 48, { width: doc.page.width - 120 });

  doc.y = summaryY + 82;

  // ── Submission metadata ──────────────────────────────────────────────────────
  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor(MID_GREY)
    .text(
      `Submitted by: ${clientName}   |   Date: ${new Date(submission.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}   |   Submission ID: #${submission.id}   |   Status: ${submission.status.replace(/_/g, " ").toUpperCase()}`,
      { align: "center" }
    );

  doc.moveDown(0.5);

  // ── Form sections ────────────────────────────────────────────────────────────
  for (const section of FORM_SECTIONS) {
    const fieldsWithData = section.fields.filter(
      (f) => formData[f.key] !== undefined && formData[f.key] !== null && formData[f.key] !== ""
    );
    if (fieldsWithData.length === 0) continue;

    drawSectionHeader(doc, section.title);
    for (const field of fieldsWithData) {
      drawField(doc, field.label, formatValue(formData[field.key]));
    }
  }

  // ── Catch-all for any unmapped formData keys ─────────────────────────────────
  const mappedKeys = new Set(FORM_SECTIONS.flatMap((s) => s.fields.map((f) => f.key)));
  const extraFields = Object.entries(formData).filter(
    ([k, v]) => !mappedKeys.has(k) && v !== null && v !== undefined && v !== "" && !k.startsWith("_")
  );
  if (extraFields.length > 0) {
    drawSectionHeader(doc, "Additional Submitted Data");
    for (const [key, value] of extraFields) {
      const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
      drawField(doc, label, formatValue(value));
    }
  }

  // ── Media summary ────────────────────────────────────────────────────────────
  if (media.length > 0) {
    drawSectionHeader(doc, "Uploaded Media");
    const photos = media.filter((m) => m.mediaType === "photo");
    const videos = media.filter((m) => m.mediaType === "video");
    const docs = media.filter((m) => m.mediaType === "document");

    if (photos.length > 0) drawField(doc, "Photos", photos.map((m) => m.originalName).join(", "));
    if (videos.length > 0) drawField(doc, "Videos", videos.map((m) => m.originalName).join(", "));
    if (docs.length > 0) drawField(doc, "Documents", docs.map((m) => m.originalName).join(", "));
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  const footerY = doc.page.height - 40;
  doc
    .rect(0, footerY, doc.page.width, 40)
    .fill(NAVY);
  doc
    .fillColor("#c5d5e3")
    .fontSize(7)
    .font("Helvetica")
    .text(
      "Performance Horse Sales Australia & New Zealand   |   performancehorsesales.com.au   |   Confidential — Internal Use Only",
      50,
      footerY + 14,
      { align: "center", width: doc.page.width - 100 }
    );

  doc.end();
});

export default router;
