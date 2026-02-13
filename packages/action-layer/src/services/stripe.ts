import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is required");
    }
    stripeInstance = new Stripe(secretKey);
  }
  return stripeInstance;
}

export async function createStripeCustomer(
  tenantId: string,
  email: string,
  name: string
): Promise<string> {
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { tenantId },
  });

  console.log(`[Stripe] Created customer=${customer.id} for tenant=${tenantId}`);
  return customer.id;
}

export async function createCheckoutSession(
  stripeCustomerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  console.log(`[Stripe] Created checkout session=${session.id} for customer=${stripeCustomerId}`);
  return session.url || "";
}

export interface StripeWebhookEvent {
  type: string;
  customerId: string;
  subscriptionStatus: string;
}

export function constructWebhookEvent(
  body: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is required");
  }
  return stripe.webhooks.constructEvent(body, signature, webhookSecret);
}

export function parseSubscriptionEvent(event: Stripe.Event): StripeWebhookEvent | null {
  const relevantTypes = [
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ];

  if (!relevantTypes.includes(event.type)) {
    return null;
  }

  const subscription = event.data.object as Stripe.Subscription;

  return {
    type: event.type,
    customerId: subscription.customer as string,
    subscriptionStatus: subscription.status,
  };
}
