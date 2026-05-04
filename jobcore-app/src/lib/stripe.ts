import Stripe from "stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
}

export interface CreateInvoiceCheckoutParams {
  invoiceId: string;
  publicToken: string;
  amountDue: number; // in dollars
  invoiceNumber: string;
  customerName: string;
  customerEmail: string | null;
  orgName: string;
}

export async function createInvoiceCheckoutSession(
  params: CreateInvoiceCheckoutParams
): Promise<string> {
  const stripe = getStripeClient();

  const { invoiceId, publicToken, amountDue, invoiceNumber, customerName, customerEmail, orgName } = params;

  const amountCents = Math.round(amountDue * 100);
  if (amountCents <= 0) throw new Error("Amount must be greater than zero");

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: `Invoice ${invoiceNumber}`,
            description: `Payment to ${orgName}`,
          },
        },
      },
    ],
    customer_email: customerEmail ?? undefined,
    metadata: {
      invoiceId,
      publicToken,
      customerName,
    },
    success_url: `${APP_URL}/p/invoices/${publicToken}?paid=1`,
    cancel_url: `${APP_URL}/p/invoices/${publicToken}`,
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}
