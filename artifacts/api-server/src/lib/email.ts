import nodemailer from "nodemailer";
import { logger } from "./logger.js";

function createTransport() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
}

interface AckEmailOptions {
  to: string;
  firstName: string;
  formType: "seller" | "eoi" | "search";
  horseName?: string;
}

function buildHtml(firstName: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0ede8;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ede8;padding:32px 0">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:4px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">

        <!-- Header -->
        <tr><td style="background:#24384e;padding:28px 40px">
          <p style="margin:0;font-size:18px;font-weight:700;color:#fff;letter-spacing:0.03em">Performance Horse Sales</p>
          <p style="margin:4px 0 0;font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:0.14em;text-transform:uppercase">Australia &amp; New Zealand</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px 28px">
          <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a">Hi ${firstName},</p>
          <p style="margin:0 0 16px;font-size:15px;color:#333;line-height:1.7">
            Thank you for submitting your form to Performance Horse Sales. We've received your information and appreciate you taking the time to complete it.
          </p>
          <p style="margin:0 0 16px;font-size:15px;color:#333;line-height:1.7">
            We will review your submission and be in contact within the next 24 hours.
          </p>
          <p style="margin:0 0 24px;font-size:15px;color:#333;line-height:1.7">
            In the meantime, if you have any urgent questions, please feel free to reply to this email or contact us directly on <strong>0428 239 317</strong>.
          </p>
          <p style="margin:0;font-size:15px;color:#333;line-height:1.7">
            We appreciate your enquiry and look forward to speaking with you soon.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8f5f0;padding:16px 40px;border-top:1px solid #e8e4de">
          <p style="margin:0;font-size:11px;color:#aaa;text-align:center">
            Performance Horse Sales — Australia &amp; New Zealand &nbsp;|&nbsp; This is an automated confirmation email.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildText(firstName: string): string {
  return [
    `Hi ${firstName},`,
    "",
    "Thank you for submitting your form to Performance Horse Sales. We've received your information and appreciate you taking the time to complete it.",
    "",
    "We will review your submission and be in contact within the next 24 hours.",
    "",
    "In the meantime, if you have any urgent questions, please feel free to reply to this email or contact us directly on 0428 239 317.",
    "",
    "We appreciate your enquiry and look forward to speaking with you soon.",
  ].join("\n");
}

export async function sendAcknowledgementEmail(opts: AckEmailOptions): Promise<void> {
  const transport = createTransport();
  if (!transport) {
    logger.warn("SMTP not configured — skipping acknowledgement email", { to: opts.to });
    return;
  }

  const fromAddress = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@performancehorsesales.com.au";
  const subject =
    opts.formType === "seller" ? "We've received your listing submission — Performance Horse Sales" :
    opts.formType === "eoi"    ? "We've received your expression of interest — Performance Horse Sales" :
                                 "We've received your horse search request — Performance Horse Sales";

  try {
    await transport.sendMail({
      from: `"Performance Horse Sales" <${fromAddress}>`,
      to: opts.to,
      subject,
      html: buildHtml(opts.firstName),
      text: buildText(opts.firstName),
    });
    logger.info("Acknowledgement email sent", { to: opts.to, formType: opts.formType });
  } catch (err) {
    logger.error("Failed to send acknowledgement email", { to: opts.to, err });
  }
}
