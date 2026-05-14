function esc(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric", month: "long", year: "numeric",
  });
}

const STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: Georgia, 'Times New Roman', serif;
    background: #f0ede8;
    color: #1a1a1a;
    min-height: 100vh;
  }

  .print-bar {
    position: sticky; top: 0; z-index: 100;
    background: #24384e; padding: 12px 32px;
    display: flex; align-items: center; justify-content: space-between;
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  }
  .print-bar-title { color: rgba(255,255,255,0.8); font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; letter-spacing: 0.04em; }
  .print-btn {
    background: #fff; color: #24384e; border: none; border-radius: 5px;
    padding: 9px 24px; font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 13px; font-weight: 600; cursor: pointer; letter-spacing: 0.03em;
    display: flex; align-items: center; gap: 8px;
  }
  .print-btn:hover { background: #e8e4de; }
  .print-btn svg { width: 15px; height: 15px; }

  .page-wrap {
    max-width: 820px; margin: 40px auto 60px;
    background: #fff; box-shadow: 0 4px 32px rgba(0,0,0,0.13);
    border-radius: 4px; overflow: hidden;
  }

  .doc-header {
    background: #24384e; padding: 32px 48px 28px;
    display: flex; align-items: flex-end; justify-content: space-between; gap: 24px;
  }
  .brand-name { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 20px; font-weight: 700; letter-spacing: 0.04em; color: #fff; line-height: 1.2; }
  .brand-region { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10px; font-weight: 400; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.6); margin-top: 3px; }
  .doc-type { font-size: 11px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(255,255,255,0.55); text-align: right; font-family: 'Helvetica Neue', Arial, sans-serif; }
  .doc-ref { font-size: 11px; color: rgba(255,255,255,0.45); margin-top: 6px; text-align: right; font-family: 'Helvetica Neue', Arial, sans-serif; }

  .title-band {
    background: #f8f5f0; border-bottom: 2px solid #24384e; padding: 28px 48px 24px;
  }
  .horse-name { font-size: 30px; font-weight: 700; color: #24384e; line-height: 1.15; letter-spacing: -0.01em; }
  .horse-sub { margin-top: 6px; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #888; }

  .body-wrap { padding: 40px 48px 48px; }

  .description-text {
    font-size: 15px;
    line-height: 1.85;
    color: #1a1a1a;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .doc-footer {
    background: #24384e; padding: 16px 48px;
    display: flex; align-items: center; justify-content: space-between;
    font-family: 'Helvetica Neue', Arial, sans-serif;
  }
  .footer-brand { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; color: rgba(255,255,255,0.7); text-transform: uppercase; }
  .footer-conf { font-size: 11px; color: rgba(255,255,255,0.4); font-style: italic; }

  @media print {
    body { background: #fff; }
    .print-bar { display: none !important; }
    .page-wrap { margin: 0; box-shadow: none; border-radius: 0; max-width: 100%; }
  }
`;

export function openHorseDescriptionPrintWindow(
  horseName: string,
  description: string,
  generatedAt?: string | null,
): void {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Horse Description — ${esc(horseName)} — Performance Horse Sales</title>
<style>${STYLES}</style>
</head>
<body>

<div class="print-bar">
  <span class="print-bar-title">Horse Description — ${esc(horseName)}</span>
  <button class="print-btn" onclick="window.print()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
    </svg>
    Print / Save as PDF
  </button>
</div>

<div class="page-wrap">

  <div class="doc-header">
    <div>
      <div class="brand-name">Performance Horse Sales</div>
      <div class="brand-region">Australia &amp; New Zealand</div>
    </div>
    <div>
      <div class="doc-type">Horse Description</div>
      ${generatedAt ? `<div class="doc-ref">Generated ${fmtDate(generatedAt)}</div>` : ""}
    </div>
  </div>

  <div class="title-band">
    <div class="horse-name">${esc(horseName) || "Unnamed Horse"}</div>
    <div class="horse-sub">Listing Description</div>
  </div>

  <div class="body-wrap">
    <div class="description-text">${esc(description)}</div>
  </div>

  <div class="doc-footer">
    <span class="footer-brand">Performance Horse Sales</span>
    <span class="footer-conf">Australia &amp; New Zealand — Confidential</span>
  </div>

</div>

</body>
</html>`;

  const popup = window.open("", "_blank", "width=960,height=800,scrollbars=yes,resizable=yes");
  if (!popup) {
    alert("Please allow pop-ups to open the PDF preview.");
    return;
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}
