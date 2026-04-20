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

function contentToHtml(content: string): string {
  const lines = content.split("\n");
  let html = "";
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    const trimmed = line.trimStart();
    if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      html += `<div class="bullet-row"><span class="bullet">•</span><span>${escapeHtml(trimmed.slice(2))}</span></div>`;
    } else {
      html += `<p class="section-para">${escapeHtml(trimmed)}</p>`;
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
    padding-left: 32px;
  }
  .bullet-row {
    display: flex;
    gap: 10px;
    margin-bottom: 5px;
    line-height: 1.6;
    font-size: 14px;
  }
  .bullet {
    color: #24384e;
    flex-shrink: 0;
    margin-top: 1px;
    font-size: 16px;
    line-height: 1.45;
  }
  .section-para {
    font-size: 14px;
    line-height: 1.7;
    margin-bottom: 5px;
    color: #2a2a2a;
  }
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
      ${data.submissionId ? `<div class="doc-ref">Submission #${escapeHtml(String(data.submissionId))} &nbsp;|&nbsp; ${dateStr}</div>` : `<div class="doc-ref">${dateStr}</div>`}
    </div>
  </div>

  <div class="title-band">
    <div class="horse-name">${escapeHtml(data.horseName || "Unnamed Horse")}</div>
    <div class="horse-meta">
      ${data.breed ? `<span class="horse-meta-item">${escapeHtml(data.breed)}</span>` : ""}
      ${data.sellerName ? `<span class="horse-meta-item">Seller: ${escapeHtml(data.sellerName)}</span>` : ""}
      ${data.askingPrice ? `<span class="horse-meta-item">Asking: ${escapeHtml(data.askingPrice)}</span>` : ""}
    </div>
  </div>

  <div class="notice-bar">
    <div class="notice-dot"></div>
    This is a factual, structured record based on seller-provided information. It is not a sales document and is for internal PHS use only.
  </div>

  <div class="sections-wrap">
    ${sectionsHtml}
  </div>

  <div class="doc-footer">
    <span class="footer-brand">Performance Horse Sales</span>
    <span class="footer-conf">Confidential — Internal Use Only</span>
  </div>

</div>

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
