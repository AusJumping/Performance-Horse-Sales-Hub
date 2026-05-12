export interface OrcDocumentData {
  horseName: string;
  breed?: string | null;
  sellerName?: string | null;
  askingPrice?: string | null;
  submissionId: number | string;
  generatedAt?: string | null;
  orcText: string;
}

interface OrcSection {
  number: string;
  title: string;
  content: string;
}

function parseOrcSections(text: string): OrcSection[] {
  const sectionPattern = /^(\d+)\.\s+([A-Z][A-Z\s&\/]+)/gm;
  const matches: Array<{ index: number; number: string; title: string }> = [];

  let m: RegExpExecArray | null;
  while ((m = sectionPattern.exec(text)) !== null) {
    matches.push({ index: m.index, number: m[1], title: m[2].trim() });
  }

  if (matches.length === 0) {
    return [{ number: "", title: "Owner Response Certificate", content: text }];
  }

  return matches.map((match, i) => {
    const start = match.index + `${match.number}. ${match.title}`.length;
    const end = i < matches.length - 1 ? matches[i + 1].index : text.length;
    const content = text.slice(start, end).trim();
    return { number: match.number, title: match.title, content };
  });
}

// Map indent character count → visual nesting level (0-based)
function indentLevel(raw: string): number {
  const spaces = raw.match(/^(\s*)/)?.[1] ?? "";
  const count = spaces.replace(/\t/g, "    ").length;
  if (count < 2) return 0;
  if (count < 4) return 1;
  if (count < 7) return 2;
  return 3;
}

