export interface ApprovalPackData {
  horseName: string;
  breed?: string | null;
  sellerName?: string | null;
  askingPrice?: string | null;
  submissionId: number | string;
  orcText: string;
  masterListing: string;
  generatedAt?: string | null;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function proseToHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .map((para) => `<p>${escapeHtml(para.trim())}</p>`)
    .join("\n");
}

function orcToHtml(text: string): string {
  const lines = text.split("\n");
  let html = "";
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    const trimmed = line.trimStart();
    // Numbered section headings like "1. HORSE DETAILS"
    if (/^\d+\.\s+[A-Z]/.test(trimmed)) {
      html += `<h3 class="orc-section-title">${escapeHtml(trimmed)}</h3>`;
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      html += `<div class="orc-bullet"><span class="bullet-dot">•</span><span>${escapeHtml(trimmed.slice(2))}</span></div>`;
    } else {
      html += `<p class="orc-para">${escapeHtml(trimmed)}</p>`;
    }
  }
  return html;
}

export function generateApprovalPackHtml(data: ApprovalPackData): string {
  const dateStr = new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Seller Approval Pack — ${escapeHtml(data.horseName)} — Performance Horse Sales</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: Georgia, 'Times New Roman', serif;
    background: #f0ede8;
    color: #1a1a1a;
    min-height: 100vh;
  }

  /* Screen print bar */
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
  .print-bar-title { color: rgba(255,255,255,0.75); font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; }
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

  /* Cover header */
  .cover-header {
    background: #24384e;
    padding: 40px 48px 36px;
  }
  .cover-brand-row {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-bottom: 32px;
  }
  .brand-name {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: #fff;
  }
  .brand-region {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
    margin-top: 3px;
  }
  .doc-ref {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px;
    color: rgba(255,255,255,0.45);
    text-align: right;
  }
  .cover-doc-type {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
    margin-bottom: 8px;
  }
  .cover-horse-name {
    font-size: 36px;
    font-weight: 700;
    color: #fff;
    line-height: 1.1;
    letter-spacing: -0.01em;
  }
  .cover-meta {
    margin-top: 10px;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 13px;
    color: rgba(255,255,255,0.65);
    display: flex;
    flex-wrap: wrap;
    gap: 0 20px;
  }
  .cover-meta-sep { color: rgba(255,255,255,0.3); margin: 0 8px; }

  /* Intro notice */
  .intro-box {
    background: #f8f5f0;
    border-bottom: 2px solid #e0d8cc;
    padding: 24px 48px;
  }
  .intro-greeting {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 15px;
    font-weight: 600;
    color: #24384e;
    margin-bottom: 10px;
  }
  .intro-body {
    font-size: 14px;
    line-height: 1.75;
    color: #444;
  }
  .intro-checklist {
    margin-top: 14px;
    padding-left: 0;
    list-style: none;
  }
  .intro-checklist li {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 13px;
    color: #444;
    padding: 3px 0 3px 22px;
    position: relative;
  }
  .intro-checklist li::before {
    content: "✓";
    position: absolute;
    left: 0;
    color: #24384e;
    font-weight: 700;
  }

  /* Section wrapper */
  .pack-section {
    padding: 36px 48px;
    border-bottom: 1px solid #e8e4de;
  }
  .pack-section:last-of-type { border-bottom: none; }

  .section-label {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #24384e;
    margin-bottom: 4px;
  }
  .section-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    background: #24384e;
    color: #fff;
    border-radius: 50%;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px;
    font-weight: 700;
    margin-right: 10px;
    flex-shrink: 0;
  }
  .section-heading-row {
    display: flex;
    align-items: center;
    margin-bottom: 6px;
  }
  .section-heading {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 18px;
    font-weight: 700;
    color: #24384e;
  }
  .section-sub {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 12px;
    color: #888;
    margin-bottom: 20px;
    padding-left: 32px;
  }
  .divider { height: 1px; background: #e8e4de; margin: 18px 0; }

  /* Horse description (prose) */
  .hd-body p {
    font-size: 15px;
    line-height: 1.85;
    color: #2a2a2a;
    margin-bottom: 14px;
  }
  .hd-body p:last-child { margin-bottom: 0; }

  /* ORC content */
  .orc-section-title {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #24384e;
    margin: 20px 0 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid #e8e4de;
  }
  .orc-section-title:first-child { margin-top: 0; }
  .orc-bullet {
    display: flex;
    gap: 10px;
    margin-bottom: 5px;
    font-size: 13.5px;
    line-height: 1.6;
    padding-left: 8px;
  }
  .bullet-dot { color: #24384e; flex-shrink: 0; font-size: 16px; line-height: 1.45; }
  .orc-para { font-size: 13.5px; line-height: 1.7; margin-bottom: 5px; color: #333; padding-left: 8px; }

  /* Next steps */
  .next-steps-box {
    background: #f0f5f0;
    border: 1px solid #c8dcc8;
    border-radius: 6px;
    padding: 20px 24px;
  }
  .next-steps-title {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: #2d5a2d;
    margin-bottom: 10px;
  }
  .next-steps-list {
    list-style: none;
    padding: 0;
  }
  .next-steps-list li {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 13px;
    color: #333;
    padding: 4px 0 4px 20px;
    position: relative;
    line-height: 1.5;
  }
  .next-steps-list li::before {
    content: "→";
    position: absolute;
    left: 0;
    color: #2d5a2d;
    font-weight: 700;
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
  .footer-brand { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; color: rgba(255,255,255,0.7); text-transform: uppercase; }
  .footer-note { font-size: 11px; color: rgba(255,255,255,0.4); font-style: italic; }

  @media print {
    body { background: #fff; }
    .print-bar { display: none !important; }
    .page-wrap { margin: 0; box-shadow: none; border-radius: 0; max-width: 100%; }
    .pack-section { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<div class="print-bar">
  <span class="print-bar-title">Seller Approval Pack — ${escapeHtml(data.horseName)}</span>
  <button class="print-btn" onclick="window.print()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
    </svg>
    Print / Save as PDF
  </button>
</div>

<div class="page-wrap">

  <div class="cover-header">
    <div class="cover-brand-row">
      <div>
        <div class="brand-name">Performance Horse Sales</div>
        <div class="brand-region">Australia &amp; New Zealand</div>
      </div>
      <div class="doc-ref">${dateStr}</div>
    </div>
    <div class="cover-doc-type">Seller Approval Pack</div>
    <div class="cover-horse-name">${escapeHtml(data.horseName)}</div>
    <div class="cover-meta">
      ${data.breed ? `<span>${escapeHtml(data.breed)}</span>` : ""}
    </div>
  </div>

  <div class="intro-box">
    <div class="intro-greeting">Dear Valued Seller,</div>
    <div class="intro-body">
      Thank you for submitting ${escapeHtml(data.horseName)} to Performance Horse Sales. We have reviewed the information you provided and prepared this approval pack for your review.
    </div>
    <ul class="intro-checklist">
      <li>Review the Listing Description — this is what buyers will see</li>
      <li>Review the Owner Response Certificate — confirm the facts are correct</li>
      <li>Reply with your approval or any requested changes</li>
    </ul>
  </div>

  <div class="pack-section">
    <div class="section-heading-row">
      <span class="section-num">1</span>
      <span class="section-heading">Listing Description</span>
    </div>
    <div class="section-sub">This is the full marketing listing that will appear on your public advertisement. Please review all sections and let us know if you'd like any adjustments.</div>
    <div class="hd-body">
      ${orcToHtml(data.masterListing)}
    </div>
  </div>

  <div class="pack-section">
    <div class="section-heading-row">
      <span class="section-num">2</span>
      <span class="section-heading">Owner Response Certificate</span>
    </div>
    <div class="section-sub">A structured summary of the details you provided. Please confirm everything is accurate before we proceed.</div>
    <div class="orc-body">
      ${orcToHtml(data.orcText)}
    </div>
  </div>

  <div class="pack-section">
    <div class="section-heading-row">
      <span class="section-num">3</span>
      <span class="section-heading">Next Steps</span>
    </div>
    <div class="next-steps-box">
      <div class="next-steps-title">To proceed, please reply to this email with one of the following:</div>
      <ul class="next-steps-list">
        <li>Confirm everything looks correct and you're happy to proceed</li>
        <li>Request specific changes to the listing description or certificate details</li>
        <li>Let us know if you have any questions before approving</li>
      </ul>
    </div>
  </div>

  <div class="doc-footer">
    <span class="footer-brand">Performance Horse Sales</span>
    <span class="footer-note">Confidential — prepared for seller review</span>
  </div>

</div>
</body>
</html>`;
}

export function generateSellerEmailDraft(data: ApprovalPackData): string {
  const sellerFirst = data.sellerName?.split(" ")[0] ?? "there";
  return `Subject: Your Horse Listing Approval — ${data.horseName} | Action Required

Dear ${data.sellerName ?? "Valued Seller"},

Thank you for submitting ${data.horseName} to Performance Horse Sales. We have reviewed the information you provided and prepared your listing for approval.

Please find below two items for your review:

──────────────────────────────────────
1. LISTING DESCRIPTION
──────────────────────────────────────

This is the full marketing listing that will appear on your public advertisement. Please read through carefully and let us know if you would like any changes.

${data.masterListing}

──────────────────────────────────────
2. OWNER RESPONSE CERTIFICATE
──────────────────────────────────────

This is a structured summary of the details you provided. Please confirm the information is accurate before we proceed.

${data.orcText}

──────────────────────────────────────
NEXT STEPS
──────────────────────────────────────

Please reply to this email with one of the following:

  • "Approved" — if everything looks correct and you're happy to proceed
  • Any changes or corrections you'd like made to the description or certificate
  • Any questions before giving your approval

Once we receive your approval, we will move your listing forward.

Thank you again for choosing Performance Horse Sales. We look forward to finding the right buyer for ${data.horseName}.

Kind regards,
Performance Horse Sales
Australia & New Zealand`;
}

export function openApprovalPackWindow(data: ApprovalPackData): void {
  const html = generateApprovalPackHtml(data);
  const popup = window.open("", "_blank", "width=920,height=780,scrollbars=yes,resizable=yes");
  if (!popup) {
    alert("Please allow pop-ups to open the Approval Pack.");
    return;
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}
