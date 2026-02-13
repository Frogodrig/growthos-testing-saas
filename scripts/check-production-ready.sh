#!/usr/bin/env bash
# ══════════════════════════════════════════════
# GrowthOS Production Readiness Checker
# ══════════════════════════════════════════════
# Usage: bash scripts/check-production-ready.sh
# Validates all required env vars and configs before deployment.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

check() {
  local label="$1"
  local var="$2"
  local value="${!var:-}"

  if [ -z "$value" ]; then
    echo -e "  ${RED}✗${NC} $label ($var is not set)"
    ((FAIL++))
  elif [[ "$value" == *"your-"* ]] || [[ "$value" == *"GENERATE"* ]] || [[ "$value" == *"password"* && "$var" == "DATABASE_URL" ]]; then
    echo -e "  ${YELLOW}⚠${NC} $label ($var has placeholder value)"
    ((WARN++))
  else
    echo -e "  ${GREEN}✓${NC} $label"
    ((PASS++))
  fi
}

check_optional() {
  local label="$1"
  local var="$2"
  local value="${!var:-}"

  if [ -z "$value" ]; then
    echo -e "  ${YELLOW}⚠${NC} $label ($var not set — optional)"
    ((WARN++))
  else
    echo -e "  ${GREEN}✓${NC} $label"
    ((PASS++))
  fi
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GrowthOS Production Readiness Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Load .env.production if it exists
if [ -f ".env.production" ]; then
  echo -e "${GREEN}Found .env.production — loading...${NC}"
  set -a
  source .env.production
  set +a
elif [ -f ".env" ]; then
  echo -e "${YELLOW}No .env.production found, loading .env${NC}"
  set -a
  source .env
  set +a
else
  echo -e "${RED}No .env.production or .env found!${NC}"
fi
echo ""

echo "── Infrastructure ──────────────────────"
check "Database URL" "DATABASE_URL"
check "Redis URL" "REDIS_URL"
echo ""

echo "── Authentication ─────────────────────"
check "JWT Secret" "JWT_SECRET"
echo ""

echo "── AI (Gemini) ────────────────────────"
check "Gemini API Key" "GEMINI_API_KEY"
echo ""

echo "── Email (Resend) ─────────────────────"
check "Resend API Key" "RESEND_API_KEY"
echo ""

echo "── Calendar (Google) ────────────────────"
check "Google Calendar Credentials" "GOOGLE_CALENDAR_CREDENTIALS"
echo ""

echo "── Billing (Stripe) ───────────────────"
check "Stripe Secret Key" "STRIPE_SECRET_KEY"
check "Stripe Webhook Secret" "STRIPE_WEBHOOK_SECRET"
check "Stripe Price ID — Booker" "STRIPE_PRICE_ID_BOOKER"
check "Stripe Price ID — Lead Qualifier" "STRIPE_PRICE_ID_LEADQUALIFIER"
check "Stripe Price ID — FollowUp" "STRIPE_PRICE_ID_FOLLOWUP"
echo ""

echo "── Observability (optional) ─────────────"
check_optional "Sentry DSN" "SENTRY_DSN"
echo ""

echo "── Runtime ────────────────────────────"
if [ "${NODE_ENV:-}" = "production" ]; then
  echo -e "  ${GREEN}✓${NC} NODE_ENV=production"
  ((PASS++))
else
  echo -e "  ${RED}✗${NC} NODE_ENV is '${NODE_ENV:-not set}' (must be 'production')"
  ((FAIL++))
fi
echo ""

echo "── Build Check ────────────────────────"
if npx turbo build --dry-run > /dev/null 2>&1; then
  echo -e "  ${GREEN}✓${NC} Turbo build graph is valid"
  ((PASS++))
else
  echo -e "  ${RED}✗${NC} Turbo build graph has errors"
  ((FAIL++))
fi
echo ""

echo "── Security ───────────────────────────"
if [ "${NODE_ENV:-}" = "production" ]; then
  echo -e "  ${GREEN}✓${NC} Dev routes disabled (NODE_ENV=production)"
  ((PASS++))
else
  echo -e "  ${YELLOW}⚠${NC} Dev routes will be ENABLED (NODE_ENV != production)"
  ((WARN++))
fi

if [[ "${JWT_SECRET:-}" != "dev-secret-change-in-production" && -n "${JWT_SECRET:-}" ]]; then
  echo -e "  ${GREEN}✓${NC} JWT secret is not the dev default"
  ((PASS++))
else
  echo -e "  ${RED}✗${NC} JWT secret is the dev default — CHANGE IT!"
  ((FAIL++))
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  Results: ${GREEN}${PASS} passed${NC} | ${YELLOW}${WARN} warnings${NC} | ${RED}${FAIL} failed${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}NOT READY for production. Fix the failures above.${NC}"
  exit 1
else
  echo -e "${GREEN}Ready for deployment (review warnings if any).${NC}"
  exit 0
fi