function contentToHtml(content: string): string {
  const lines = content.split("\n");
  let html = "";

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;

    const trimmed = line.trimStart();
    const level = indentLevel(raw);

    const isBullet =
      trimmed.startsWith("- ") ||
      trimmed.startsWith("• ") ||
      trimmed.startsWith("* ");

    if (isBullet) {
      const text = trimmed.slice(2);
      // Level 0 → •  Level 1 → –  Level 2+ → ·
      const marker = level === 0 ? "•" : level === 1 ? "–" : "·";
      const cls = `bullet-row bullet-l${level}`;
      html += `<div class="${cls}"><span class="bullet">${marker}</span><span>${escapeHtml(text)}</span></div>`;
    } else {
      // Plain text line — indent if it was indented in source
      const cls = level > 0 ? `section-para section-para-l${level}` : "section-para";
      html += `<p class="${cls}">${escapeHtml(trimmed)}</p>`;
    }
  }

  return html || `<p class="not-provided">Not provided</p>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function generateOrcHtml(data: OrcDocumentData): string {
  const sections = parseOrcSections(data.orcText);

  const dateStr = data.generatedAt
    ? new Date(data.generatedAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

  const sectionsHtml = sections
    .map(
      (s) => `
    <div class="section">
      <div class="section-header">
        ${s.number ? `<span class="section-num">${s.number}</span>` : ""}
        <h2 class="section-title">${escapeHtml(s.title)}</h2>
      </div>
      <div class="section-content">${contentToHtml(s.content)}</div>
    </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>ORC — ${escapeHtml(data.horseName || "Horse")} — Performance Horse Sales</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: Georgia, 'Times New Roman', serif;
    background: #f0ede8;
    color: #1a1a1a;
    min-height: 100vh;
    padding: 0;
  }

  /* Screen-only print bar */
  .print-bar {
    position: sticky;
    top: 0;
    z-index: 100;
    background: #24384e;
    padding: 12px 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  }
  .print-bar-title {
    color: rgba(255,255,255,0.8);
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 13px;
    letter-spacing: 0.04em;
  }
  .print-btn {
    background: #fff;
    color: #24384e;
    border: none;
    border-radius: 5px;
    padding: 9px 24px;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    letter-spacing: 0.03em;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .print-btn:hover { background: #e8e4de; }
  .print-btn svg { width: 15px; height: 15px; }

  .page-wrap {
    max-width: 820px;
    margin: 40px auto 60px;
    background: #fff;
    box-shadow: 0 4px 32px rgba(0,0,0,0.13);
    border-radius: 4px;
    overflow: hidden;
  }

  /* Document header */
  .doc-header {
    background: #24384e;
    padding: 32px 48px 28px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
  }
  .doc-header-brand {
    color: #fff;
  }
  .brand-name {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0.04em;
    line-height: 1.2;
  }
  .brand-region {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 10px;
    font-weight: 400;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.6);
    margin-top: 3px;
  }
  .doc-header-right {
    text-align: right;
    color: rgba(255,255,255,0.85);
    font-family: 'Helvetica Neue', Arial, sans-serif;
  }
  .doc-type {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.55);
  }
  .doc-ref {
    font-size: 11px;
    color: rgba(255,255,255,0.45);
    margin-top: 6px;
  }

  /* Title band */
  .title-band {
    background: #f8f5f0;
    border-bottom: 2px solid #24384e;
    padding: 28px 48px 24px;
  }
  .horse-name {
    font-size: 30px;
    font-weight: 700;
    color: #24384e;
    line-height: 1.15;
    letter-spacing: -0.01em;
  }
  .horse-meta {
    margin-top: 8px;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 13px;
    color: #666;
    display: flex;
    flex-wrap: wrap;
    gap: 0 20px;
  }
  .horse-meta-item::before {
    content: "";
  }
  .horse-meta-item + .horse-meta-item {
    border-left: 1px solid #ccc;
    padding-left: 20px;
  }

  /* Notice bar */
  .notice-bar {
    background: #fdf8ef;
    border-bottom: 1px solid #e8dfc8;
    padding: 10px 48px;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px;
    color: #8b6914;
    letter-spacing: 0.02em;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .notice-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #c89e30;
    flex-shrink: 0;
  }

  /* Sections */
  .sections-wrap {
    padding: 0 48px 40px;
  }

  .section {
    margin-top: 32px;
    padding-bottom: 28px;
    border-bottom: 1px solid #e8e4de;
  }
  .section:last-child {
    border-bottom: none;
  }

  .section-header {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 12px;
  }
  .section-num {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px;
    font-weight: 700;
    color: #24384e;
    background: #e8f0f8;
    border-radius: 3px;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    letter-spacing: 0;
  }
  .section-title {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #24384e;
    padding-top: 2px;
  }

  .section-content {
    padding-left: 16px;
  }

  /* Bullet rows — all levels share base styles */
  .bullet-row {
    display: flex;
    gap: 9px;
    margin-bottom: 4px;
    line-height: 1.6;
    font-size: 14px;
    color: #2a2a2a;
  }
  .bullet {
    flex-shrink: 0;
    margin-top: 1px;
    line-height: 1.5;
    user-select: none;
  }

  /* Level 0 — top-level bullet */
  .bullet-l0 { padding-left: 0; }
  .bullet-l0 .bullet { color: #24384e; font-size: 15px; }

  /* Level 1 — sub-bullet */
  .bullet-l1 { padding-left: 20px; }
  .bullet-l1 .bullet { color: #5a7a9a; font-size: 13px; margin-top: 3px; }

  /* Level 2 — sub-sub-bullet */
  .bullet-l2 { padding-left: 40px; }
  .bullet-l2 .bullet { color: #8a9aaa; font-size: 12px; margin-top: 4px; }

  /* Level 3 — deepest */
  .bullet-l3 { padding-left: 60px; }
  .bullet-l3 .bullet { color: #aaa; font-size: 11px; margin-top: 4px; }

  .section-para {
    font-size: 14px;
    line-height: 1.7;
    margin-bottom: 4px;
    color: #2a2a2a;
  }
  .section-para-l1 { padding-left: 20px; }
  .section-para-l2 { padding-left: 40px; }
  .section-para-l3 { padding-left: 60px; }

  .not-provided {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 13px;
    color: #aaa;
    font-style: italic;
  }

  /* Footer */
  .doc-footer {
    background: #24384e;
    padding: 16px 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: 'Helvetica Neue', Arial, sans-serif;
  }
  .footer-brand {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    color: rgba(255,255,255,0.7);
    text-transform: uppercase;
  }
  .footer-conf {
    font-size: 11px;
    color: rgba(255,255,255,0.4);
    font-style: italic;
  }

  /* Print media */
  @media print {
    body { background: #fff; }
    .print-bar { display: none !important; }
    .page-wrap {
      margin: 0;
      box-shadow: none;
      border-radius: 0;
      max-width: 100%;
    }
    .section { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<div class="print-bar">
  <span class="print-bar-title">Owner Response Certificate — ${escapeHtml(data.horseName || "Horse")}</span>
  <button class="print-btn" onclick="window.print()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
    </svg>
    Print / Save as PDF
  </button>
</div>

<div class="page-wrap">

  <div class="doc-header">
    <div class="doc-header-brand">
      <div class="brand-name">Performance Horse Sales</div>
      <div class="brand-region">Australia &amp; New Zealand</div>
    </div>
    <div class="doc-header-right">
      <div class="doc-type">Owner Response Certificate</div>
    </div>
  </div>

  <div class="title-band">
    <div class="horse-name">${escapeHtml(data.horseName || "Unnamed Horse")}</div>
  </div>

  <div class="sections-wrap">
    ${sectionsHtml}
  </div>

  <div class="doc-footer">
    <span class="footer-brand">Performance Horse Sales</span>
    <span class="footer-conf">Australia &amp; New Zealand</span>
  </div>

</div>

</body>
</html>`;
}

/**
 * Generates a Drive-safe HTML version of the ORC.
 * Google Docs' HTML importer ignores <style> blocks and partially applies inline
 * background-color, turning dark backgrounds into black text highlights.
 * This version uses ONLY inline styles, no background colours, and simple
 * table-based layout that Google Docs renders cleanly.
 */
export function generateOrcDriveHtml(data: OrcDocumentData): string {
  const sections = parseOrcSections(data.orcText);

  const dateStr = data.generatedAt
    ? new Date(data.generatedAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

  const sectionRows = sections.map((s) => {
    const contentLines = s.content.split("\n");
    let bodyHtml = "";
    for (const raw of contentLines) {
      const line = raw.trimEnd();
      if (!line.trim()) continue;
      const trimmed = line.trimStart();
      const level = indentLevel(raw);
      const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ");
      const paddingLeft = `${level * 20 + 8}px`;
      if (isBullet) {
        const marker = level === 0 ? "•" : level === 1 ? "–" : "·";
        const text = trimmed.slice(2);
        bodyHtml += `<p style="margin:2px 0;padding-left:${paddingLeft};font-size:13px;color:#222;line-height:1.6">${marker}&nbsp;&nbsp;${escapeHtml(text)}</p>`;
      } else {
        bodyHtml += `<p style="margin:2px 0;padding-left:${paddingLeft};font-size:13px;color:#222;line-height:1.6">${escapeHtml(trimmed)}</p>`;
      }
    }
    if (!bodyHtml) bodyHtml = `<p style="margin:2px 0;font-size:13px;color:#aaa;font-style:italic">Not provided</p>`;

    const heading = s.number
      ? `<b style="font-size:10px;letter-spacing:0.1em;color:#24384e;text-transform:uppercase">${s.number}. ${escapeHtml(s.title)}</b>`
      : `<b style="font-size:10px;letter-spacing:0.1em;color:#24384e;text-transform:uppercase">${escapeHtml(s.title)}</b>`;

    return `
      <tr>
        <td style="padding:18px 0 14px;border-bottom:1px solid #ddd;vertical-align:top">
          <p style="margin:0 0 8px 0">${heading}</p>
          ${bodyHtml}
        </td>
      </tr>`;
  }).join("");

  const metaParts: string[] = [];
  if (data.breed) metaParts.push(escapeHtml(data.breed));
  const metaLine = metaParts.join(" &nbsp;·&nbsp; ");

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:24px;color:#222">

  <p style="font-size:11px;font-weight:700;letter-spacing:0.12em;color:#24384e;text-transform:uppercase;margin:0 0 2px 0">Performance Horse Sales — Australia &amp; New Zealand</p>
  <p style="font-size:10px;color:#888;margin:0 0 16px 0">Owner Response Certificate</p>

  <hr style="border:none;border-top:3px solid #24384e;margin:0 0 16px 0">

  <h1 style="font-size:26px;font-weight:700;color:#24384e;margin:0 0 16px 0;font-family:Georgia,serif">${escapeHtml(data.horseName || "Unnamed Horse")}</h1>

  <p style="font-size:11px;color:#7a6010;border:1px solid #e8d98a;padding:8px 12px;margin:0 0 24px 0;border-radius:3px">
    ⚑&nbsp; This is a factual record based on seller-provided information. It is not a sales document and is for internal PHS use only.
  </p>

  <table style="width:100%;border-collapse:collapse">
    ${sectionRows}
  </table>

  <hr style="border:none;border-top:1px solid #ddd;margin:24px 0 10px 0">
  <p style="font-size:10px;color:#aaa;margin:0">Performance Horse Sales Australia &amp; New Zealand — ${dateStr}</p>

</body>
</html>`;
}

export function openOrcPrintWindow(data: OrcDocumentData): void {
  const html = generateOrcHtml(data);
  const popup = window.open("", "_blank", "width=900,height=750,scrollbars=yes,resizable=yes");
  if (!popup) {
    alert("Please allow pop-ups to open the ORC document.");
    return;
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}
