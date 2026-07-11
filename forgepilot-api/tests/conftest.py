"""Shared test fixtures."""

import os
import subprocess
import pytest
from uuid import uuid4
from datetime import datetime
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.storage import InMemoryCampaignStore, CampaignMetadata
from app.evidence import (
    EvidenceEmitter,
    EvidenceRunDescriptor,
    AssertionResult,
    FailureInfo,
)


def _git_sha() -> str:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
        )
        return result.stdout.strip()
    except Exception:
        return "unknown"


def _detect_suite(config: pytest.Config) -> str:
    args = [str(arg) for arg in config.invocation_params.args]
    if any("contract" in arg for arg in args):
        return "contract"
    if any("integration" in arg for arg in args):
        return "integration"
    if any("e2e" in arg for arg in args):
        return "e2e"
    if any("chaos" in arg for arg in args):
        return "chaos"
    if any("smoke" in arg for arg in args):
        return "smoke"
    return os.getenv("EVIDENCE_SUITE", "unit")


def pytest_configure(config: pytest.Config) -> None:
    """Start canonical evidence run for this pytest invocation."""
    suite = _detect_suite(config)
    emitter = EvidenceEmitter(
        enabled=os.getenv("EVIDENCE_ENABLED", "true").lower() == "true",
        strict_upload=os.getenv("EVIDENCE_STRICT_UPLOAD", "false").lower() == "true",
        prefer_local=os.getenv("EVIDENCE_PREFER_LOCAL", "false").lower() == "true",
        local_spool_root=Path(
            os.getenv("EVIDENCE_LOCAL_SPOOL", str(Path(".evidence").resolve()))
        ),
    )
    descriptor = EvidenceRunDescriptor(
        env=os.getenv("EVIDENCE_ENV", "dev"),
        layer=os.getenv("EVIDENCE_LAYER", "keon-backend"),
        suite=suite,
        scenario_id=os.getenv("EVIDENCE_SCENARIO_ID", f"{suite}-suite"),
        source_git_sha=_git_sha(),
        source_build_system=os.getenv("EVIDENCE_BUILD_SYSTEM", "pytest"),
        storage_container=os.getenv("EVIDENCE_CONTAINER", "fc-receipts"),
        source_git_repo=os.getenv("EVIDENCE_GIT_REPO"),
        source_git_branch=os.getenv("EVIDENCE_GIT_BRANCH"),
        source_git_tag=os.getenv("EVIDENCE_GIT_TAG"),
        source_build_id=os.getenv("EVIDENCE_BUILD_ID"),
        source_build_run_number=os.getenv("EVIDENCE_RUN_NUMBER"),
        source_build_pipeline=os.getenv("EVIDENCE_PIPELINE"),
        source_build_job=os.getenv("EVIDENCE_JOB"),
        context={
            key: value
            for key, value in {
                "tenantId": os.getenv("EVIDENCE_TENANT_ID"),
                "actorId": os.getenv("EVIDENCE_ACTOR_ID"),
                "correlationId": os.getenv("EVIDENCE_CORRELATION_ID"),
                "traceId": os.getenv("EVIDENCE_TRACE_ID"),
                "workflowId": os.getenv("EVIDENCE_WORKFLOW_ID"),
            }.items()
            if value
        },
    )
    config._evidence_emitter = emitter
    config._evidence_handle = emitter.begin_run(descriptor)


def pytest_sessionfinish(session: pytest.Session, exitstatus: int) -> None:
    """Finalize canonical evidence run and upload expected artifacts."""
    config = session.config
    emitter: EvidenceEmitter = getattr(config, "_evidence_emitter", None)
    handle = getattr(config, "_evidence_handle", None)
    if not emitter or not handle:
        return

    root = Path(config.rootpath)
    for artifact_name in ("junit.xml", "coverage.json", "lcov.info", "logs.txt", "logs.jsonl"):
        artifact_path = root / artifact_name
        if artifact_path.exists():
            emitter.emit_artifact(handle, name=artifact_name, file_path=str(artifact_path))

    assertions = [
        "INV-IDEMPOTENCY",
        "INV-DETERMINISM",
        "INV-ISOLATION",
        "INV-TRUTHFULNESS",
        "INV-RECOVERABILITY",
        "INV-TRACE-CONTINUITY",
        "INV-NO-DUPLICATE-SIDE-EFFECTS",
    ]
    assertion_status = "pass" if exitstatus == 0 else "fail"
    for assertion_id in assertions:
        emitter.record_assertion(
            handle, AssertionResult(assertion_id=assertion_id, status=assertion_status)
        )

    if exitstatus == 0:
        emitter.set_status(handle, status="pass")
    else:
        emitter.set_status(
            handle,
            status="fail",
            failure=FailureInfo(
                code="PYTEST_FAILURE",
                message=f"pytest finished with exit status {exitstatus}",
            ),
        )
    emitter.finalize_run(handle)


@pytest.fixture
def test_client():
    """FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def sample_campaign_request():
    """Sample campaign request payload."""
    return {
        "business_idea": "AI-powered meal planning app for busy professionals",
        "target_audience": "Urban professionals aged 25-40",
        "brand_values": ["health", "convenience", "sustainability"],
        "tenant_id": str(uuid4()),
        "actor_id": "user@example.com",
    }


@pytest.fixture
def sample_campaign_metadata():
    """Sample campaign metadata."""
    return CampaignMetadata(
        campaign_id=uuid4(),
        conversation_id="conv_123456",
        tenant_id=uuid4(),
        actor_id="user@example.com",
        correlation_id=uuid4(),
        created_at=datetime.utcnow(),
    )


@pytest.fixture
def campaign_store():
    """Fresh campaign store instance."""
    return InMemoryCampaignStore()


@pytest.fixture
def mock_federation_response():
    """Mock Federation Core conversation response."""
    return {
        "conversation_id": "conv_123456",
        "state": "active",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "messages": [
            {
                "role": "assistant",
                "content": "Starting brand strategy phase",
                "timestamp": datetime.utcnow().isoformat(),
            }
        ],
        "current_phase": "brand_strategy",
        "completion_percentage": 25,
    }


@pytest.fixture
def mock_artifacts_response():
    """Mock Federation Core artifacts response."""
    return {
        "brand_name": "NutriFlow",
        "tagline": "Fuel Your Day, Naturally",
        "domain_suggestions": [
            {"domain": "nutriflow.com", "available": True, "price": 2499.0},
            {"domain": "nutriflow.io", "available": True, "price": 1299.0},
        ],
        "brand_guidelines": {
            "colors": ["#4CAF50", "#8BC34A", "#CDDC39"],
            "typography": "Montserrat for headings, Open Sans for body",
            "voice": "Friendly, motivating, health-conscious",
        },
        "legal_review": {
            "trademark_status": "clear",
            "risks": [],
        },
        "generated_at": datetime.utcnow().isoformat(),
    }
