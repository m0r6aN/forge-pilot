# Quick test runner for ForgePilot API (PowerShell)
# This is the fucking way!

param(
    [string]$TestType = "all"
)

Write-Host "==============================================" -ForegroundColor Green
Write-Host "  ForgePilot API Test Suite Runner" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""

# Check if federation_core is running
Write-Host "Checking federation_core health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -Method Get -TimeoutSec 5 -UseBasicParsing
    Write-Host "✓ federation_core is running" -ForegroundColor Green
} catch {
    Write-Host "✗ federation_core is not accessible" -ForegroundColor Red
    Write-Host "Please start federation_core first:"
    Write-Host "  docker-compose up -d federation_core"
    exit 1
}

# Set environment variables
$env:FEDERATION_URL = if ($env:FEDERATION_URL) { $env:FEDERATION_URL } else { "http://localhost:3000" }
Write-Host "Using FEDERATION_URL: $($env:FEDERATION_URL)"
Write-Host ""

switch ($TestType) {
    "all" {
        Write-Host "Running all tests..." -ForegroundColor Yellow
        pytest -v
    }
    "integration" {
        Write-Host "Running integration tests..." -ForegroundColor Yellow
        pytest -m integration -v
    }
    "genesis" {
        Write-Host "Running Genesis Protocol tests..." -ForegroundColor Yellow
        pytest -m genesis -v
    }
    "e2e" {
        Write-Host "Running end-to-end tests..." -ForegroundColor Yellow
        pytest -m e2e -v
    }
    "contracts" {
        Write-Host "Running contract tests..." -ForegroundColor Yellow
        pytest -m contracts -v
    }
    "success-metrics" {
        Write-Host "Running Success Metric validation tests..." -ForegroundColor Yellow
        Write-Host "Testing Success Metric #2: Multi-Titan Collaboration" -ForegroundColor Yellow
        pytest -k test_multi_titan_collaboration -v
        Write-Host ""
        Write-Host "Testing Success Metric #4: Genesis Protocol" -ForegroundColor Yellow
        pytest -k test_success_metric_4 -v
    }
    "quick" {
        Write-Host "Running quick smoke tests..." -ForegroundColor Yellow
        pytest tests/integration/test_federation_integration.py::TestLiveFederationIntegration::test_health_check_real -v
    }
    "coverage" {
        Write-Host "Running tests with coverage..." -ForegroundColor Yellow
        pytest --cov=app --cov-report=html --cov-report=term
        Write-Host ""
        Write-Host "Coverage report generated: htmlcov/index.html" -ForegroundColor Green
    }
    "parallel" {
        Write-Host "Running tests in parallel..." -ForegroundColor Yellow
        pytest -n auto -v
    }
    default {
        Write-Host "Unknown test type: $TestType" -ForegroundColor Red
        Write-Host "Usage: .\run_tests.ps1 [all|integration|genesis|e2e|contracts|success-metrics|quick|coverage|parallel]"
        exit 1
    }
}

Write-Host ""
Write-Host "✓ Tests completed!" -ForegroundColor Green
