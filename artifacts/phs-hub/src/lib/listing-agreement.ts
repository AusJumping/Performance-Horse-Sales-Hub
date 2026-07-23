export interface ListingAgreementData {
  horseName: string;
  breed?: string | null;
  sex?: string | null;
  age?: string | null;
  colour?: string | null;
  height?: string | null;
  askingPrice?: string | null;
  location?: string | null;
  sellerName?: string | null;
  sellerEmail?: string | null;
  sellerPhone?: string | null;
  submissionId: number | string;
  commissionRate: string;
  minimumFee?: string | null;
  maximumFee?: string | null;
  listingPeriodDays: number;
  listingTermsNotes?: string | null;
  agreementDate?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function row(label: string, value: string): string {
  return `<tr><td class="dt-label">${escapeHtml(label)}</td><td class="dt-value">${escapeHtml(value)}</td></tr>`;
}

export function generateListingAgreementHtml(data: ListingAgreementData): string {
  const today = data.agreementDate
    ? new Date(data.agreementDate)
    : new Date();
  const dateStr = today.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + (data.listingPeriodDays ?? 90));
  const endDateStr = endDate.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

  const commissionNumeric = parseFloat(data.commissionRate.replace("%", "").trim());
  const commissionDisplay = isNaN(commissionNumeric) ? data.commissionRate : `${commissionNumeric}%`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Listing Agreement — ${escapeHtml(data.horseName)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f0ede8; color: #1a1a1a; }

  .print-bar {
    position: sticky; top: 0; z-index: 100; background: #24384e;
    padding: 12px 32px; display: flex; align-items: center; justify-content: space-between;
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  }
  .print-bar-title { color: rgba(255,255,255,0.75); font-size: 13px; }
  .print-btn {
    background: #fff; color: #24384e; border: none; border-radius: 5px;
    padding: 9px 24px; font-size: 13px; font-weight: 600; cursor: pointer;
    display: flex; align-items: center; gap: 8px;
  }
  .print-btn:hover { background: #e8e4de; }
  .print-btn svg { width: 15px; height: 15px; }

  .page-wrap {
    max-width: 760px; margin: 40px auto 60px; background: #fff;
    box-shadow: 0 4px 32px rgba(0,0,0,0.13); border-radius: 4px; overflow: hidden;
  }

  .doc-header {
    background: #24384e; padding: 36px 48px 30px;
    display: flex; justify-content: space-between; align-items: flex-end;
  }
  .brand-name { font-size: 18px; font-weight: 700; letter-spacing: 0.04em; color: #fff; }
  .brand-region { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.5); margin-top: 3px; }
  .doc-header-right { text-align: right; }
  .doc-type { font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.5); }
  .doc-ref { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 6px; }

  .doc-title-band {
    background: #f8f5f0; border-bottom: 2px solid #24384e; padding: 22px 48px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .doc-title { font-size: 22px; font-weight: 700; color: #24384e; }
  .doc-date { font-size: 12px; color: #888; text-align: right; }
  .doc-date strong { display: block; font-size: 14px; color: #444; }

  .body { padding: 32px 48px 40px; }

  .section { margin-bottom: 28px; }
  .section-title {
    font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;
    color: #24384e; border-bottom: 1.5px solid #24384e; padding-bottom: 5px; margin-bottom: 12px;
  }

  /* Data table */
  .data-table { width: 100%; border-collapse: collapse; }
  .dt-label { font-size: 12px; color: #888; font-weight: 500; padding: 5px 12px 5px 0; width: 38%; vertical-align: top; }
  .dt-value { font-size: 13px; color: #1a1a1a; padding: 5px 0; font-weight: 500; }

  /* Fee highlight box */
  .fee-box {
    background: #f0f5f0; border: 1.5px solid #24384e; border-radius: 6px;
    padding: 16px 20px; display: flex; gap: 32px; align-items: center; flex-wrap: wrap;
  }
  .fee-item { text-align: center; }
  .fee-label { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #666; margin-bottom: 4px; }
  .fee-value { font-size: 22px; font-weight: 700; color: #24384e; }
  .fee-sub { font-size: 11px; color: #888; margin-top: 2px; }

  /* Clause list */
  .clause-list { list-style: none; padding: 0; }
  .clause-list li {
    font-size: 13px; line-height: 1.7; color: #333; padding: 6px 0 6px 20px;
    position: relative; border-bottom: 1px solid #f0ede8;
  }
  .clause-list li:last-child { border-bottom: none; }
  .clause-list li::before { content: attr(data-n)"."; position: absolute; left: 0; color: #24384e; font-weight: 700; font-size: 12px; padding-top: 1px; }

  /* Special terms */
  .special-terms { background: #fdf8ef; border: 1px solid #e8dfc8; border-radius: 5px; padding: 14px 16px; font-size: 13px; line-height: 1.7; color: #555; }

  /* Signature section */
  .sig-section { display: flex; gap: 40px; margin-top: 8px; }
  .sig-block { flex: 1; border-top: 1.5px solid #1a1a1a; padding-top: 8px; }
  .sig-name { font-size: 13px; font-weight: 600; color: #1a1a1a; }
  .sig-role { font-size: 11px; color: #888; margin-top: 2px; }
  .sig-line { margin-top: 28px; border-top: 1px dashed #ccc; padding-top: 6px; font-size: 10px; color: #aaa; letter-spacing: 0.06em; text-transform: uppercase; }

  /* Footer */
  .doc-footer {
    background: #24384e; padding: 14px 48px;
    display: flex; justify-content: space-between; font-size: 11px;
  }
  .footer-brand { font-weight: 600; letter-spacing: 0.06em; color: rgba(255,255,255,0.7); text-transform: uppercase; }
  .footer-note { color: rgba(255,255,255,0.4); font-style: italic; }

  @media print {
    body { background: #fff; }
    .print-bar { display: none !important; }
    .page-wrap { margin: 0; box-shadow: none; border-radius: 0; max-width: 100%; }
    .section { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<div class="print-bar">
  <span class="print-bar-title">Listing Agreement — ${escapeHtml(data.horseName)}</span>
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
    <div class="doc-header-right">
      <div class="doc-type">Listing Agreement</div>
      <div class="doc-ref">${dateStr}</div>
    </div>
  </div>

  <div class="doc-title-band">
    <div class="doc-title">${escapeHtml(data.horseName)}</div>
    <div class="doc-date">
      <span>Agreement Date</span>
      <strong>${dateStr}</strong>
    </div>
  </div>

  <div class="body">

    <div class="section">
      <div class="section-title">Parties</div>
      <table class="data-table">
        ${row("Agent", "Performance Horse Sales Australia & New Zealand")}
        ${row("Seller", data.sellerName ?? "—")}
        ${data.sellerEmail ? row("Seller Email", data.sellerEmail) : ""}
        ${data.sellerPhone ? row("Seller Phone", data.sellerPhone) : ""}
      </table>
    </div>

    <div class="section">
      <div class="section-title">Property Description</div>
      <table class="data-table">
        ${row("Horse Name", data.horseName)}
        ${data.breed ? row("Breed", data.breed) : ""}
        ${data.sex ? row("Sex", data.sex) : ""}
        ${data.age ? row("Age", `${data.age} years`) : ""}
        ${data.colour ? row("Colour / Markings", data.colour) : ""}
        ${data.height ? row("Height", data.height) : ""}
        ${data.location ? row("Current Location", data.location) : ""}
        ${data.askingPrice ? row("Asking Price", data.askingPrice) : ""}
      </table>
    </div>

    <div class="section">
      <div class="section-title">Fee Structure &amp; Listing Terms</div>
      <div class="fee-box">
        <div class="fee-item">
          <div class="fee-label">Commission Rate</div>
          <div class="fee-value">${escapeHtml(commissionDisplay)}</div>
          <div class="fee-sub">of listing price</div>
        </div>
        ${data.minimumFee ? `<div class="fee-item">
          <div class="fee-label">Minimum Fee</div>
          <div class="fee-value" style="font-size:18px">${escapeHtml(data.minimumFee)}</div>
          <div class="fee-sub">minimum commission payable</div>
        </div>` : ""}
        ${data.maximumFee ? `<div class="fee-item">
          <div class="fee-label">Maximum Fee</div>
          <div class="fee-value" style="font-size:18px">${escapeHtml(data.maximumFee)}</div>
          <div class="fee-sub">maximum commission payable</div>
        </div>` : ""}
        <div class="fee-item">
          <div class="fee-label">Listing Period</div>
          <div class="fee-value">${data.listingPeriodDays ?? 90}</div>
          <div class="fee-sub">days from ${dateStr}</div>
        </div>
        <div class="fee-item">
          <div class="fee-label">Agreement Expires</div>
          <div class="fee-value" style="font-size:15px">${endDateStr}</div>
          <div class="fee-sub">unless extended by mutual agreement</div>
        </div>
      </div>
    </div>

    ${data.listingTermsNotes ? `
    <div class="section">
      <div class="section-title">Special Conditions</div>
      <div class="special-terms">${escapeHtml(data.listingTermsNotes)}</div>
    </div>` : ""}

    <div class="section">
      <div class="section-title">Terms &amp; Conditions</div>
      <ol class="clause-list">
        <li data-n="1"><strong>Appointment.</strong> The Seller appoints Performance Horse Sales (PHS) as their consultant to market, advertise and facilitate the sale of the above horse for the duration of the listing period.</li>
        <li data-n="2"><strong>Commission / Completion Fee.</strong> The Seller agrees to pay PHS a commission/completion fee of ${escapeHtml(commissionDisplay)} of the listing price (plus GST), subject to a minimum fee of ${data.minimumFee ?? "$1,000"}${data.maximumFee ? ` and a maximum fee of ${data.maximumFee}` : ""}. The fee is due — whichever occurs first — when: (a) a deposit is paid or vetting is booked; (b) the horse is leased or sent on trial; (c) the horse is sold by any means or channel, regardless of the channel, method or means which initiated the sale; or (d) three months have passed since listing commencement (see pro rata clause below). The commission is payable within 24 hours of the invoice being issued. All fees are plus GST.</li>
        <li data-n="3"><strong>Retained Deposit.</strong> If a deposit is retained by the Seller in the event of a sale not proceeding, the completion fee is again payable as above. In the event of the first sale not proceeding and the deposit being returned to the buyer, a $500 completion fee is payable when the horse is finally sold.</li>
        <li data-n="4"><strong>Pausing the Listing.</strong> If the listing must be paused due to illness or injury of the horse or rider, and PHS is provided with a relevant vet or medical certificate, a $500 progress fee is payable. This fee will be deducted from the final commission or administration fee.</li>
        <li data-n="5"><strong>Pro Rata Administration Fee.</strong> If PHS has commenced marketing and the horse subsequently becomes: no longer available for sale; no longer listed exclusively with PHS; unable to be viewed within 7 days of a viewing request; found to be not as described by the Seller; or the horse has not sold within 3 months/90 days and the Seller is not following PHS advice regarding marketing and pricing — a pro rata administration fee is payable based on days listed. The calculation is: (${escapeHtml(commissionDisplay)} commission${data.minimumFee || data.maximumFee ? ` (${data.minimumFee ?? "—"}–${data.maximumFee ?? "—"})` : " ($500–$2,000)"} ÷ 90) × days listed with PHS (up to 90 days). A minimum charge of $500 applies regardless of calculation.</li>
        <li data-n="6"><strong>Marketing.</strong> PHS will market the horse through its website, social media channels, and partner platforms. The Seller grants PHS a non-exclusive licence to use photographs, videos and other media provided for the purpose of marketing the horse.</li>
        <li data-n="7"><strong>Seller's Warranties.</strong> The Seller warrants that: (a) they are the lawful owner of the horse or are authorised to act on the owner's behalf; (b) the horse is free from any undisclosed finance, encumbrance or lien; and (c) all information provided to PHS is accurate and complete to the best of their knowledge.</li>
        <li data-n="8"><strong>Enquiries &amp; Viewings.</strong> PHS will manage buyer enquiries and coordinate viewings. The Seller agrees to make reasonable efforts to facilitate viewings and respond to enquiries in a timely manner.</li>
        <li data-n="9"><strong>Price Changes.</strong> The Seller must notify PHS in writing of any change to the asking price or material change to the horse's condition.</li>
        <li data-n="10"><strong>Cancellation.</strong> Either party may terminate this agreement by providing 14 days' written notice. If the horse is sold during the listing period — or within 60 days after termination to a buyer introduced by PHS — the commission remains payable.</li>
        <li data-n="11"><strong>Limitation of Liability.</strong> PHS acts as a facilitating consultant only and accepts no liability for the accuracy of seller-provided information, the fitness of the horse for any purpose, or any disputes arising between buyer and seller.</li>
        <li data-n="12"><strong>Governing Law.</strong> This agreement is governed by the laws of Australia. Any disputes shall be resolved in the jurisdiction of the state in which the Seller resides.</li>
      </ol>
    </div>

    <div class="section">
      <div class="section-title">Signatures</div>
      <p style="font-size:13px; color:#555; margin-bottom:20px; line-height:1.6">
        By signing below, both parties agree to the terms and conditions set out in this Listing Agreement.
      </p>
      <div class="sig-section">
        <div class="sig-block">
          <div class="sig-name">${escapeHtml(data.sellerName ?? "Seller")}</div>
          <div class="sig-role">Horse Owner / Authorised Agent</div>
          <div class="sig-line">Signature &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Date</div>
        </div>
        <div class="sig-block">
          <div class="sig-name">Performance Horse Sales</div>
          <div class="sig-role">Authorised Representative</div>
          <div class="sig-line">Signature &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Date</div>
        </div>
      </div>
    </div>

  </div>

  <div class="doc-footer">
    <span class="footer-brand">Performance Horse Sales</span>
    <span class="footer-note">Listing Agreement — ${escapeHtml(data.horseName)} — ${dateStr}</span>
  </div>

</div>
</body>
</html>`;
}

export function openListingAgreementWindow(data: ListingAgreementData): void {
  const html = generateListingAgreementHtml(data);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const tab = window.open(url, "_blank");
  if (!tab) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `Listing Agreement — ${data.horseName}.html`;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function generateSignedListingAgreementHtml(
  data: ListingAgreementData,
  sellerSignatureDataUrl: string,
  signedAt?: Date | string | null,
): string {
  const today = data.agreementDate ? new Date(data.agreementDate) : new Date();
  const dateStr = today.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + (data.listingPeriodDays ?? 90));
  const endDateStr = endDate.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

  const signedDate = signedAt ? new Date(signedAt) : new Date();
  const signedDateStr = signedDate.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
  const signedTimeStr = signedDate.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });

  const commissionNumeric = parseFloat(data.commissionRate.replace("%", "").trim());
  const commissionDisplay = isNaN(commissionNumeric) ? data.commissionRate : `${commissionNumeric}%`;

  // Re-use the full listing agreement HTML but override the signature section
  const base = generateListingAgreementHtml(data);

  // Replace the print bar button label
  const withPrintLabel = base.replace(
    "Print / Save as PDF",
    "Print / Save Signed PDF"
  );

  // Replace the blank seller signature block with the embedded image + signed stamp
  const signedSellerBlock = `
    <div class="sig-block" style="position:relative">
      <div style="position:absolute;top:-8px;right:0;background:#d4edda;border:1.5px solid #28a745;border-radius:4px;padding:2px 8px;font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#155724">✓ Signed</div>
      <div class="sig-name">${escapeHtml(data.sellerName ?? "Seller")}</div>
      <div class="sig-role">Horse Owner / Authorised Agent</div>
      <div style="margin-top:6px;border:1px solid #e0e0e0;border-radius:4px;background:#fafafa;padding:4px">
        <img src="${sellerSignatureDataUrl}" alt="Seller signature" style="max-height:60px;width:100%;object-fit:contain;display:block" />
      </div>
      <div style="font-size:10px;color:#666;margin-top:4px">Signed: ${escapeHtml(signedDateStr)} at ${escapeHtml(signedTimeStr)}</div>
    </div>`;

  const result = withPrintLabel.replace(
    /<div class="sig-block">\s*<div class="sig-name">[^<]*<\/div>\s*<div class="sig-role">Horse Owner[^<]*<\/div>\s*<div class="sig-line">[^<]*<\/div>\s*<\/div>/,
    signedSellerBlock
  );

  return result;
}

export function openSignedListingAgreementWindow(
  data: ListingAgreementData,
  sellerSignatureDataUrl: string,
  signedAt?: Date | string | null,
): void {
  const html = generateSignedListingAgreementHtml(data, sellerSignatureDataUrl, signedAt);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const tab = window.open(url, "_blank");
  if (!tab) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `Signed Listing Agreement — ${data.horseName}.html`;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
