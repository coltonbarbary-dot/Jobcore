import { headers } from "next/headers";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { recordPayment } from "@/lib/services/invoices";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new Response("Missing STRIPE_WEBHOOK_SECRET", { status: 500 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return new Response("Missing STRIPE_SECRET_KEY", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2026-04-22.dahlia" });

  const headerPayload = await headers();
  const sig = headerPayload.get("stripe-signature");
  if (!sig) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return new Response("Invalid webhook signature", { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const invoiceId = session.metadata?.invoiceId;
      if (!invoiceId) {
        return new Response("No invoiceId in metadata", { status: 400 });
      }

      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;

      // Idempotency: if we already recorded this payment intent, skip
      if (paymentIntentId) {
        const existing = await db.payment.findUnique({
          where: { stripePaymentIntentId: paymentIntentId },
        });
        if (existing) {
          return new Response("OK (duplicate)", { status: 200 });
        }
      }

      const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) {
        return new Response("Invoice not found", { status: 404 });
      }

      const amountCents = session.amount_total ?? 0;
      const amountDollars = amountCents / 100;

      await recordPayment(
        invoice.organizationId,
        "system",
        invoiceId,
        {
          amount: amountDollars,
          method: "stripe",
          paidAt: new Date(),
        },
        paymentIntentId ?? undefined
      );
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return new Response("Internal error", { status: 500 });
  }
}
