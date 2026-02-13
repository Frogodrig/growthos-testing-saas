/**
 * ══════════════════════════════════════════════
 * GrowthOS — Create Stripe Products & Prices
 * ══════════════════════════════════════════════
 * Run: npx tsx scripts/setup-stripe-products.ts
 *
 * Creates the 3 SaaS products in Stripe and prints
 * the price IDs to paste into .env.production.
 *
 * Uses STRIPE_SECRET_KEY from env (test or live mode).
 */

import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error("Error: STRIPE_SECRET_KEY is not set");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

const PRODUCTS = [
  {
    name: "AI Booker",
    description: "AI-powered lead qualification and meeting scheduling",
    envKey: "STRIPE_PRICE_ID_BOOKER",
    priceAmount: 4900, // $49/month
  },
  {
    name: "AI Lead Qualifier",
    description: "AI-powered lead scoring and qualification",
    envKey: "STRIPE_PRICE_ID_LEADQUALIFIER",
    priceAmount: 2900, // $29/month
  },
  {
    name: "AI FollowUp",
    description: "AI-powered automated follow-up emails",
    envKey: "STRIPE_PRICE_ID_FOLLOWUP",
    priceAmount: 1900, // $19/month
  },
];

async function main() {
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Stripe Product Setup");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  const mode = STRIPE_SECRET_KEY.startsWith("sk_live_") ? "LIVE" : "TEST";
  console.log(`  Mode: ${mode}`);
  console.log("");

  const results: { envKey: string; priceId: string }[] = [];

  for (const p of PRODUCTS) {
    console.log(`Creating product: ${p.name}...`);

    const product = await stripe.products.create({
      name: p.name,
      description: p.description,
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: p.priceAmount,
      currency: "usd",
      recurring: { interval: "month" },
    });

    results.push({ envKey: p.envKey, priceId: price.id });
    console.log(`  ✓ ${p.name} — $${p.priceAmount / 100}/mo — ${price.id}`);
  }

  console.log("");
  console.log("── Add to .env.production ─────────────");
  for (const r of results) {
    console.log(`${r.envKey}=${r.priceId}`);
  }
  console.log("");
  console.log("Done.");
}

main().catch((err) => {
  console.error("Stripe setup failed:", err.message);
  process.exit(1);
});
