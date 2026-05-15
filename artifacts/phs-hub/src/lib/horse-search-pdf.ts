export interface HorseSearchPdfData {
  id: number;
  firstName: string;
  surname: string;
  email: string;
  emailOptional?: string | null;
  phone: string;
  location: string;
  searchServiceLevel: string;
  formData: Record<string, unknown>;
  signatureData?: string | null;
  createdAt: string;
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

function str(formData: Record<string, unknown>, k: string): string {
  const v = formData[k];
  return v ? String(v) : "—";
}

function arr(formData: Record<string, unknown>, k: string): string {
  const v = formData[k];
  if (Array.isArray(v)) return v.join(", ") || "—";
  return v ? String(v) : "—";
}

function serviceLabel(level: string): string {
  return level === "level2"
    ? "Premium Concierge — $1,000 + 5%"
    : "Standard Search — $500 + $500";
}

const STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    background: #f0ede8;
    color: #1a1a1a;
    min-height: 100vh;
    padding: 0;
  }

  .print-bar {
    position: fixed;
    top: 0; left: 0; right: 0;
    background: #24384e;
    padding: 10px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 999;
    gap: 16px;
  }
  .print-bar-title { color: rgba(255,255,255,0.8); font-size: 13px; letter-spacing: 0.04em; }
  .print-btn {
    display: flex; align-items: center; gap: 7px;
    background: #f0ede8; color: #24384e;
    border: none; border-radius: 4px;
    padding: 7px 16px; font-size: 13px; font-weight: 600;
    cursor: pointer; white-space: nowrap;
  }
  .print-btn:hover { background: #e8e4de; }

  .page {
    max-width: 800px;
    margin: 64px auto 48px;
    background: #fff;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 2px 16px rgba(0,0,0,0.10);
  }

  .page-header {
    background: #24384e;
    padding: 28px 40px 24px;
  }
  .page-header-label {
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.55);
    margin-bottom: 6px;
  }
  .page-header-title {
    font-size: 22px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 4px;
  }
  .page-header-sub {
    font-size: 12px;
    color: rgba(255,255,255,0.5);
  }

  .page-body { padding: 32px 40px 40px; }

  .section { margin-bottom: 28px; }
  .section-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #24384e;
    border-bottom: 1.5px solid #24384e;
    padding-bottom: 5px;
    margin-bottom: 12px;
  }

  table.fields {
    width: 100%;
    border-collapse: collapse;
  }
  table.fields tr td {
    padding: 7px 0;
    font-size: 13px;
    border-bottom: 1px solid #f0ede8;
    vertical-align: top;
  }
  table.fields tr:last-child td { border-bottom: none; }
  table.fields td.label {
    width: 200px;
    color: #888;
    font-weight: 500;
    padding-right: 16px;
    white-space: nowrap;
  }
  table.fields td.value {
    color: #1a1a1a;
    white-space: pre-wrap;
  }

  .sig-wrap {
    margin-top: 8px;
    border: 1px solid #e8e4de;
    border-radius: 4px;
    display: inline-block;
    padding: 8px;
    background: #fafafa;
  }
  .sig-wrap img { max-height: 80px; display: block; }

  .footer {
    background: #f8f5f0;
    border-top: 1px solid #e8e4de;
    padding: 14px 40px;
    font-size: 10px;
    color: #aaa;
    text-align: center;
  }

  @media print {
    body { background: #fff; }
    .print-bar { display: none !important; }
    .page {
      margin: 0;
      border-radius: 0;
      box-shadow: none;
      max-width: 100%;
    }
  }
`;

function row(label: string, value: string): string {
  if (!value || value === "—") return "";
  return `
    <tr>
      <td class="label">${esc(label)}</td>
      <td class="value">${esc(value)}</td>
    </tr>`;
}

function section(title: string, rows: string[]): string {
  const body = rows.filter(Boolean).join("");
  if (!body.trim()) return "";
  return `
    <div class="section">
      <div class="section-title">${esc(title)}</div>
      <table class="fields">${body}</table>
    </div>`;
}

export function generateHorseSearchHtml(data: HorseSearchPdfData): string {
  const f = data.formData;
  const fullName = `${data.firstName} ${data.surname}`.trim();

  const contactSection = section("Contact Details", [
    row("Name", fullName),
    row("Primary Email", data.email),
    row("Secondary Email", data.emailOptional ?? ""),
    row("Phone", data.phone),
    row("Location", data.location),
    row("Search Service", serviceLabel(data.searchServiceLevel)),
    row("Submitted", fmtDatetime(data.createdAt)),
  ]);

  const aboutSection = section("About the Search", [
    row("Main reason for help", str(f, "mainReason")),
    row("Search factors", arr(f, "searchFactors")),
    row("Preferred location", str(f, "preferredLocation")),
    row("Budget", str(f, "budget")),
  ]);

  const criteriaSection = section("Horse Criteria", [
    row("Preferred age range", arr(f, "horseAgeRange")),
    row("Preferred height", arr(f, "horseHeight")),
    row("3 characteristics I like", str(f, "characteristicsLiked")),
    row("3 deal breakers", str(f, "dealBreakers")),
    row("Main discipline", str(f, "mainDiscipline")),
    row("Horse type", str(f, "horseType")),
  ]);

  const goalsSection = section("Goals & Current Level", [
    row("Rider goals", str(f, "riderGoals")),
    row("Must compete at level", str(f, "currentCompetitionLevel")),
    row("Future goals", str(f, "futureGoals")),
  ]);

  const riderSection = section("Rider Profile", [
    row("Rider competence", str(f, "riderCompetence")),
    row("How I feel riding", str(f, "ridingConfidence")),
    row("Rider history", str(f, "riderHistory")),
    row("Rider age / bracket", str(f, "riderAge")),
  ]);

  const requirementsSection = section("Horse Requirements", [
    row("Horse statements", arr(f, "horseStatements")),
  ]);

  const managementSection = section("Management & Restrictions", [
    row("Management", arr(f, "horseManagement")),
    row("Restrictions", arr(f, "searchRestrictions")),
    row("Other information", str(f, "otherInfo")),
  ]);

  const sigHtml = data.signatureData ? `
    <div class="section">
      <div class="section-title">Signature</div>
      <div class="sig-wrap"><img src="${data.signatureData}" alt="Signature" /></div>
    </div>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Horse Search — ${esc(fullName)}</title>
  <style>${STYLES}</style>
</head>
<body>

<div class="print-bar">
  <span class="print-bar-title">Horse Search Form — ${esc(fullName)} — Search #${data.id}</span>
  <button class="print-btn" onclick="window.print()">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
      <rect x="6" y="14" width="12" height="8"/>
    </svg>
    Print / Save as PDF
  </button>
</div>

<div class="page">
  <div class="page-header">
    <div class="page-header-label">Performance Horse Sales — Horse Search Form</div>
    <div class="page-header-title">${esc(fullName)}</div>
    <div class="page-header-sub">Search #${data.id} &nbsp;·&nbsp; ${fmtDate(data.createdAt)}</div>
  </div>

  <div class="page-body">
    ${contactSection}
    ${aboutSection}
    ${criteriaSection}
    ${goalsSection}
    ${riderSection}
    ${requirementsSection}
    ${managementSection}
    ${sigHtml}
  </div>

  <div class="footer">
    Performance Horse Sales — Australia &amp; New Zealand &nbsp;|&nbsp; Internal copy — Search #${data.id} &nbsp;|&nbsp; Generated ${fmtDatetime(new Date().toISOString())}
  </div>
</div>

</body>
</html>`;
}

export function openHorseSearchPrintWindow(data: HorseSearchPdfData): void {
  const html = generateHorseSearchHtml(data);
  const popup = window.open("", "_blank", "width=960,height=800,scrollbars=yes,resizable=yes");
  if (!popup) {
    alert("Pop-up blocked — please allow pop-ups for this site and try again.");
    return;
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}
