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
        <div class="fee-row"><span class="fee-label">Completion fee (payable when triggered — see terms)</span><span class="fee-value">${esc(data.consultancyFee) || "5% (min $1,000, capped at $2,000)"}</span></div>
      </div>
      <p class="body-text">All fees are quoted exclusive of GST. GST will be added to the amounts above.</p>
      <p class="body-text" style="margin-top:8px">The upfront fee is payable immediately upon signing this agreement and is non-refundable once the search has commenced. The completion fee is payable in full within 24 hours of the invoice being sent, when triggered as per the terms below.</p>
    </div>

    <div class="section">
      <div class="section-title">Our Service — Premium Concierge Search</div>
      <p class="body-text">Full management of the buying process. This service can include:</p>
      <ul style="padding-left:24px;margin-top:8px;font-size:14px;line-height:1.7;color:#2a2a2a">
        <li style="margin-bottom:3px">Discussion and refinement of the client's search criteria</li>
        <li style="margin-bottom:3px">Creation and management of the PHS website advertisement and social media posts</li>
        <li style="margin-bottom:3px">Creation of a shared search database containing potential horses, videos, information and relevant files</li>
        <li style="margin-bottom:3px">Initial research on up to 30 potential horses matching the search criteria</li>
        <li style="margin-bottom:3px">Up to 30 potential horses sent to the client for consideration</li>
        <li style="margin-bottom:3px">Comprehensive research on up to 10 shortlisted horses</li>
        <li style="margin-bottom:3px">Management of the majority of communication with sellers</li>
        <li style="margin-bottom:3px">Coordination and management of viewings</li>
        <li style="margin-bottom:3px">Recommendations for suitable professionals to assess horses on the buyer's behalf</li>
        <li style="margin-bottom:3px">In-depth support and discussion regarding horse suitability</li>
        <li style="margin-bottom:3px">Review of viewing videos, with further discussion and suitability advice</li>
        <li style="margin-bottom:3px">Full support throughout the buying process</li>
        <li style="margin-bottom:3px">Recommendations regarding vetting</li>
        <li style="margin-bottom:3px">Assistance with transport quotes</li>
        <li style="margin-bottom:3px">Support with sale negotiation</li>
        <li style="margin-bottom:3px">Creation of the sale contract</li>
        <li style="margin-bottom:3px">Recommendations regarding insurance</li>
      </ul>
    </div>

    <div class="section">
      <div class="section-title">Completion Fee — When It Is Due</div>
      <p class="body-text">The Completion Fee is payable when — whichever occurs first:</p>
      <ul style="padding-left:24px;margin-top:8px;font-size:14px;line-height:1.7;color:#2a2a2a">
        <li style="margin-bottom:3px">a deposit is paid;</li>
        <li style="margin-bottom:3px">vetting is booked;</li>
        <li style="margin-bottom:3px">the horse is purchased, leased or trialled (regardless of the channel or means by which it was found);</li>
        <li style="margin-bottom:3px">the client ends the search for any reason;</li>
        <li style="margin-bottom:3px">the client pauses the search for any reason; or</li>
        <li style="margin-bottom:3px">30 horses have been sent.</li>
      </ul>
      <p class="body-text" style="margin-top:10px">Please note, we continue to work with you to finalise the search and purchase once this fee has been paid. The fee is payable to ensure that our work and time is paid for. The fee is payable in full within 24 hours of the invoice being sent.</p>
    </div>

    <div class="section">
      <div class="section-title">Timeliness of Search and Purchase</div>
      <p class="body-text">To minimise time wasting and prevent lost purchase opportunities, it is expected that you are ready to view and purchase. The process of a sale is completed within 7 days from viewing — with a decision being made within 24 hours of potential buyers receiving the vet report — unless prior arrangements have been made. This is to protect PHS and sellers from long, drawn-out searches/purchases and missed opportunities.</p>
    </div>

    <div class="section">
      <div class="section-title">Search Criteria and Readiness to Purchase</div>
      <p class="body-text">The search criteria submitted on the Search Form is the official criteria of the search. We understand that during a search, clients will become clearer as to their criteria — this is part of the process. Please be mindful that:</p>
      <ul style="padding-left:24px;margin-top:8px;font-size:14px;line-height:1.7;color:#2a2a2a">
        <li style="margin-bottom:3px">If major changes occur and budget does not change, the search may no longer be viable.</li>
        <li style="margin-bottom:3px">If you are not immediately ready to view, horses may be sold by the time you are organised to view them.</li>
        <li style="margin-bottom:3px">You must be ready to view and purchase — searches are not paused unless there are extraordinary extenuating circumstances.</li>
        <li style="margin-bottom:3px">The number of horses on the database does not reset. If you are at horse 18, another 12 will be added to reach 30.</li>
      </ul>
    </div>

    <div class="section">
      <div class="section-title">Database</div>
      <p class="body-text">The database will consist of 30 horses that match the search criteria. Once those 30 horses have been added, the search is finalised and the completion fee (if applicable) is due. "Match the criteria" in terms of age, height and price includes those within 10% of the stated figures.</p>
      <p class="body-text" style="margin-top:8px">Please remember — it is impossible to find any horse which is absolutely perfect, with a completely clean medical history and zero history of any misdemeanour, because they are living beings.</p>
      <p class="body-text" style="margin-top:8px">Any horse sent to PHS by the client for discussion/research will be included in the official count. Horses will not be removed from the official count simply because they don't appeal to the client or are deemed not suitable after further investigation — this research and fine-tuning is part of the process and what we are paid for.</p>
    </div>

    <div class="section">
      <div class="section-title">Advertising</div>
      <p class="body-text"><strong>During the search:</strong> PHS reserves the right to be the only content creator during the search process. Anyone is welcome and encouraged to share PHS ads and posts. Any previous search/wanted ads are expected to be removed so that the search has a fresh start, marketing-wise.</p>
      <p class="body-text" style="margin-top:8px"><strong>After the search:</strong> PHS reserves the right to advertise horses listed with PHS as "purchased via Performance Horse Sales search" or similar on social media and the internet, once they have sold.</p>
    </div>

    <div class="section">
      <div class="section-title">Assessment of Suitability</div>
      <p class="body-text">I understand that I am fully and solely responsible for decisions relating to all aspects of the search, viewing and sale and waive PHS of all and any liability. I acknowledge that PHS does not meet or view the search client or horse in person and is relying solely on the information search clients and sellers provide.</p>
      <p class="body-text" style="margin-top:8px">I, for myself and on behalf of my heirs, assigns, personal representatives and next of kin, hereby release and hold harmless and agree not to sue PHS and its connections, and if applicable, owners, buyers and lessors of horses or premises used, with any respect to all injury, disability, death, or loss or damage to person or property, whether caused by the negligence of these parties or otherwise.</p>
    </div>

    <div class="section">
      <div class="section-title">Deposits</div>
      <p class="body-text">There is no charge or need to pay a deposit for the first viewing, unless a potential buyer wishes to hold a horse and prevent a sale to someone else. A 10% deposit (or $1,000 — whichever is higher) must be paid to hold the horse for a second viewing or vet check. Deposits are paid directly to the horse's current owner.</p>
      <p class="body-text" style="margin-top:8px">Deposits will usually be refunded if: the horse does not behave as advertised at the viewing; known issues are not disclosed; and/or the vet report/x-rays state the horse is lame, "not fit for purpose", or considered a "moderate" or "high" risk for the advertised purpose.</p>
      <p class="body-text" style="margin-top:8px"><strong>It is of vital importance that you receive in writing, from the seller, the terms of deposit payment and conditions regarding deposit refunds, prior to paying a deposit.</strong></p>
    </div>

    <div class="section">
      <div class="section-title">Client Agreements</div>
      <div class="clause-item"><span class="clause-label">Agreed:</span> I am over 18 years old and have read, understand and agree to the terms and conditions above, including the full Search Terms &amp; Conditions available on the Performance Horse Sales website. I confirm all information in my search criteria is accurate. I understand I am fully and solely responsible for decisions relating to all aspects of the search, viewing and sale.</div>
      <div class="clause-item" style="margin-top:10px"><span class="clause-label">Agreed:</span> I agree to pay the upfront fee of ${esc(data.upfrontFee) || "$1,000"} + GST upon signing, and the completion fee of ${esc(data.consultancyFee) || "5%"} + GST in full, within 24 hours of the invoice being sent, when triggered as per the terms above. I understand that all money (deposit/payment) for the horse is sent straight to the seller by the buyer — PHS simply facilitates the search process.</div>
      <div class="clause-item" style="margin-top:10px"><span class="clause-label">Agreed:</span> I confirm that I am ready and financially able to purchase a horse. I understand I will need to pay a 10% deposit (minimum $1,000) directly to the seller to hold a horse for second viewings or vetting, and that I will obtain the deposit terms and refund conditions in writing from the seller before paying.</div>
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
