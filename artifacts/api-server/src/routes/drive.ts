import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  driveSettingsTable,
  submissionsTable,
  eoisTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  testDriveConnection,
  createDriveFolder,
  createGoogleDoc,
  safeDriveName,
  formatDateTime,
  buildEoiDocTitle,
  formatEoiAsHtml,
} from "../lib/googleDrive.js";

const router: IRouter = Router();

async function getSettings() {
  const [settings] = await db.select().from(driveSettingsTable).limit(1);
  return settings ?? null;
}

// ── GET /api/drive/settings ────────────────────────────────────────────────
router.get("/drive/settings", async (req, res) => {
  const settings = await getSettings();
  res.json(settings ?? { sellerFolderParentId: null, isConnected: false });
});

// ── POST /api/drive/settings ───────────────────────────────────────────────
router.post("/drive/settings", async (req, res) => {
  const { sellerFolderParentId } = req.body as { sellerFolderParentId: string };
  if (!sellerFolderParentId?.trim()) {
    return res.status(400).json({ error: "sellerFolderParentId is required" });
  }
  const existing = await getSettings();
  if (existing) {
    const [updated] = await db
      .update(driveSettingsTable)
      .set({ sellerFolderParentId: sellerFolderParentId.trim(), updatedAt: new Date() })
      .where(eq(driveSettingsTable.id, existing.id))
      .returning();
    res.json(updated);
  } else {
    const [created] = await db
      .insert(driveSettingsTable)
      .values({ sellerFolderParentId: sellerFolderParentId.trim() })
      .returning();
    res.json(created);
  }
});

// ── POST /api/drive/test ───────────────────────────────────────────────────
router.post("/drive/test", async (req, res) => {
  try {
    const result = await testDriveConnection();
    const existing = await getSettings();
    const now = new Date();
    if (existing) {
      await db.update(driveSettingsTable)
        .set({ isConnected: true, lastTestedAt: now, lastTestError: null, updatedAt: now })
        .where(eq(driveSettingsTable.id, existing.id));
    } else {
      await db.insert(driveSettingsTable).values({ isConnected: true, lastTestedAt: now });
    }
    res.json({ ok: true, email: result.email });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    req.log.error({ err }, "Drive connection test failed");
    const existing = await getSettings();
    const now = new Date();
    if (existing) {
      await db.update(driveSettingsTable)
        .set({ isConnected: false, lastTestedAt: now, lastTestError: msg, updatedAt: now })
        .where(eq(driveSettingsTable.id, existing.id));
    }
    res.status(500).json({ ok: false, error: msg });
  }
});

