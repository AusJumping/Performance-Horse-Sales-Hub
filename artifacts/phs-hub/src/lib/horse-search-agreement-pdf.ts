export interface HorseSearchAgreementPdfData {
  id: number;
  token: string;
  status?: string;
  clientName?: string | null;
  clientEmail?: string | null;
  clientAddress?: string | null;
  clientPhone?: string | null;
  serviceLevel?: string | null;
  upfrontFee?: string | null;
  consultancyFee?: string | null;
  customTerms?: string | null;
  clientSignature?: string | null;
  agreedTerms?: boolean;
  agreedFee?: boolean;
  agreedReady?: boolean;
  submittedAt?: string | null;
  createdAt?: string;
}

function esc(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}

function fmtDatetime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function serviceLabel(level: string | null | undefined): string {
  return level === "level2" ? "Premium Concierge Search" : level || "Premium Concierge Search";
}

const STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; background: #f0ede8; color: #1a1a1a; min-height: 100vh; }

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
    font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px;
  }
  .print-btn:hover { background: #e8e4de; }

  .page-wrap { max-width: 820px; margin: 40px auto 60px; background: #fff; box-shadow: 0 4px 32px rgba(0,0,0,0.13); border-radius: 4px; overflow: hidden; }

  .doc-header { background: #24384e; padding: 32px 48px 28px; display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; }
  .doc-type { font-size: 11px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(255,255,255,0.55); font-family: 'Helvetica Neue', Arial, sans-serif; }
  .doc-ref { font-size: 11px; color: rgba(255,255,255,0.45); margin-top: 6px; font-family: 'Helvetica Neue', Arial, sans-serif; }

  .title-band { background: #f8f5f0; border-bottom: 2px solid #24384e; padding: 24px 48px 20px; }
  .doc-title { font-size: 26px; font-weight: 700; color: #24384e; letter-spacing: -0.01em; }
  .doc-sub { margin-top: 6px; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #666; }

  .status-bar { padding: 10px 48px; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; display: flex; align-items: center; gap: 8px; }
  .status-bar.submitted { background: #ecfdf5; border-bottom: 1px solid #a7f3d0; color: #065f46; }
  .status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .submitted .status-dot { background: #10b981; }

  .sections-wrap { padding: 0 48px 40px; }

  .section { margin-top: 32px; padding-bottom: 28px; border-bottom: 1px solid #e8e4de; }
  .section:last-child { border-bottom: none; }
  .section-title { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #24384e; margin-bottom: 14px; }

  .fee-box { background: #f8f5f0; border: 1px solid #e8dfc8; border-radius: 6px; padding: 16px 20px; margin-bottom: 16px; }
  .fee-row { display: flex; justify-content: space-between; align-items: baseline; padding: 4px 0; border-bottom: 1px solid #ede8e0; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; }
  .fee-row:last-child { border-bottom: none; }
  .fee-label { color: #888; }
  .fee-value { font-weight: 700; color: #24384e; }

  .client-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 0; }
  .client-block { padding: 16px 18px; border: 1px solid #e8e4de; border-radius: 4px; background: #fafaf8; }
  .client-role { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #24384e; margin-bottom: 6px; }
  .client-name { font-size: 15px; font-weight: 700; color: #1a1a1a; margin-bottom: 2px; }
  .client-detail { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #777; }

  .body-text { font-size: 14px; line-height: 1.75; color: #2a2a2a; margin-bottom: 8px; }

  .clause-item { margin-bottom: 10px; font-size: 14px; line-height: 1.7; color: #2a2a2a; }
  .clause-label { font-weight: 700; color: #1a1a1a; }

  .sig-block { }
  .sig-label { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #888; margin-bottom: 8px; }
  .sig-img { border: 1px solid #e8e4de; border-radius: 4px; padding: 8px; background: #fff; max-height: 100px; display: block; }
  .sig-empty { border: 1px dashed #d0ccc6; border-radius: 4px; padding: 20px; background: #fafaf8; text-align: center; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #bbb; font-style: italic; }
  .sig-name { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #666; margin-top: 4px; }

  .submitted-banner { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 12px 16px; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #065f46; margin-top: 20px; display: flex; align-items: center; gap: 10px; }

  .doc-footer { background: #24384e; padding: 16px 48px; display: flex; align-items: center; justify-content: space-between; font-family: 'Helvetica Neue', Arial, sans-serif; }
  .footer-conf { font-size: 11px; color: rgba(255,255,255,0.4); font-style: italic; }

  @media print {
    body { background: #fff; }
    .print-bar { display: none !important; }
    .page-wrap { margin: 0; box-shadow: none; border-radius: 0; max-width: 100%; }
  }
`;

export function generateHorseSearchAgreementHtml(data: HorseSearchAgreementPdfData): string {
  const isSubmitted = data.status === "submitted";

  const statusBarHtml = isSubmitted
    ? `<div class="status-bar submitted"><div class="status-dot"></div><span><strong>Signed &amp; Submitted</strong> — ${fmtDatetime(data.submittedAt)}</span></div>`
    : "";

  const customTermsHtml = data.customTerms
    ? `<div class="clause-item"><span class="clause-label">Additional terms:</span> ${esc(data.customTerms)}</div>`
    : "";

  const sigHtml = data.clientSignature
    ? `<img class="sig-img" src="${data.clientSignature}" alt="Client signature" /><div class="sig-name">${esc(data.clientName) || ""}</div>`
    : `<div class="sig-empty">Awaiting signature</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Costs Agreement — ${esc(data.clientName)}</title>
<style>${STYLES}</style>
</head>
<body>

<div class="print-bar">
  <span class="print-bar-title">Costs Agreement — ${esc(data.clientName)}</span>
  <button class="print-btn" onclick="window.print()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px">
      <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
    </svg>
    Print / Save as PDF
  </button>
</div>

<div class="page-wrap">
  <div class="doc-header">
    <div>
      <div class="doc-type">Costs Agreement</div>
      ${data.createdAt ? `<div class="doc-ref">Generated ${fmtDate(data.createdAt)}</div>` : ""}
    </div>
  </div>

  <div class="title-band">
    <div class="doc-title">Search Service Costs Agreement</div>
    <div class="doc-sub">${serviceLabel(data.serviceLevel)} &nbsp;·&nbsp; Agreement #${data.id}</div>
  </div>

  ${statusBarHtml}

  <div class="sections-wrap">

    <div class="section">
      <div class="section-title">Parties</div>
      <div class="client-grid">
        <div class="client-block">
          <div class="client-role">The Client</div>
          <div class="client-name">${esc(data.clientName) || "—"}</div>
          ${data.clientEmail ? `<div class="client-detail">${esc(data.clientEmail)}</div>` : ""}
          ${data.clientAddress ? `<div class="client-detail" style="margin-top:4px">${esc(data.clientAddress)}</div>` : ""}
          ${data.clientPhone ? `<div class="client-detail">Ph: ${esc(data.clientPhone)}</div>` : ""}
        </div>
        <div class="client-block">
          <div class="client-role">Service Provider</div>
          <div class="client-name">Performance Horse Sales AU NZ</div>
          <div class="client-detail">Australia &amp; New Zealand</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Service &amp; Fees</div>
      <div class="fee-box">
        <div class="fee-row"><span class="fee-label">Service</span><span class="fee-value">${esc(serviceLabel(data.serviceLevel))}</span></div>
        <div class="fee-row"><span class="fee-label">Upfront fee (payable upon signing)</span><span class="fee-value">${esc(data.upfrontFee) || "$1,000"}</span></div>
        <div class="fee-row"><span class="fee-label">Consultancy fee (payable on successful purchase)</span><span class="fee-value">${esc(data.consultancyFee) || "5% (min $1,000, capped at $2,000)"}</span></div>
      </div>
      <p class="body-text">All fees are quoted exclusive of GST. GST will be added to the amounts above.</p>
      <p class="body-text" style="margin-top:8px">The upfront fee is payable immediately upon signing this agreement and is non-refundable once the search has commenced. The consultancy fee is payable within 24 hours of the deposit being paid and the purchase being booked.</p>
    </div>

    <div class="section">
      <div class="section-title">What We Do</div>
      <div class="body-text">
        <p>Performance Horse Sales will:</p>
        <ul style="padding-left:24px;margin-top:8px">
          <li style="margin-bottom:4px">Source and compile a database of up to 30 horses that match the client's stated criteria;</li>
          <li style="margin-bottom:4px">Notify the client each time a new horse is added to their shortlist;</li>
          <li style="margin-bottom:4px">Provide guidance and expert advice throughout the search process;</li>
          <li style="margin-bottom:4px">Manage all initial enquiries, negotiation, and booking of viewings (Premium Concierge only);</li>
          <li style="margin-bottom:4px">Provide vet check guidance and transport contacts (Premium Concierge only); and</li>
          <li style="margin-bottom:4px">Prepare a Bill of Sale once a horse is found and purchased (Premium Concierge only).</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Client Commitments</div>
      <div class="clause-item"><span class="clause-label">Clause 1:</span> The client confirms they are over 18 years of age and legally able to enter into this agreement.</div>
      <div class="clause-item"><span class="clause-label">Clause 2:</span> The client confirms they are ready, willing, and able to view and purchase a horse during the search period. Horses are added as fast or as slow as they are found.</div>
      <div class="clause-item"><span class="clause-label">Clause 3:</span> The client confirms that all information provided in their search criteria form is accurate and complete. Any misrepresentation may result in the search being suspended.</div>
      <div class="clause-item"><span class="clause-label">Clause 4:</span> The client understands that no horse will perfectly match every single stated criterion. Horses presented will be those which Performance Horse Sales believes are 'fit for the intended purpose'.</div>
      <div class="clause-item"><span class="clause-label">Clause 5:</span> The client agrees to pay a holding deposit directly to the seller to secure a horse for second viewings and vet checks, as per standard industry practice.</div>
      <div class="clause-item"><span class="clause-label">Clause 6:</span> The client agrees to pay all fees and costs in full when they fall due. Late payment may result in suspension of the search service.</div>
      <div class="clause-item"><span class="clause-label">Clause 7:</span> The client has read and agrees to the full Search Terms and Conditions publicly available on the Performance Horse Sales website.</div>
      ${customTermsHtml}
    </div>

    <div class="section">
      <div class="section-title">Signature</div>
      <div class="sig-block">
        <div class="sig-label">Client Signature</div>
        ${sigHtml}
      </div>
      ${isSubmitted ? `
      <div class="submitted-banner">
        <svg style="width:18px;height:18px;flex-shrink:0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <span><strong>Agreement signed and submitted</strong> on ${fmtDatetime(data.submittedAt)}</span>
      </div>` : ""}
    </div>

  </div>

  <div class="doc-footer">
    <span class="footer-conf">Confidential &nbsp;·&nbsp; Agreement #${data.id} &nbsp;·&nbsp; Generated ${fmtDatetime(new Date().toISOString())}</span>
  </div>
</div>

</body>
</html>`;
}

export function openHorseSearchAgreementPrintWindow(data: HorseSearchAgreementPdfData): void {
  const html = generateHorseSearchAgreementHtml(data);
  const popup = window.open("", "_blank", "width=960,height=800,scrollbars=yes,resizable=yes");
  if (!popup) { alert("Please allow pop-ups to open the agreement document."); return; }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}
