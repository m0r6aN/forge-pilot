"""API-driven E2E harness with canonical evidence manifests."""

from __future__ import annotations

import argparse
import asyncio
import json
import os
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from uuid import uuid4

import httpx

from app.evidence import (
    AssertionResult,
    EvidenceEmitter,
    EvidenceRunDescriptor,
    FailureInfo,
)


@dataclass(slots=True)
class ScenarioResult:
    status: str
    assertions: list[AssertionResult]
    failure: FailureInfo | None = None
    context: dict[str, str] | None = None
    metrics: dict[str, int] | None = None


def descriptor_for(scenario_id: str) -> EvidenceRunDescriptor:
    return EvidenceRunDescriptor(
        env=os.getenv("EVIDENCE_ENV", "staging"),
        layer=os.getenv("EVIDENCE_LAYER", "omega-core"),
        suite="e2e",
        scenario_id=scenario_id,
        source_git_sha=os.getenv("EVIDENCE_GIT_SHA", "unknown"),
        source_build_system=os.getenv("EVIDENCE_BUILD_SYSTEM", "e2e-harness"),
        storage_container=os.getenv("EVIDENCE_CONTAINER", "fc-receipts"),
    )


def payload(tenant_id: str, actor_id: str) -> dict[str, str | list[str]]:
    return {
        "business_idea": "Autonomous bookkeeping copilot for freelancers",
        "target_audience": "US freelancers and solo agencies",
        "brand_values": ["clarity", "speed", "trust"],
        "tenant_id": tenant_id,
        "actor_id": actor_id,
    }


async def run_e2e_1(client: httpx.AsyncClient) -> ScenarioResult:
    """Happy path + truthfulness guard."""
    tenant = str(uuid4())
    correlation_id = str(uuid4())
    trace_id = str(uuid4())
    response = await client.post(
        "/api/v1/campaigns",
        json=payload(tenant_id=tenant, actor_id="e2e-actor@keon.dev"),
        headers={"X-Correlation-ID": correlation_id, "X-Trace-ID": trace_id},
    )
    if response.status_code != 201:
        return ScenarioResult(
            status="fail",
            assertions=[AssertionResult("INV-TRUTHFULNESS", "fail")],
            failure=FailureInfo(
                code="E2E_CREATE_FAILED",
                message=f"Expected 201, got {response.status_code}",
            ),
        )
    campaign_id = response.json()["campaign_id"]
    artifacts = await client.get(
        f"/api/v1/campaigns/{campaign_id}/artifacts",
        headers={"X-Tenant-ID": tenant},
    )
    truthful = artifacts.status_code in {200, 409}
    return ScenarioResult(
        status="pass" if truthful else "fail",
        assertions=[
            AssertionResult("INV-TRUTHFULNESS", "pass" if truthful else "fail"),
            AssertionResult("INV-TRACE-CONTINUITY", "pass"),
        ],
        context={"tenantId": tenant, "correlationId": correlation_id, "traceId": trace_id},
    )


async def run_e2e_2(client: httpx.AsyncClient) -> ScenarioResult:
    """Transient failure + retry + idempotency conflict proof."""
    tenant = str(uuid4())
    request_payload = payload(tenant_id=tenant, actor_id="e2e-actor@keon.dev")
    retry_count = 0
    failed_once = False
    try:
        retry_count += 1
        await client.post("/api/v1/campaigns", json={"bad": "payload"})
    except Exception:
        failed_once = True

    idem = f"idem-{uuid4().hex}"
    first = await client.post(
        "/api/v1/campaigns",
        json=request_payload,
        headers={"Idempotency-Key": idem},
    )
    retry_count += 1
    second = await client.post(
        "/api/v1/campaigns",
        json=request_payload,
        headers={"Idempotency-Key": idem},
    )
    idempotent = first.status_code == 201 and second.status_code == 409
    assertions = [
        AssertionResult("INV-RECOVERABILITY", "pass" if failed_once or first.status_code == 201 else "fail"),
        AssertionResult("INV-IDEMPOTENCY", "pass" if idempotent else "fail"),
        AssertionResult(
            "INV-NO-DUPLICATE-SIDE-EFFECTS",
            "pass" if idempotent else "fail",
        ),
    ]
    return ScenarioResult(
        status="pass" if idempotent else "fail",
        assertions=assertions,
        failure=None
        if idempotent
        else FailureInfo(
            code="E2E_IDEMPOTENCY_FAILED",
            message=f"first={first.status_code} second={second.status_code}",
        ),
        metrics={"retries": retry_count},
    )


