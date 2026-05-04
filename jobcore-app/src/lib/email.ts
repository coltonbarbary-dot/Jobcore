import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@jobcore.app";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export function getEstimatePublicUrl(token: string): string {
  return `${APP_URL}/p/estimates/${token}`;
}

interface SendEstimateEmailParams {
  to: string;
  customerName: string;
  orgName: string;
  estimateNumber: string;
  title: string;
  total: number;
  token: string;
  validUntil?: Date | null;
}

export async function sendEstimateEmail(params: SendEstimateEmailParams): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Email not configured: RESEND_API_KEY is missing");
  }

  const { to, customerName, orgName, estimateNumber, title, total, token, validUntil } = params;
  const url = getEstimatePublicUrl(token);
  const formattedTotal = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(total);
  const expiryLine = validUntil
    ? `<p style="color:#6b7280;font-size:14px;">Valid until: ${validUntil.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>`
    : "";

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Estimate ${estimateNumber} from ${orgName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;">
    <div style="background:#0a0a0a;padding:24px 32px;">
      <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:600;">${orgName}</h1>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">Hi ${customerName},</p>
      <h2 style="margin:0 0 4px;color:#0a0a0a;font-size:22px;font-weight:600;">${title}</h2>
      <p style="margin:0 0 4px;color:#6b7280;font-size:14px;">Estimate ${estimateNumber}</p>
      ${expiryLine}
      <div style="margin:24px 0;padding:20px;background:#f9fafb;border-radius:6px;text-align:center;">
        <p style="margin:0 0 4px;color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:.05em;">Total Amount</p>
        <p style="margin:0;color:#0a0a0a;font-size:28px;font-weight:700;">${formattedTotal}</p>
      </div>
      <a href="${url}" style="display:block;text-align:center;background:#0a0a0a;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:6px;font-size:15px;font-weight:600;margin:24px 0;">View &amp; Approve Estimate →</a>
      <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">Or copy this link: ${url}</p>
    </div>
  </div>
</body>
</html>`,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

export function getInvoicePublicUrl(token: string): string {
  return `${APP_URL}/p/invoices/${token}`;
}

interface SendInvoiceEmailParams {
  to: string;
  customerName: string;
  orgName: string;
  invoiceNumber: string;
  amountDue: number;
  token: string;
  dueDate?: Date | null;
}

export async function sendInvoiceEmail(params: SendInvoiceEmailParams): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Email not configured: RESEND_API_KEY is missing");
  }

  const { to, customerName, orgName, invoiceNumber, amountDue, token, dueDate } = params;
  const url = getInvoicePublicUrl(token);
  const formattedAmount = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amountDue);
  const dueLine = dueDate
    ? `<p style="color:#6b7280;font-size:14px;">Due by: ${dueDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>`
    : "";

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Invoice ${invoiceNumber} from ${orgName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;">
    <div style="background:#0a0a0a;padding:24px 32px;">
      <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:600;">${orgName}</h1>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">Hi ${customerName},</p>
      <h2 style="margin:0 0 4px;color:#0a0a0a;font-size:22px;font-weight:600;">Invoice ${invoiceNumber}</h2>
      ${dueLine}
      <div style="margin:24px 0;padding:20px;background:#f9fafb;border-radius:6px;text-align:center;">
        <p style="margin:0 0 4px;color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:.05em;">Amount Due</p>
        <p style="margin:0;color:#0a0a0a;font-size:28px;font-weight:700;">${formattedAmount}</p>
      </div>
      <a href="${url}" style="display:block;text-align:center;background:#0a0a0a;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:6px;font-size:15px;font-weight:600;margin:24px 0;">View &amp; Pay Invoice →</a>
      <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">Or copy this link: ${url}</p>
    </div>
  </div>
</body>
</html>`,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
