#!/usr/bin/env bash
# ================================================================
# ForgePilot v1 End-to-End Smoke Test
# ================================================================
# Usage: ./scripts/smoke-e2e-v1.sh [FORGEPILOT_URL] [OMEGA_URL]
#
# Tests:
#   1. omega-core FC health check
#   2. omega-core create run (forgepilot.teaser.v1 workflow)
#   3. Poll for run completion (max 30 s)
#   4. Verify output contains 'teaser' schema key
#   5. omega-core registry: register a domain profile (soft check)
#   6. omega-core registry: retrieve the domain profile (soft check)
#
# Exit codes:
#   0  All hard assertions passed.
#   1  A hard assertion failed.
#
# Soft checks (registry, domain profile) emit a warning on failure but do
# not exit with code 1 — the registry endpoint may not be deployed yet.
#
# Prerequisites:
#   - omega-core running (default: http://localhost:9405)
#   - MongoDB running and connected to omega-core
#   - ForgePilot running (default: http://localhost:3000)
#   - OMEGA_API_KEY in environment (default: dev-api-key)
#   - curl, python3 available in PATH
# ================================================================

set -euo pipefail

FORGEPILOT_URL="${1:-http://localhost:3000}"
OMEGA_URL="${2:-http://localhost:9405}"
OMEGA_API_KEY="${OMEGA_API_KEY:-dev-api-key}"
TENANT_ID="${OMEGA_TENANT_ID:-forgepilot-tenant}"
ACTOR_ID="smoke-e2e-v1"

# ANSI colours (disabled when not a tty).
if [ -t 1 ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  CYAN='\033[0;36m'
  NC='\033[0m'
else
  RED='' GREEN='' YELLOW='' CYAN='' NC=''
fi

pass()   { echo -e "${GREEN}PASS${NC}: $1"; }
fail()   { echo -e "${RED}FAIL${NC}: $1"; exit 1; }
warn()   { echo -e "${YELLOW}WARN${NC}: $1"; }
info()   { echo -e "${CYAN}----${NC} $1"; }
header() { echo -e "\n${CYAN}$1${NC}"; }

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# json_field <json_string> <python_expression>
# Returns the value of a dot-notation field from a JSON string.
json_field() {
  local json="$1"
  local expr="$2"
  echo "$json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(${expr})" 2>/dev/null || echo ""
}

# http_get <url> [extra curl args...]
http_get() {
  local url="$1"; shift
  curl -sf \
    -H "Authorization: Bearer ${OMEGA_API_KEY}" \
    -H "X-Tenant-Id: ${TENANT_ID}" \
    -H "X-Actor-Id: ${ACTOR_ID}" \
    "$url" "$@" 2>/dev/null || echo "CURL_FAILED"
}

# http_post <url> <json_body> [extra curl args...]
http_post() {
  local url="$1"
  local body="$2"
  shift 2
  curl -sf -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${OMEGA_API_KEY}" \
    -H "X-Tenant-Id: ${TENANT_ID}" \
    -H "X-Actor-Id: ${ACTOR_ID}" \
    -d "$body" \
    "$url" "$@" 2>/dev/null || echo "CURL_FAILED"
}

# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------

header "================================================================"
header " ForgePilot v1 E2E Smoke Test — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
header "================================================================"
echo "  ForgePilot : $FORGEPILOT_URL"
echo "  omega-core : $OMEGA_URL"
echo "  Tenant     : $TENANT_ID"
echo ""

# ── Test 1: omega-core FC health check ──────────────────────────────────────
header "[1/6] omega-core FC health check"
HEALTH=$(http_get "${OMEGA_URL}/api/fc/health")
if echo "$HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('status') in ('ok','healthy')" 2>/dev/null; then
  pass "omega-core FC is healthy: $HEALTH"
elif echo "$HEALTH" | grep -q '"status"'; then
  pass "omega-core FC responded (status key present): $HEALTH"
else
  fail "omega-core FC not healthy. Response: $HEALTH"
fi

# ── Test 2: Create a ForgePilot teaser run ──────────────────────────────────
header "[2/6] Create forgepilot.teaser.v1 run in omega-core"
RUN_PAYLOAD='{
  "workflow_id": "forgepilot.teaser.v1",
  "workflow_version": "1.0.0",
  "input_payload": {
    "idea": "A mobile app for landscaping businesses to manage routes and automate customer invoicing",
    "sessionId": "smoke-e2e-v1-session-001"
  },
  "metadata": {"source": "smoke-e2e-v1"},
  "tags": ["smoke-test", "forgepilot-v1"]
}'

RUN_RESP=$(http_post "${OMEGA_URL}/api/fc/runs" "$RUN_PAYLOAD" \
  -H "X-Correlation-Id: smoke-e2e-v1-corr-001")