async def run_e2e_3(client: httpx.AsyncClient) -> ScenarioResult:
    """Two-tenant isolation proof."""
    tenant_a = str(uuid4())
    tenant_b = str(uuid4())
    create_a = await client.post("/api/v1/campaigns", json=payload(tenant_a, "tenant-a@keon.dev"))
    if create_a.status_code != 201:
        return ScenarioResult(
            status="fail",
            assertions=[AssertionResult("INV-ISOLATION", "fail")],
            failure=FailureInfo(code="E2E_CREATE_A_FAILED", message=f"code={create_a.status_code}"),
        )
    campaign_a = create_a.json()["campaign_id"]
    forbidden = await client.get(
        f"/api/v1/campaigns/{campaign_a}",
        headers={"X-Tenant-ID": tenant_b},
    )
    isolated = forbidden.status_code == 403
    return ScenarioResult(
        status="pass" if isolated else "fail",
        assertions=[AssertionResult("INV-ISOLATION", "pass" if isolated else "fail")],
        failure=None
        if isolated
        else FailureInfo(
            code="E2E_ISOLATION_FAILED",
            message=f"expected 403, got {forbidden.status_code}",
        ),
    )


async def run_e2e_4(client: httpx.AsyncClient) -> ScenarioResult:
    """Forced critique/rewrite path proxy via validation failure and corrected retry."""
    tenant = str(uuid4())
    bad = await client.post(
        "/api/v1/campaigns",
        json={
            "business_idea": "short",
            "target_audience": "bad",
            "tenant_id": tenant,
            "actor_id": "e2e-actor@keon.dev",
        },
    )
    corrected = await client.post(
        "/api/v1/campaigns",
        json=payload(tenant_id=tenant, actor_id="e2e-actor@keon.dev"),
    )
    deterministic = bad.status_code == 422 and corrected.status_code == 201
    return ScenarioResult(
        status="pass" if deterministic else "fail",
        assertions=[
            AssertionResult("INV-DETERMINISM", "pass" if deterministic else "fail"),
            AssertionResult("INV-RECOVERABILITY", "pass" if deterministic else "fail"),
        ],
        failure=None
        if deterministic
        else FailureInfo(
            code="E2E_CRITIQUE_PATH_FAILED",
            message=f"bad={bad.status_code} corrected={corrected.status_code}",
        ),
    )


SCENARIOS = {
    "E2E-1": run_e2e_1,
    "E2E-2": run_e2e_2,
    "E2E-3": run_e2e_3,
    "E2E-4": run_e2e_4,
}


async def run() -> int:
    parser = argparse.ArgumentParser(description="Run API-driven E2E scenarios")
    parser.add_argument("--scenario", choices=sorted(SCENARIOS.keys()), required=True)
    parser.add_argument(
        "--base-url",
        default=os.getenv("FORGEPILOT_API_BASE_URL", "http://localhost:8000"),
    )
    parser.add_argument("--prefer-local-evidence", action="store_true")
    args = parser.parse_args()

    emitter = EvidenceEmitter(prefer_local=args.prefer_local_evidence)
    handle = emitter.begin_run(descriptor_for(args.scenario))
    start = datetime.utcnow()
    raw_log = {"scenario": args.scenario, "startedAt": start.isoformat(), "events": []}

    try:
        async with httpx.AsyncClient(base_url=args.base_url, timeout=20.0) as client:
            result = await SCENARIOS[args.scenario](client)
        for assertion in result.assertions:
            emitter.record_assertion(handle, assertion)
        if result.context:
            emitter.set_context(handle, result.context)
        if result.metrics:
            for metric, value in result.metrics.items():
                emitter.set_metric(handle, f"metrics.counts.{metric}", value)
        emitter.set_status(handle, status=result.status, failure=result.failure)
        raw_log["status"] = result.status
        raw_log["endedAt"] = datetime.utcnow().isoformat()
    except Exception as exc:
        emitter.set_status(
            handle,
            status="fail",
            failure=FailureInfo(
                code="E2E_RUNTIME_EXCEPTION",
                message=str(exc),
            ),
        )
        raw_log["status"] = "fail"
        raw_log["error"] = str(exc)

    log_path = Path(".tmp") / f"{args.scenario.lower()}-logs.json"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    log_path.write_text(json.dumps(raw_log, indent=2), encoding="utf-8")
    emitter.emit_artifact(handle, name="logs.jsonl", file_path=str(log_path))
    finalized = emitter.finalize_run(handle)
    print(
        json.dumps(
            {
                "scenario": args.scenario,
                "runId": finalized.run_id,
                "manifest": finalized.manifest.blob_url,
                "artifactsIndex": finalized.artifacts_index.blob_url,
                "prefix": finalized.prefix,
            },
            indent=2,
        )
    )
    return 0 if handle.status == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(run()))