// ── POST /api/drive/submissions/:id/create-folder ─────────────────────────
// Creates the three-subfolder structure for an approved horse in Drive
router.post("/drive/submissions/:id/create-folder", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const settings = await getSettings();
  if (!settings?.sellerFolderParentId) {
    return res.status(400).json({ error: "Google Drive not configured. Set the Seller Folders ID first." });
  }

  const [submission] = await db
    .select()
    .from(submissionsTable)
    .where(eq(submissionsTable.id, id));
  if (!submission) return res.status(404).json({ error: "Submission not found" });

  if (submission.driveFolderId) {
    return res.json({
      message: "Drive folder already exists",
      driveFolderId: submission.driveFolderId,
      driveFolderLink: submission.driveFolderLink,
    });
  }

  const horseName = submission.horseName ?? `Submission ${id}`;
  const safeName = safeDriveName(horseName);

  try {
    await db.update(submissionsTable)
      .set({ driveSetupStatus: "creating" })
      .where(eq(submissionsTable.id, id));

    // 1. Create the main horse folder inside SELLER FOLDERS
    const horseFolder = await createDriveFolder(
      `${safeName} - Seller Folder`,
      settings.sellerFolderParentId
    );

    // 2. Create the three subfolders inside the horse folder
    const [portfolio, documents, eoiForms] = await Promise.all([
      createDriveFolder(`1. ${safeName} - Portfolio`, horseFolder.id),
      createDriveFolder(`2. Documents`, horseFolder.id),
      createDriveFolder(`3. EOI Viewer Forms`, horseFolder.id),
    ]);

    // 3. Persist all folder IDs
    await db.update(submissionsTable).set({
      driveFolderId: horseFolder.id,
      driveFolderLink: horseFolder.webViewLink,
      drivePortfolioFolderId: portfolio.id,
      driveDocumentsFolderId: documents.id,
      driveEoiFormsFolderId: eoiForms.id,
      driveSetupStatus: "done",
      driveSetupError: null,
    }).where(eq(submissionsTable.id, id));

    res.json({
      driveFolderId: horseFolder.id,
      driveFolderLink: horseFolder.webViewLink,
      drivePortfolioFolderId: portfolio.id,
      driveDocumentsFolderId: documents.id,
      driveEoiFormsFolderId: eoiForms.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    req.log.error({ err }, "Failed to create Drive folder structure");
    await db.update(submissionsTable)
      .set({ driveSetupStatus: "failed", driveSetupError: msg })
      .where(eq(submissionsTable.id, id));
    res.status(500).json({ error: msg });
  }
});

// ── POST /api/drive/eois/:id/backup ───────────────────────────────────────
// Backs up an EOI as a Google Doc, filed into the matching horse folder if found
router.post("/drive/eois/:id/backup", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const settings = await getSettings();
  if (!settings?.sellerFolderParentId) {
    return res.status(400).json({ error: "Google Drive not configured. Set the Seller Folders ID first." });
  }

  const [eoi] = await db.select().from(eoisTable).where(eq(eoisTable.id, id));
  if (!eoi) return res.status(404).json({ error: "EOI not found" });

  if (eoi.driveFileId) {
    return res.json({
      message: "Already backed up",
      driveFileId: eoi.driveFileId,
      driveDocLink: eoi.driveDocLink,
    });
  }

  try {
    await db.update(eoisTable)
      .set({ driveBackupStatus: "backing_up" })
      .where(eq(eoisTable.id, id));

    // Find the matched horse's EOI Forms folder (if submission is linked or matched by name)
    let targetFolderId: string | null = null;

    if (eoi.submissionId) {
      const [sub] = await db.select().from(submissionsTable).where(eq(submissionsTable.id, eoi.submissionId));
      targetFolderId = sub?.driveEoiFormsFolderId ?? null;
    }

    if (!targetFolderId && eoi.horseName) {
      const submissions = await db
        .select()
        .from(submissionsTable)
        .where(eq(submissionsTable.horseName, eoi.horseName));
      const match = submissions.find(s => s.driveEoiFormsFolderId);
      targetFolderId = match?.driveEoiFormsFolderId ?? null;
    }

    // Fall back to SELLER FOLDERS root if no horse folder is set up yet
    if (!targetFolderId) {
      targetFolderId = settings.sellerFolderParentId;
    }

    const buyerName = `${eoi.buyerFirstName} ${eoi.buyerSurname}`;
    const title = buildEoiDocTitle(eoi.horseName, buyerName, eoi.createdAt);
    const html = formatEoiAsHtml({
      id: eoi.id,
      horseName: eoi.horseName,
      buyerFirstName: eoi.buyerFirstName,
      buyerSurname: eoi.buyerSurname,
      buyerEmail: eoi.buyerEmail,
      buyerPhone: eoi.buyerPhone,
      buyerLocation: eoi.buyerLocation,
      formData: eoi.formData as Record<string, unknown>,
      createdAt: eoi.createdAt,
    });

    const doc = await createGoogleDoc(title, html, targetFolderId);

    await db.update(eoisTable).set({
      driveFileId: doc.id,
      driveDocLink: doc.webViewLink,
      driveBackupStatus: "backed_up",
      driveBackupError: null,
      driveBackedUpAt: new Date(),
    }).where(eq(eoisTable.id, id));

    res.json({ driveFileId: doc.id, driveDocLink: doc.webViewLink });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    req.log.error({ err }, "Failed to backup EOI to Drive");
    await db.update(eoisTable)
      .set({ driveBackupStatus: "failed", driveBackupError: msg })
      .where(eq(eoisTable.id, id));
    res.status(500).json({ error: msg });
  }
});

export default router;
