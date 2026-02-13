/**
 * ══════════════════════════════════════════════
 * GrowthOS — Production Integration Verifier
 * ══════════════════════════════════════════════
 * Run: npx tsx scripts/verify-integrations-production.ts
 *
 * Validates that all production integrations are correctly configured
 * WITHOUT sending real emails or creating real events.
 */

import { Resend } from "resend";
import { google } from "googleapis";
import Stripe from "stripe";

interface TestResult {
  name: string;
  status: "PASS" | "FAIL";
  detail: string;
}

const results: TestResult[] = [];

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return results.push({ name: "Gemini API", status: "FAIL", detail: "GEMINI_API_KEY not set" });

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (res.ok) {
      const data = await res.json() as any;
      const models = data.models?.map((m: any) => m.name).slice(0, 3).join(", ");
      results.push({ name: "Gemini API", status: "PASS", detail: `Connected. Models: ${models}...` });
    } else {
      results.push({ name: "Gemini API", status: "FAIL", detail: `HTTP ${res.status}: ${await res.text()}` });
    }
  } catch (err: any) {
    results.push({ name: "Gemini API", status: "FAIL", detail: err.message });
  }
}

async function testResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return results.push({ name: "Resend Email", status: "FAIL", detail: "RESEND_API_KEY not set" });

  try {
    const resend = new Resend(apiKey);
    // List domains to check API key is valid and domain is verified
    const { data } = await resend.domains.list();
    if (data && data.data && data.data.length > 0) {
      const domains = data.data.map((d: any) => `${d.name} (${d.status})`).join(", ");
      const verified = data.data.some((d: any) => d.status === "verified");
      results.push({
        name: "Resend Email",
        status: verified ? "PASS" : "FAIL",
        detail: verified ? `Verified domains: ${domains}` : `No verified domains: ${domains}. Add SPF + DKIM DNS records.`,
      });
    } else {
      results.push({ name: "Resend Email", status: "FAIL", detail: "No domains configured. Add a domain in Resend dashboard." });
    }
  } catch (err: any) {
    results.push({ name: "Resend Email", status: "FAIL", detail: err.message });
  }
}

async function testGoogleCalendar() {
  const creds = process.env.GOOGLE_CALENDAR_CREDENTIALS;
  if (!creds) return results.push({ name: "Google Calendar", status: "FAIL", detail: "GOOGLE_CALENDAR_CREDENTIALS not set" });

  try {
    const credentials = JSON.parse(creds);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
    const client = await auth.getClient();
    // Just verify auth works — list calendars
    const calendar = google.calendar({ version: "v3", auth: client as any });
    const res = await calendar.calendarList.list({ maxResults: 3 });
    const count = res.data.items?.length || 0;
    results.push({ name: "Google Calendar", status: "PASS", detail: `Authenticated. ${count} calendar(s) accessible.` });
  } catch (err: any) {
    results.push({ name: "Google Calendar", status: "FAIL", detail: err.message });
  }
}

async function testStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return results.push({ name: "Stripe Billing", status: "FAIL", detail: "STRIPE_SECRET_KEY not set" });

  try {
    const stripe = new Stripe(key);
    const mode = key.startsWith("sk_live_") ? "LIVE" : "TEST";

    // Verify key works by listing products
    const products = await stripe.products.list({ limit: 5 });
    const count = products.data.length;

    // Check price IDs
    const prices = [
      { env: "STRIPE_PRICE_ID_BOOKER", value: process.env.STRIPE_PRICE_ID_BOOKER },
      { env: "STRIPE_PRICE_ID_LEADQUALIFIER", value: process.env.STRIPE_PRICE_ID_LEADQUALIFIER },
      { env: "STRIPE_PRICE_ID_FOLLOWUP", value: process.env.STRIPE_PRICE_ID_FOLLOWUP },
    ];

    const missingPrices = prices.filter((p) => !p.value || !p.value.startsWith("price_"));
    if (missingPrices.length > 0) {
      results.push({
        name: "Stripe Billing",
        status: "FAIL",
        detail: `${mode} mode, ${count} products. Missing price IDs: ${missingPrices.map((p) => p.env).join(", ")}`,
      });
    } else {
      results.push({ name: "Stripe Billing", status: "PASS", detail: `${mode} mode. ${count} products. All 3 price IDs configured.` });
    }
  } catch (err: any) {
    results.push({ name: "Stripe Billing", status: "FAIL", detail: err.message });
  }
}

async function main() {
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Production Integration Verification");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  await testGemini();
  await testResend();
  await testGoogleCalendar();
  await testStripe();

  for (const r of results) {
    const icon = r.status === "PASS" ? "✓" : "✗";
    const color = r.status === "PASS" ? "\x1b[32m" : "\x1b[31m";
    console.log(`  ${color}${icon}\x1b[0m ${r.name}: ${r.detail}`);
  }

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log("");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("");

  if (failed > 0) process.exit(1);
}

main().catch(console.error);