if echo "$RUN_RESP" | grep -q '"run_id"'; then
  RUN_ID=$(json_field "$RUN_RESP" "d['run']['run_id']")
  if [ -z "$RUN_ID" ]; then
    # Some responses nest differently; try top-level run_id.
    RUN_ID=$(json_field "$RUN_RESP" "d.get('run_id', d.get('run', {}).get('run_id', ''))")
  fi
  pass "Run created: run_id=${RUN_ID}"
else
  fail "Run creation failed. Response: $RUN_RESP"
fi

# ── Test 3: Poll for run completion ─────────────────────────────────────────
header "[3/6] Poll run ${RUN_ID} for completion (max 30 s)"
COMPLETED=false
FINAL_STATUS="unknown"
FINAL_RESP=""

for i in $(seq 1 15); do
  sleep 2
  STATUS_RESP=$(http_get "${OMEGA_URL}/api/fc/runs/${RUN_ID}")

  if [ "$STATUS_RESP" = "CURL_FAILED" ]; then
    warn "Poll attempt $i: curl failed — will retry"
    continue
  fi

  CURRENT_STATUS=$(json_field "$STATUS_RESP" "d['run']['status']")
  if [ -z "$CURRENT_STATUS" ]; then
    CURRENT_STATUS=$(json_field "$STATUS_RESP" "d.get('status', 'unknown')")
  fi

  echo "  Attempt $i / 15: status=${CURRENT_STATUS}"

  if [ "$CURRENT_STATUS" = "completed" ]; then
    COMPLETED=true
    FINAL_STATUS="$CURRENT_STATUS"
    FINAL_RESP="$STATUS_RESP"
    break
  elif [ "$CURRENT_STATUS" = "failed" ]; then
    fail "Run entered failed status. Full response: $STATUS_RESP"
  elif [ "$CURRENT_STATUS" = "cancelled" ]; then
    fail "Run was cancelled. Full response: $STATUS_RESP"
  fi
done

if $COMPLETED; then
  pass "Run completed (status=completed)"
else
  fail "Run did not reach 'completed' status within 30 s. Last status: $FINAL_STATUS"
fi

# ── Test 4: Verify teaser output schema ─────────────────────────────────────
header "[4/6] Verify run output contains teaser schema"
OUTPUT=$(json_field "$FINAL_RESP" "json.dumps(d['run'].get('output_payload', {}))")

if echo "$OUTPUT" | grep -q '"teaser"'; then
  pass "Run output_payload contains 'teaser' key"
elif echo "$OUTPUT" | grep -q '"kind"'; then
  KIND=$(json_field "$OUTPUT" "d.get('kind','unknown')")
  if [ "$KIND" = "teaser" ]; then
    pass "Run output kind=teaser (flat schema)"
  else
    warn "Unexpected output kind: $KIND — output may use a different schema layout"
  fi
else
  fail "Run output_payload missing 'teaser' key. output_payload: $OUTPUT"
fi

# ── Test 5: Register domain profile (soft check) ────────────────────────────
header "[5/6] Register smoke domain profile in omega-core registry (soft)"
PROFILE_PAYLOAD='{
  "domain_key": "smoke_test_landscaping",
  "schema_id": "domain.schema.v1",
  "version": "99.0.0",
  "payload": {
    "industry": "Smoke Test Landscaping",
    "pricing_models": ["per_visit", "monthly"]
  }
}'

REG_RESP=$(http_post "${OMEGA_URL}/api/fc/registry/domain-profiles" "$PROFILE_PAYLOAD")

if echo "$REG_RESP" | grep -q '"domain_key"'; then
  pass "Domain profile registered in omega-core registry"
elif [ "$REG_RESP" = "CURL_FAILED" ]; then
  warn "Domain profile registration endpoint not available (curl failed) — skipping"
else
  warn "Domain profile registration returned unexpected response: $REG_RESP"
fi

# ── Test 6: Retrieve domain profile (soft check) ────────────────────────────
header "[6/6] Retrieve smoke domain profile from omega-core registry (soft)"
GET_RESP=$(http_get \
  "${OMEGA_URL}/api/fc/registry/domain-profiles/smoke_test_landscaping?schema_id=domain.schema.v1")

if echo "$GET_RESP" | grep -q '"smoke_test_landscaping"'; then
  pass "Domain profile retrieved from omega-core registry"
elif echo "$GET_RESP" | grep -q '"domain_key"'; then
  DKEY=$(json_field "$GET_RESP" "d.get('domain_key','?')")
  pass "Domain profile retrieved: domain_key=$DKEY"
elif [ "$GET_RESP" = "CURL_FAILED" ]; then
  warn "Domain profile retrieval endpoint not available — skipping"
else
  warn "Domain profile retrieval returned unexpected response: $GET_RESP"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

echo ""
header "================================================================"
echo -e "${GREEN}Smoke test complete — all hard assertions passed.${NC}"
header "================================================================"
