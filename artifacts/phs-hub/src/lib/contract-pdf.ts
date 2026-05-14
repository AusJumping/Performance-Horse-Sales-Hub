export interface ContractPdfData {
  horseName: string;
  salesPrice?: string | null;
  holdingDepositAmount?: string | null;
  horseDescription?: string | null;
  customClauses?: string | null;
  status?: string;
  createdAt?: string;
  submittedAt?: string | null;
  fillerName?: string | null;
  fillerEmail?: string | null;
  fillerRole?: string | null;
  sellerName?: string | null;
  sellerEmail?: string | null;
  sellerAddress?: string | null;
  sellerPhone?: string | null;
  sellerBankAccountName?: string | null;
  sellerBankBsb?: string | null;
  sellerBankAccount?: string | null;
  buyerName?: string | null;
  buyerEmail?: string | null;
  buyerAddress?: string | null;
  buyerPhone?: string | null;
  buyerSignature?: string | null;
  sellerSignature?: string | null;
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
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function fmtDatetime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const SHARED_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: Georgia, 'Times New Roman', serif;
    background: #f0ede8;
    color: #1a1a1a;
    min-height: 100vh;
    padding: 0;
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

  .title-band { background: #f8f5f0; border-bottom: 2px solid #24384e; padding: 28px 48px 24px; }
  .horse-name { font-size: 30px; font-weight: 700; color: #24384e; line-height: 1.15; letter-spacing: -0.01em; }
  .horse-meta { margin-top: 8px; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #666; display: flex; flex-wrap: wrap; gap: 0 20px; }

  .status-bar {
    padding: 10px 48px; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; letter-spacing: 0.02em;
    display: flex; align-items: center; gap: 8px;
  }
  .status-bar.submitted { background: #ecfdf5; border-bottom: 1px solid #a7f3d0; color: #065f46; }
  .status-bar.pending { background: #fdf8ef; border-bottom: 1px solid #e8dfc8; color: #8b6914; }
  .status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .submitted .status-dot { background: #10b981; }
  .pending .status-dot { background: #c89e30; }

  .sections-wrap { padding: 0 48px 40px; }

  .section { margin-top: 32px; padding-bottom: 28px; border-bottom: 1px solid #e8e4de; }
  .section:last-child { border-bottom: none; }

  .section-header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 14px; }
  .section-num {
    font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; font-weight: 700; color: #24384e;
    background: #e8f0f8; border-radius: 3px; min-width: 26px; height: 22px; padding: 0 6px;
    display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; letter-spacing: 0;
  }
  .section-title { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #24384e; }

  .price-box { background: #f8f5f0; border: 1px solid #e8dfc8; border-radius: 6px; padding: 16px 20px; text-align: center; display: inline-block; min-width: 200px; margin-bottom: 14px; }
  .price-label { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 4px; }
  .price-value { font-size: 26px; font-weight: 700; color: #24384e; font-family: 'Helvetica Neue', Arial, sans-serif; }

  .deposit-box { background: #fdf8ef; border: 1px solid #e8dfc8; border-radius: 6px; padding: 10px 16px; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; font-weight: 600; color: #8b5e0a; margin-bottom: 14px; }

  .body-text { font-size: 14px; line-height: 1.75; color: #2a2a2a; margin-bottom: 8px; }
  .body-text ul { padding-left: 24px; margin-top: 6px; }
  .body-text li { margin-bottom: 4px; }

  .horse-desc-box { background: #f8f5f0; border: 1px solid #e8e4de; border-radius: 4px; padding: 16px 18px; font-size: 13px; line-height: 1.7; color: #333; white-space: pre-wrap; word-break: break-word; max-height: none; margin-bottom: 8px; }

  .clause-item { margin-bottom: 10px; font-size: 14px; line-height: 1.7; color: #2a2a2a; }
  .clause-label { font-weight: 700; color: #1a1a1a; }

  .parties-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 0; }
  .party-block { padding: 16px 18px; border: 1px solid #e8e4de; border-radius: 4px; background: #fafaf8; }
  .party-role { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #24384e; margin-bottom: 6px; }
  .party-name { font-size: 15px; font-weight: 700; color: #1a1a1a; margin-bottom: 2px; }
  .party-detail { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #777; }

  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
  .sig-block { }
  .sig-label { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #888; margin-bottom: 8px; }
  .sig-img { border: 1px solid #e8e4de; border-radius: 4px; padding: 8px; background: #fff; max-height: 100px; width: 100%; object-fit: contain; }
  .sig-empty { border: 1px dashed #d0ccc6; border-radius: 4px; padding: 20px; background: #fafaf8; text-align: center; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #bbb; font-style: italic; }
  .sig-name { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #666; margin-top: 4px; }

  .agreed-list { margin-top: 10px; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #444; }
  .agreed-item { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .agreed-check { color: #10b981; font-size: 13px; }

  .submitted-banner {
    background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 12px 16px;
    font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #065f46; margin-bottom: 0;
    display: flex; align-items: center; gap: 10px;
  }
  .submitted-banner strong { font-weight: 700; }

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
    .section { page-break-inside: avoid; }
    .parties-grid, .sig-grid { page-break-inside: avoid; }
  }
`;

export function generateContractHtml(data: ContractPdfData): string {
  const isSubmitted = data.status === "submitted";

  const holdingText = data.holdingDepositAmount
    ? `Holding deposit due today: ${esc(data.holdingDepositAmount)}`
    : "A holding deposit is required as per our terms — 10% or minimum $1,000, whichever is higher.";

  const statusBarHtml = isSubmitted
    ? `<div class="status-bar submitted"><div class="status-dot"></div><span><strong>Signed &amp; Submitted</strong> — ${fmtDatetime(data.submittedAt)}</span></div>`
    : `<div class="status-bar pending"><div class="status-dot"></div><span>Contract preview — awaiting signature</span></div>`;

  const horseMeta: string[] = [];
  if (data.salesPrice) horseMeta.push(`Sale Price: <strong>${esc(data.salesPrice)}</strong>`);
  if (data.createdAt) horseMeta.push(`Generated: ${fmtDate(data.createdAt)}`);

  const priceHtml = data.salesPrice
    ? `<div class="price-box"><div class="price-label">Agreed Sale Price</div><div class="price-value">${esc(data.salesPrice)}</div></div>`
    : "";

  const depositBoxHtml = data.holdingDepositAmount
    ? `<div class="deposit-box">Holding deposit due today: ${esc(data.holdingDepositAmount)}<br><span style="font-weight:400;font-size:12px">As per our terms — 10% or minimum $1,000, whichever is higher</span></div>` : "";

  const horseDescHtml = data.horseDescription
    ? `<div class="horse-desc-box">${esc(data.horseDescription)}</div>`
    : `<p class="body-text" style="color:#aaa;font-style:italic">Please refer to the horse's portfolio for the full description.</p>`;

  const customClauseHtml = data.customClauses
    ? `<div class="clause-item"><span class="clause-label">Additional terms:</span> ${esc(data.customClauses)}</div>` : "";

  const hasParties = data.sellerName || data.buyerName || data.sellerAddress || data.buyerAddress;
  const partiesHtml = hasParties ? `
    <div class="section">
      <div class="section-header">
        <h2 class="section-title">Parties to the Contract</h2>
      </div>
      <div class="parties-grid">
        <div class="party-block">
          <div class="party-role">The Seller</div>
          <div class="party-name">${esc(data.sellerName) || "—"}</div>
          ${data.sellerEmail ? `<div class="party-detail">${esc(data.sellerEmail)}</div>` : ""}
          ${data.sellerAddress ? `<div class="party-detail" style="margin-top:4px">${esc(data.sellerAddress)}</div>` : ""}
          ${data.sellerPhone ? `<div class="party-detail">Ph: ${esc(data.sellerPhone)}</div>` : ""}
          ${(data.sellerBankAccountName || data.sellerBankBsb || data.sellerBankAccount) ? `
            <div style="margin-top:10px;padding-top:8px;border-top:1px solid #e8e4de">
              <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#24384e;margin-bottom:6px">Seller's Bank Details</div>
              ${data.sellerBankAccountName ? `<div class="party-detail">Account name: ${esc(data.sellerBankAccountName)}</div>` : ""}
              ${data.sellerBankBsb ? `<div class="party-detail">BSB: ${esc(data.sellerBankBsb)}</div>` : ""}
              ${data.sellerBankAccount ? `<div class="party-detail">Account: ${esc(data.sellerBankAccount)}</div>` : ""}
            </div>` : ""}
        </div>
        <div class="party-block">
          <div class="party-role">The Buyer</div>
          <div class="party-name">${esc(data.buyerName) || "—"}</div>
          ${data.buyerEmail ? `<div class="party-detail">${esc(data.buyerEmail)}</div>` : ""}
          ${data.buyerAddress ? `<div class="party-detail" style="margin-top:4px">${esc(data.buyerAddress)}</div>` : ""}
          ${data.buyerPhone ? `<div class="party-detail">Ph: ${esc(data.buyerPhone)}</div>` : ""}
        </div>
      </div>
      ${isSubmitted && data.fillerName ? `<p style="margin-top:10px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#888">Submitted by: ${esc(data.fillerName)}${data.fillerRole ? ` (${esc(data.fillerRole)})` : ""}${data.fillerEmail ? ` — ${esc(data.fillerEmail)}` : ""}</p>` : ""}
    </div>` : "";

  const signaturesHtml = isSubmitted ? `
    <div class="section">
      <div class="section-header">
        <h2 class="section-title">Signatures</h2>
      </div>
      <div class="sig-grid">
        <div class="sig-block">
          <div class="sig-label">Seller's Signature</div>
          ${data.sellerSignature
            ? `<img class="sig-img" src="${data.sellerSignature}" alt="Seller signature" /><div class="sig-name">${esc(data.sellerName) || ""}</div>`
            : `<div class="sig-empty">No signature provided</div>`}
        </div>
        <div class="sig-block">
          <div class="sig-label">Buyer's Signature</div>
          ${data.buyerSignature
            ? `<img class="sig-img" src="${data.buyerSignature}" alt="Buyer signature" /><div class="sig-name">${esc(data.buyerName) || ""}</div>`
            : `<div class="sig-empty">No signature provided</div>`}
        </div>
      </div>
      ${isSubmitted ? `
      <div class="submitted-banner" style="margin-top:20px">
        <svg style="width:18px;height:18px;flex-shrink:0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <span><strong>Contract submitted</strong> on ${fmtDatetime(data.submittedAt)}</span>
      </div>` : ""}
    </div>` : "";

  const titleBandMeta = horseMeta.length
    ? `<div class="horse-meta">${horseMeta.map(m => `<span class="horse-meta-item" style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#666">${m}</span>`).join("")}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Contract of Sale — ${esc(data.horseName)} — Performance Horse Sales</title>
<style>${SHARED_STYLES}</style>
</head>
<body>

<div class="print-bar">
  <span class="print-bar-title">Contract of Sale — ${esc(data.horseName)}</span>
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
      <div class="doc-type">Contract of Sale</div>
      ${data.createdAt ? `<div class="doc-ref">Generated ${fmtDate(data.createdAt)}</div>` : ""}
    </div>
  </div>

  <div class="title-band">
    <div class="horse-name">${esc(data.horseName) || "Unnamed Horse"}</div>
    ${titleBandMeta}
  </div>

  ${statusBarHtml}

  <div class="sections-wrap">

    <div class="section">
      <div class="section-header">
        <span class="section-num">1a</span>
        <h2 class="section-title">Sales Price</h2>
      </div>
      ${priceHtml}
      <p class="body-text">In consideration of the following sum, once paid and 'cleared' into the seller's bank account, the Seller hereby sells to the Purchaser the animal described in Section 2.</p>
    </div>

    <div class="section">
      <div class="section-header">
        <h2 class="section-title">Holding Deposit Terms</h2>
      </div>
      ${depositBoxHtml}
      <div class="body-text">
        <p><strong>Holding deposits are refundable if:</strong></p>
        <ul>
          <li>the horse is found to be 'not fit for the purpose intended'; lame; and/or 'moderate to high risk for the intended purpose' by a vet, and this is recorded in writing on a formal vet check and the vet check and x-rays are forwarded to the seller for confirmation; and/or</li>
          <li>the horse is not 'as described' in this contract, at the second viewing.</li>
        </ul>
        <p style="margin-top:10px">Remaining payment of ${data.salesPrice ? `<strong>${esc(data.salesPrice)}</strong> less holding deposit` : "<strong>the agreed balance</strong>"} due within 24 hours of receiving the vet check report, if the potential buyer chooses to proceed with the sale — or, if vetting is not taking place, within 24 hours of the deposit being paid.</p>
        <p style="margin-top:10px"><strong>Please note:</strong></p>
        <ul>
          <li>until the deposit has been paid, viewings will still take place and the horse will continue to be actively marketed;</li>
          <li>once the deposit has been paid, the horse will be 'held' for the buyer as per our terms re vetting etc; and</li>
          <li>once fully paid for, the horse will be marked as sold.</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <span class="section-num">2</span>
        <h2 class="section-title">Horse Description</h2>
      </div>
      <p class="body-text" style="color:#888;font-style:italic;margin-bottom:10px">As per portfolio / advertisement.</p>
      ${horseDescHtml}
      <p class="body-text" style="margin-top:8px">Please see the Owner's Response Certificate, in the horse's portfolio, for more detailed information.</p>
    </div>

    <div class="section">
      <div class="section-header">
        <span class="section-num">3</span>
        <h2 class="section-title">Warranties &amp; Conditions of Sale</h2>
      </div>
      <div class="body-text">
        <p>The Seller warrants that (1) the Seller is the legal owner of the Animal; (2) the Animal is free from all liens and encumbrances; (3) the Seller has full right and authority to sell and transfer the Animal; and (4) the Seller will warrant and defend the title of the Animal against any and all claims and demands of all persons.</p>
        <p style="margin-top:8px">The Animal is being sold in an 'as is' condition and the Seller expressly disclaims all warranties, whether expressed or implied. Further, the Seller disclaims any warranty as to the condition of the Animal.</p>
        <p style="margin-top:8px">The Purchaser has been given the opportunity to have a pre-purchase examination performed by a veterinarian of the Purchaser's choice at the Purchaser's expense prior to the execution of this Bill of Sale.</p>
        <p style="margin-top:8px">In the event that the Purchaser elects not to have a veterinarian perform a pre-purchase examination of the Animal, the Purchaser waives any and all rights, claims or causes of action against the Seller for any patent or latent defects pertaining to the Animal.</p>
        <p style="margin-top:8px">The Purchaser has been given the opportunity to inspect the Animal or to have it inspected and the Purchaser has accepted the Animal in its existing condition. This Bill of Sale will be construed in accordance with and governed by the laws of the Commonwealth of Australia.</p>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <span class="section-num">4</span>
        <h2 class="section-title">Additional Clauses</h2>
      </div>
      <div class="clause-item"><span class="clause-label">Clause 1:</span> The horse is presented and described by the seller; purchased directly from the seller; and payment is made directly to the seller.</div>
      <div class="clause-item"><span class="clause-label">Clause 2:</span> Once paid for, the horse becomes the responsibility of the buyer. This includes but is not limited to financial responsibility, third party liability, vet and feed bills. PHS highly recommends that the buyer insure as soon as possible with International Racehorse Transport Insurance, which can be done and paid for online.</div>
      <div class="clause-item"><span class="clause-label">Clause 3:</span> The horse will stay at the seller's property under an 'agistment' arrangement until the buyer can organise transport to their home. Depending on the length of time and individual situation, this arrangement may attract fees at market rates.</div>
      ${customClauseHtml}
    </div>

    <div class="section">
      <div class="section-header">
        <span class="section-num">5</span>
        <h2 class="section-title">Declarations</h2>
      </div>
      <div class="clause-item">
        <span class="clause-label">Seller's Declaration:</span> I declare that I am over the age of 18; I am legally responsible for the sale of this horse and am legally entitled to receive the funds for this sale. I declare that I transfer the ownership of this horse to the buyer listed, once funds have cleared.
      </div>
      <div class="clause-item" style="margin-top:10px">
        <span class="clause-label">Buyer's Declaration:</span> I declare that I am over the age of 18 and I am legally responsible for the decisions regarding the assessment and purchase of this horse. I declare that I am able to complete this sale financially and have the ability and funds to look after this horse whilst under my ownership.
      </div>
    </div>

    ${partiesHtml}
    ${signaturesHtml}

  </div>

  <div class="doc-footer">
    <span class="footer-brand">Performance Horse Sales</span>
    <span class="footer-conf">Australia &amp; New Zealand — Confidential</span>
  </div>

</div>

</body>
</html>`;
}

export function openContractPrintWindow(data: ContractPdfData): void {
  const html = generateContractHtml(data);
  const popup = window.open("", "_blank", "width=960,height=800,scrollbars=yes,resizable=yes");
  if (!popup) {
    alert("Please allow pop-ups to open the contract document.");
    return;
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}
