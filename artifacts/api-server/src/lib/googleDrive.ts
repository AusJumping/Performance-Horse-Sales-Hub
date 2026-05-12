/**
 * Google Drive integration — OAuth 2.0 web server flow.
 * Uses Sally's refresh token stored in drive_settings table.
 * No Replit connectors — all auth is done via direct Google API calls.
 */
import { db } from "@workspace/db";
import { driveSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

interface DriveFile {
  id: string;
  name: string;
  webViewLink: string;
}

// ── Token management ──────────────────────────────────────────────────────────

async function getSettings() {
  const [settings] = await db.select().from(driveSettingsTable).limit(1);
  return settings ?? null;
}

/**
 * Returns a valid access token, refreshing from Google if expired.
 * Throws a clear error if Drive is not connected.
 */
export async function getAccessToken(): Promise<string> {
  const settings = await getSettings();
  if (!settings?.googleRefreshToken) {
    throw new Error("Google Drive is not connected. Go to Admin → Google Drive Setup and connect Sally's Google account.");
  }

  // Use cached token if still valid (with 60s buffer)
  if (
    settings.googleAccessToken &&
    settings.googleTokenExpiry &&
    new Date(settings.googleTokenExpiry).getTime() > Date.now() + 60_000
  ) {
    return settings.googleAccessToken;
  }

  // Refresh the access token
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: settings.googleRefreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Google token refresh failed: ${resp.status} — ${err}`);
  }

  const data = await resp.json() as { access_token: string; expires_in: number };
  const expiry = new Date(Date.now() + data.expires_in * 1000);

  await db
    .update(driveSettingsTable)
    .set({
      googleAccessToken: data.access_token,
      googleTokenExpiry: expiry,
      updatedAt: new Date(),
    })
    .where(eq(driveSettingsTable.id, settings.id));

  return data.access_token;
}

/**
 * Makes an authenticated request to the Google APIs.
 */
async function driveRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
}

// ── Drive API helpers ─────────────────────────────────────────────────────────

export async function testDriveConnection(): Promise<{ email: string }> {
  const resp = await driveRequest(
    "https://www.googleapis.com/drive/v3/about?fields=user"
  );
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Drive connection failed: ${resp.status} — ${err}`);
  }
  const data = await resp.json() as { user: { emailAddress: string } };
  return { email: data.user?.emailAddress ?? "unknown" };
}

export async function createDriveFolder(
  name: string,
  parentFolderId: string
): Promise<DriveFile> {
  const resp = await driveRequest(
    "https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentFolderId],
      }),
    }
  );
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Failed to create folder "${name}": ${resp.status} — ${err}`);
  }
  return resp.json() as Promise<DriveFile>;
}

export async function createGoogleDoc(
  title: string,
  htmlContent: string,
  parentFolderId: string
): Promise<DriveFile> {
  const boundary = `phs_boundary_${Date.now()}`;
  const metadata = JSON.stringify({
    name: title,
    mimeType: "application/vnd.google-apps.document",
    parents: [parentFolderId],
  });
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    metadata,
    `--${boundary}`,
    "Content-Type: text/html",
    "",
    htmlContent,
    `--${boundary}--`,
  ].join("\r\n");

  const resp = await driveRequest(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    }
  );
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Failed to create doc "${title}": ${resp.status} — ${err}`);
  }
  return resp.json() as Promise<DriveFile>;
}

export async function uploadFileToDrive(
  name: string,
  mimeType: string,
  fileBuffer: Buffer,
  parentFolderId: string
): Promise<DriveFile> {
  const boundary = `phs_media_${Date.now()}`;
  const metadata = JSON.stringify({ name, mimeType, parents: [parentFolderId] });

  const headerBuf = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
  );
  const footerBuf = Buffer.from(`\r\n--${boundary}--`);
  const body = Buffer.concat([headerBuf, fileBuffer, footerBuf]);

  const resp = await driveRequest(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body: body as unknown as BodyInit,
    }
  );
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Failed to upload "${name}": ${resp.status} — ${err}`);
  }
  return resp.json() as Promise<DriveFile>;
}

export async function exportDocAsPdf(
  docId: string,
  pdfName: string,
  parentFolderId: string
): Promise<DriveFile> {
  const exportResp = await driveRequest(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(docId)}/export?mimeType=application%2Fpdf`
  );
  if (!exportResp.ok) {
    const err = await exportResp.text();
    throw new Error(`Failed to export PDF: ${exportResp.status} — ${err}`);
  }
  const pdfBuffer = Buffer.from(await exportResp.arrayBuffer());
  return uploadFileToDrive(pdfName, "application/pdf", pdfBuffer, parentFolderId);
}

// ── Utility helpers ───────────────────────────────────────────────────────────

export function safeDriveName(str: string): string {
  return str
    .replace(/[/\\:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 120);
}

export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function formatDateTime(d: Date): string {
  return d.toISOString().slice(0, 16).replace("T", " ");
}

export function buildEoiDocTitle(
  viewerNumber: number,
  buyerFirstName: string,
  buyerSurname: string
): string {
  return safeDriveName(`V${viewerNumber}. ${buyerFirstName} ${buyerSurname}`);
}

export function formatEoiAsHtml(eoi: {
  id: number;
  horseName: string;
  buyerFirstName: string;
  buyerSurname: string;
  buyerEmail: string;
  buyerPhone: string;
  buyerLocation: string;
  formData: Record<string, unknown>;
  createdAt: Date;
}): string {
  const rows = Object.entries(eoi.formData)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => {
      const label = k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
      const val = typeof v === "object" ? JSON.stringify(v) : String(v);
      return `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;vertical-align:top;white-space:nowrap">${label}</td><td style="padding:4px 0">${val}</td></tr>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:24px">
  <h1 style="color:#24384e;border-bottom:2px solid #24384e;padding-bottom:8px">Expression of Interest</h1>
  <p style="color:#666;font-size:14px">Performance Horse Sales AU NZ — PHS App Record</p>

  <table style="margin-bottom:20px">
    <tr><td style="padding:4px 12px 4px 0;font-weight:bold">EOI Record #</td><td>${eoi.id}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;font-weight:bold">Submitted</td><td>${formatDateTime(eoi.createdAt)}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;font-weight:bold">Horse Interested In</td><td>${eoi.horseName}</td></tr>
  </table>

  <h2 style="color:#24384e">Buyer Details</h2>
  <table style="margin-bottom:20px">
    <tr><td style="padding:4px 12px 4px 0;font-weight:bold">Name</td><td>${eoi.buyerFirstName} ${eoi.buyerSurname}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;font-weight:bold">Email</td><td>${eoi.buyerEmail}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;font-weight:bold">Phone</td><td>${eoi.buyerPhone}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;font-weight:bold">Location</td><td>${eoi.buyerLocation}</td></tr>
  </table>

  <h2 style="color:#24384e">Full Form Responses</h2>
  <table style="margin-bottom:20px;width:100%">
    ${rows}
  </table>

  <p style="color:#999;font-size:12px;border-top:1px solid #eee;padding-top:12px">
    Generated by PHS App on ${formatDateTime(new Date())}. This document is a backup of the form submission stored in the PHS database.
  </p>
</body>
</html>`;
}
