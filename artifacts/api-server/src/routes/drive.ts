import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  driveSettingsTable,
  submissionsTable,
  eoisTable,
} from "@workspace/db";
import { eq, lte, and } from "drizzle-orm";
import {
  testDriveConnection,
  createDriveFolder,
  createGoogleDoc,
  exportDocAsPdf,
  uploadFileToDrive,
  safeDriveName,
  formatDateTime,
  buildEoiDocTitle,
  formatEoiAsHtml,
} from "../lib/googleDrive.js";
import { mediaFilesTable } from "@workspace/db";
import { ObjectStorageService } from "../lib/objectStorage.js";

const router: IRouter = Router();

// Temporary in-memory store for OAuth state values (CSRF protection)
const oauthStates = new Map<string, number>();

function generateState(): string {
  const state = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  oauthStates.set(state, Date.now());
  for (const [k, ts] of oauthStates.entries()) {
    if (Date.now() - ts > 600_000) oauthStates.delete(k);
  }
  return state;
}

async function getSettings() {
  const [settings] = await db.select().from(driveSettingsTable).limit(1);
  return settings ?? null;
}

// ── GET /api/drive/settings ────────────────────────────────────────────────
// Returns public Drive status — never exposes tokens
router.get("/settings", async (req, res) => {
  const settings = await getSettings();
  if (!settings) {
    return res.json({ isConnected: false, googleEmail: null, sellerFolderParentId: null });
  }
  res.json({
    id: settings.id,
    isConnected: settings.isConnected,
    googleEmail: settings.googleEmail ?? null,
    rootFolderId: settings.rootFolderId ?? null,
    rootFolderLink: settings.rootFolderLink ?? null,
    sellerFolderParentId: settings.sellerFolderParentId ?? null,
    sellerFolderLink: settings.sellerFolderLink ?? null,
    searchFolderParentId: settings.searchFolderParentId ?? null,
    searchFolderLink: settings.searchFolderLink ?? null,
    lastTestedAt: settings.lastTestedAt ?? null,
    lastTestError: settings.lastTestError ?? null,
  });
});

// ── GET /api/drive/auth ───────────────────────────────────────────────────
// Starts the Google OAuth flow — redirects browser to Google's consent screen
router.get("/auth", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return res.status(500).send("Google Drive credentials are not configured. Please contact the administrator.");
  }

  const state = generateState();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// ── GET /api/drive/auth/callback ──────────────────────────────────────────
// Google redirects here after user approves — exchanges code for tokens
router.get("/auth/callback", async (req, res) => {
  const { code, state, error } = req.query as Record<string, string>;

  if (error) {
    req.log.warn({ error }, "Google OAuth was denied");
    return res.redirect("/admin/drive?error=access_denied");
  }

  if (!state || !oauthStates.has(state)) {
    return res.redirect("/admin/drive?error=invalid_state");
  }
  oauthStates.delete(state);

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!;

  try {
    const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResp.ok) {
      const err = await tokenResp.text();
      throw new Error(`Token exchange failed: ${tokenResp.status} — ${err}`);
    }

    const tokens = await tokenResp.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    if (!tokens.refresh_token) {
      throw new Error("No refresh token returned. Please disconnect and try again.");
    }

    const userResp = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = userResp.ok
      ? await userResp.json() as { email?: string }
      : { email: undefined };

    const expiry = new Date(Date.now() + tokens.expires_in * 1000);
    const existing = await getSettings();
    const vals = {
      googleRefreshToken: tokens.refresh_token,
      googleAccessToken: tokens.access_token,
      googleTokenExpiry: expiry,
      googleEmail: userInfo.email ?? null,
      isConnected: true,
      lastTestedAt: new Date(),
      lastTestError: null,
      updatedAt: new Date(),
    };

    if (existing) {
      await db.update(driveSettingsTable).set(vals).where(eq(driveSettingsTable.id, existing.id));
    } else {
      await db.insert(driveSettingsTable).values(vals);
    }

    req.log.info({ email: userInfo.email }, "Google Drive connected successfully");
    res.redirect("/admin/drive?connected=true");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    req.log.error({ err }, "Google OAuth callback failed");
    res.redirect(`/admin/drive?error=${encodeURIComponent(msg)}`);
  }
});

