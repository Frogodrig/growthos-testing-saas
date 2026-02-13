#!/usr/bin/env bash
# ══════════════════════════════════════════════
# GrowthOS — Create Stripe Webhook Endpoint
# ══════════════════════════════════════════════
# Usage: bash scripts/setup-stripe-webhook.sh <BASE_URL>
# Example: bash scripts/setup-stripe-webhook.sh https://booker.yourdomain.com
#
# Creates a webhook endpoint in Stripe that listens for subscription events.
# Prints the webhook signing secret to add to .env.production.

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <BASE_URL>"
  echo "Example: $0 https://booker.yourdomain.com"
  exit 1
fi

BASE_URL="$1"
WEBHOOK_URL="${BASE_URL}/api/stripe/webhook"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Stripe Webhook Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Endpoint URL: ${WEBHOOK_URL}"
echo ""

# Create webhook using Stripe CLI
stripe webhook_endpoints create \
  --url "${WEBHOOK_URL}" \
  --enabled-events "customer.subscription.created,customer.subscription.updated,customer.subscription.deleted"

echo ""
echo "── Next Steps ─────────────────────────"
echo "1. Copy the webhook signing secret (whsec_...) from above"
echo "2. Add to .env.production: STRIPE_WEBHOOK_SECRET=whsec_..."
echo ""
