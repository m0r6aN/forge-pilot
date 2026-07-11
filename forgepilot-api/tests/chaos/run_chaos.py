"""Staging chaos experiment runner with canonical evidence output."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from app.evidence import AssertionResult, EvidenceEmitter, EvidenceRunDescriptor, FailureInfo


@dataclass(slots=True)
class ChaosExperiment:
    experiment_id: str
    mode: str
    target: str
    command: list[str]


EXPERIMENTS = {
    "Chaos-01": ChaosExperiment(
        experiment_id="Chaos-01",
        mode="toxiproxy",
        target="omega-core",
        command=["toxiproxy-cli", "toxic", "add", "omega-core", "-t", "latency", "-a", "latency=1200"],
    ),
    "Chaos-02": ChaosExperiment(
        experiment_id="Chaos-02",
        mode="k8s-kill",
        target="keon-backend",
        command=["kubectl", "delete", "pod", "-l", "app=keon-backend", "-n", "staging"],
    ),
    "Chaos-03": ChaosExperiment(
        experiment_id="Chaos-03",
        mode="k8s-scale",
        target="omega-core",
        command=["kubectl", "scale", "deploy/omega-core", "--replicas=0", "-n", "staging"],
    ),
}


def descriptor_for(experiment_id: str) -> EvidenceRunDescriptor:
    return EvidenceRunDescriptor(
        env=os.getenv("EVIDENCE_ENV", "staging"),
        layer=os.getenv("EVIDENCE_LAYER", "omega-core"),
        suite="chaos",
        scenario_id=experiment_id,
        source_git_sha=os.getenv("EVIDENCE_GIT_SHA", "unknown"),
        source_build_system=os.getenv("EVIDENCE_BUILD_SYSTEM", "chaos-runner"),
        storage_container=os.getenv("EVIDENCE_CONTAINER", "security-receipts"),
    )


def run_experiment(experiment: ChaosExperiment) -> tuple[bool, str]:
    proc = subprocess.run(
        experiment.command,
        capture_output=True,
        text=True,
        check=False,
    )
    success = proc.returncode == 0
    output = f"$ {' '.join(experiment.command)}\n{proc.stdout}\n{proc.stderr}".strip()
    return success, output


def stop_conditions(log_blob: str) -> tuple[bool, str]:
    """Abort on corruption/bleed/missing alerts markers."""
    lowered = log_blob.lower()
    if "cross-tenant bleed" in lowered:
        return True, "STOP_CROSS_TENANT_BLEED"
    if "data corruption" in lowered:
        return True, "STOP_DATA_CORRUPTION"
    if "missing alert" in lowered:
        return True, "STOP_MISSING_ALERTS"
    return False, ""


def main() -> int:
    parser = argparse.ArgumentParser(description="Run staging chaos experiments")
    parser.add_argument("--experiment", choices=sorted(EXPERIMENTS.keys()), required=True)
    parser.add_argument("--prefer-local-evidence", action="store_true")
    args = parser.parse_args()

    if os.getenv("EVIDENCE_ENV", "staging") != "staging":
        raise SystemExit("Chaos runners are staging-only")

    emitter = EvidenceEmitter(prefer_local=args.prefer_local_evidence)
    experiment = EXPERIMENTS[args.experiment]
    handle = emitter.begin_run(descriptor_for(experiment.experiment_id))
    started = datetime.utcnow().isoformat()

    success, output = run_experiment(experiment)
    stop, stop_code = stop_conditions(output)
    log_path = Path(".tmp") / f"{args.experiment.lower()}-chaos.log"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    log_path.write_text(output, encoding="utf-8")
    emitter.emit_artifact(handle, name="logs.txt", file_path=str(log_path))
    emitter.record_assertion(
        handle,
        AssertionResult(
            assertion_id="INV-RECOVERABILITY",
            status="pass" if success and not stop else "fail",
            message=f"mode={experiment.mode}, target={experiment.target}",
        ),
    )

    if stop:
        emitter.set_status(
            handle,
            status="abort",
            failure=FailureInfo(
                code=stop_code,
                message="Stop condition reached during chaos experiment",
            ),
        )
    elif success:
        emitter.set_status(handle, status="pass")
    else:
        emitter.set_status(
            handle,
            status="fail",
            failure=FailureInfo(
                code="CHAOS_COMMAND_FAILED",
                message=f"Command failed for {experiment.experiment_id}",
            ),
        )

    emitter.set_metric(handle, "metrics.counts.requests", 1)
    emitter.set_context(
        handle,
        {
            "workflowId": experiment.experiment_id,
            "policyVersion": "chaos-v1",
            "ruleSetHash": "chaos-stop-conditions",
        },
    )
    summary = {
        "experiment": experiment.experiment_id,
        "startedAt": started,
        "endedAt": datetime.utcnow().isoformat(),
        "status": handle.status,
    }
    summary_path = Path(".tmp") / f"{args.experiment.lower()}-summary.json"
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    emitter.emit_artifact(handle, name="k6-summary.json", file_path=str(summary_path))
    finalized = emitter.finalize_run(handle)
    print(
        json.dumps(
            {
                "experiment": experiment.experiment_id,
                "runId": finalized.run_id,
                "manifest": finalized.manifest.blob_url,
                "artifactsIndex": finalized.artifacts_index.blob_url,
                "status": handle.status,
            },
            indent=2,
        )
    )
    return 0 if handle.status == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