// ── POST /api/drive/disconnect ────────────────────────────────────────────
router.post("/disconnect", async (req, res) => {
  const existing = await getSettings();
  if (!existing) return res.json({ ok: true });

  await db.update(driveSettingsTable).set({
    googleRefreshToken: null,
    googleAccessToken: null,
    googleTokenExpiry: null,
    googleEmail: null,
    isConnected: false,
    lastTestedAt: null,
    lastTestError: null,
    updatedAt: new Date(),
  }).where(eq(driveSettingsTable.id, existing.id));

  res.json({ ok: true });
});

// ── POST /api/drive/test ───────────────────────────────────────────────────
router.post("/test", async (req, res) => {
  try {
    const result = await testDriveConnection();
    const existing = await getSettings();
    const now = new Date();
    if (existing) {
      await db.update(driveSettingsTable)
        .set({ isConnected: true, googleEmail: result.email, lastTestedAt: now, lastTestError: null, updatedAt: now })
        .where(eq(driveSettingsTable.id, existing.id));
    } else {
      await db.insert(driveSettingsTable).values({ isConnected: true, googleEmail: result.email, lastTestedAt: now });
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

// ── POST /api/drive/settings/create-root-folder ───────────────────────────
router.post("/settings/create-root-folder", async (req, res) => {
  try {
    const rootFolder = await createDriveFolder("PHS App Folders", "root");
    const sellerFolder = await createDriveFolder("SELLER FOLDERS", rootFolder.id);

    const existing = await getSettings();
    let saved;
    const vals = {
      rootFolderId: rootFolder.id,
      rootFolderLink: rootFolder.webViewLink,
      sellerFolderParentId: sellerFolder.id,
      sellerFolderLink: sellerFolder.webViewLink,
      updatedAt: new Date(),
    };
    if (existing) {
      [saved] = await db.update(driveSettingsTable).set(vals).where(eq(driveSettingsTable.id, existing.id)).returning();
    } else {
      [saved] = await db.insert(driveSettingsTable).values(vals).returning();
    }
    res.json({
      rootFolderId: rootFolder.id,
      rootFolderLink: rootFolder.webViewLink,
      sellerFolderId: sellerFolder.id,
      sellerFolderLink: sellerFolder.webViewLink,
      settings: saved,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    req.log.error({ err }, "Failed to create root seller folder");
    res.status(500).json({ error: msg });
  }
});

// ── POST /api/drive/submissions/:id/create-folder ─────────────────────────
router.post("/submissions/:id/create-folder", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const settings = await getSettings();
  if (!settings?.sellerFolderParentId) {
    return res.status(400).json({ error: "Google Drive not configured. Set up the folder structure first." });
  }

  const [submission] = await db.select().from(submissionsTable).where(eq(submissionsTable.id, id));
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
    await db.update(submissionsTable).set({ driveSetupStatus: "creating" }).where(eq(submissionsTable.id, id));

    const horseFolder = await createDriveFolder(`${safeName} - Seller Folder`, settings.sellerFolderParentId);
    const [portfolio, documents, eoiForms] = await Promise.all([
      createDriveFolder(`1. ${safeName} - Portfolio`, horseFolder.id),
      createDriveFolder(`2. Documents`, horseFolder.id),
      createDriveFolder(`3. EOI Viewer Forms`, horseFolder.id),
    ]);

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

// ── POST /api/drive/submissions/:id/save-document ─────────────────────────
router.post("/submissions/:id/save-document", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const { docType, title, html } = req.body as {
    docType: "orc" | "horse_description" | "approval_pack" | "listing_agreement";
    title: string;
    html: string;
  };

  if (!docType || !title || !html) {
    return res.status(400).json({ error: "docType, title, and html are required" });
  }

  const [submission] = await db.select().from(submissionsTable).where(eq(submissionsTable.id, id));
  if (!submission) return res.status(404).json({ error: "Submission not found" });

  const portfolioTypes = ["orc", "horse_description"] as const;
  const isPortfolio = (portfolioTypes as readonly string[]).includes(docType);
  const folderId = isPortfolio ? submission.drivePortfolioFolderId : submission.driveDocumentsFolderId;

  if (!folderId) {
    const folderName = isPortfolio ? "Portfolio" : "Documents";
    return res.status(400).json({ error: `Drive ${folderName} folder not set up. Create the Drive folder for this submission first.` });
  }

  try {
    const doc = await createGoogleDoc(title, html, folderId);

    const updates: Record<string, string> = {};
    if (docType === "orc") updates.driveOrcDocLink = doc.webViewLink;
    if (docType === "horse_description") updates.driveHorseDescriptionDocLink = doc.webViewLink;
    if (docType === "approval_pack") updates.driveApprovalPackDocLink = doc.webViewLink;
    if (docType === "listing_agreement") updates.driveListingAgreementDocLink = doc.webViewLink;

    await db.update(submissionsTable).set(updates).where(eq(submissionsTable.id, id));

    let pdfLink: string | null = null;
    try {
      const pdf = await exportDocAsPdf(doc.id, `${title}.pdf`, folderId);
      pdfLink = pdf.webViewLink;
    } catch (pdfErr) {
      req.log.warn({ err: pdfErr }, "PDF export to Drive failed (non-fatal)");
    }

    res.json({ docId: doc.id, docLink: doc.webViewLink, pdfLink });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    req.log.error({ err }, "Failed to save document to Drive");
    res.status(500).json({ error: msg });
  }
});

// ── POST /api/drive/submissions/:id/sync-media ────────────────────────────
router.post("/submissions/:id/sync-media", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const [submission] = await db.select().from(submissionsTable).where(eq(submissionsTable.id, id));
  if (!submission) return res.status(404).json({ error: "Submission not found" });

  const portfolioFolderId = submission.drivePortfolioFolderId;
  if (!portfolioFolderId) {
    return res.status(400).json({ error: "Portfolio folder not set up. Create the Drive folder first." });
  }

  const mediaFiles = await db.select().from(mediaFilesTable).where(eq(mediaFilesTable.submissionId, id));
  const syncable = mediaFiles.filter(f => f.storagePath && (f.mediaType === "photo" || f.mediaType === "video"));

  if (syncable.length === 0) {
    return res.json({ synced: 0, failed: 0, message: "No media files to sync" });
  }

  const storage = new ObjectStorageService();
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const file of syncable) {
    try {
      const signedUrl = await storage.getObjectEntityDownloadURL(file.storagePath!, 600);
      const fileResp = await fetch(signedUrl);
      if (!fileResp.ok) throw new Error(`GCS download failed: ${fileResp.status}`);
      const buffer = Buffer.from(await fileResp.arrayBuffer());
      await uploadFileToDrive(file.originalName, file.mimeType, buffer, portfolioFolderId);
      synced++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      req.log.error({ err, fileId: file.id }, "Failed to sync media file to Drive");
      failed++;
      errors.push(`${file.originalName}: ${msg}`);
    }
  }

  await db.update(submissionsTable).set({ driveMediaSyncedAt: new Date() }).where(eq(submissionsTable.id, id));
  res.json({ synced, failed, errors });
});

// ── POST /api/drive/eois/:id/backup ───────────────────────────────────────
router.post("/eois/:id/backup", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const settings = await getSettings();
  if (!settings?.sellerFolderParentId) {
    return res.status(400).json({ error: "Google Drive not configured. Set up the folder structure first." });
  }

  const [eoi] = await db.select().from(eoisTable).where(eq(eoisTable.id, id));
  if (!eoi) return res.status(404).json({ error: "EOI not found" });

  if (eoi.driveFileId) {
    return res.json({ message: "Already backed up", driveFileId: eoi.driveFileId, driveDocLink: eoi.driveDocLink });
  }

  try {
    await db.update(eoisTable).set({ driveBackupStatus: "backing_up" }).where(eq(eoisTable.id, id));

    let targetFolderId: string | null = null;
    if (eoi.submissionId) {
      const [sub] = await db.select().from(submissionsTable).where(eq(submissionsTable.id, eoi.submissionId));
      targetFolderId = sub?.driveEoiFormsFolderId ?? null;
    }
    if (!targetFolderId && eoi.horseName) {
      const submissions = await db.select().from(submissionsTable).where(eq(submissionsTable.horseName, eoi.horseName));
      const match = submissions.find(s => s.driveEoiFormsFolderId);
      targetFolderId = match?.driveEoiFormsFolderId ?? null;
    }
    if (!targetFolderId) targetFolderId = settings.sellerFolderParentId;

    const allForHorse = await db.select({ id: eoisTable.id }).from(eoisTable).where(
      and(eq(eoisTable.horseName, eoi.horseName), lte(eoisTable.id, eoi.id))
    );
    const viewerNumber = allForHorse.length;

    const title = buildEoiDocTitle(viewerNumber, eoi.buyerFirstName, eoi.buyerSurname);
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
