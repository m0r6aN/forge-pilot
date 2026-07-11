param(
    [switch]$RunStagingE2E = $false,
    [string]$ApiBaseUrl = "http://localhost:8000"
)

$ErrorActionPreference = "Stop"

Write-Host "[gate] contract tests"
pytest tests/contracts -q

Write-Host "[gate] trace continuity"
pytest tests/integration/test_campaign_flow.py::TestCorrelationID::test_trace_id_continuity -q

Write-Host "[gate] idempotency"
pytest tests/integration/test_campaign_flow.py::TestCorrelationID::test_idempotency_conflict -q

if ($RunStagingE2E) {
    Write-Host "[gate] E2E-1"
    python tests/e2e/run_e2e.py --scenario E2E-1 --base-url $ApiBaseUrl
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    Write-Host "[gate] E2E-2"
    python tests/e2e/run_e2e.py --scenario E2E-2 --base-url $ApiBaseUrl
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "[gate] all pass"
