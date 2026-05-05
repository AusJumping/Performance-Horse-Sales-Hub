import { ReplitConnectors } from "@replit/connectors-sdk";

interface DriveFile {
  id: string;
  name: string;
  webViewLink: string;
}

function getConnectors() {
  return new ReplitConnectors();
}

export async function testDriveConnection(): Promise<{ email: string }> {
  const connectors = getConnectors();
  const response = await connectors.proxy(
    "google-drive",
    "/drive/v3/about?fields=user",
    { method: "GET" }
  );
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Drive connection failed: ${response.status} — ${err}`);
  }
  const data = await response.json() as { user: { emailAddress: string } };
  return { email: data.user?.emailAddress ?? "unknown" };
}

export async function createDriveFolder(
  name: string,
  parentFolderId: string
): Promise<DriveFile> {
  const connectors = getConnectors();
  const response = await connectors.proxy(
    "google-drive",
    "/drive/v3/files?fields=id,name,webViewLink",
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
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to create folder "${name}": ${response.status} — ${err}`);
  }
  return response.json() as Promise<DriveFile>;
}

export async function createGoogleDoc(
  title: string,
  htmlContent: string,
  parentFolderId: string
): Promise<DriveFile> {
  const connectors = getConnectors();
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

  const response = await connectors.proxy(
    "google-drive",
    "/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to create doc "${title}": ${response.status} — ${err}`);
  }
  return response.json() as Promise<DriveFile>;
}

export async function uploadFileToDrive(
  name: string,
  mimeType: string,
  fileBuffer: Buffer,
  parentFolderId: string
): Promise<DriveFile> {
  const connectors = getConnectors();
  const boundary = `phs_media_${Date.now()}`;
  const metadata = JSON.stringify({ name, mimeType, parents: [parentFolderId] });

  const headerBuf = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
  );
  const footerBuf = Buffer.from(`\r\n--${boundary}--`);
  const body = Buffer.concat([headerBuf, fileBuffer, footerBuf]);

  const response = await connectors.proxy(
    "google-drive",
    "/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body: body as unknown as string,
    }
  );
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to upload "${name}": ${response.status} — ${err}`);
  }
  return response.json() as Promise<DriveFile>;
}

export function safeDriveName(str: string): string {
  return str
    .replace(/[\/\\:*?"<>|]/g, " ")
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

export function buildEoiDocTitle(viewerNumber: number, buyerFirstName: string, buyerSurname: string): string {
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
  const f = (key: string) => {
    const v = eoi.formData[key];
    return v !== null && v !== undefined && v !== "" ? String(v) : null;
  };

  const rows = Object.entries(eoi.formData)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => {
      const label = k.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
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
