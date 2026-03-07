"""Canonical evidence emission for omega-core test runs."""

from __future__ import annotations

import os
import subprocess
from pathlib import Path

import pytest

from core.run_manifest_emitter import (
    AssertionResult,
    FailureInfo,
    RunDescriptor,
    RunManifestEmitter,
)


ASSERTION_IDS = [
    "INV-IDEMPOTENCY",
    "INV-DETERMINISM",
    "INV-ISOLATION",
    "INV-TRUTHFULNESS",
    "INV-RECOVERABILITY",
    "INV-TRACE-CONTINUITY",
    "INV-NO-DUPLICATE-SIDE-EFFECTS",
]


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
    args = [str(arg).lower() for arg in config.invocation_params.args]
    for suite in ("contract", "integration", "e2e", "chaos", "smoke", "obs"):
        if any(suite in arg for arg in args):
            return suite
    return os.getenv("EVIDENCE_SUITE", "unit")


def pytest_configure(config: pytest.Config) -> None:
    if os.getenv("EVIDENCE_ENABLED", "true").lower() != "true":
        return
    emitter = RunManifestEmitter(local_root=Path(os.getenv("EVIDENCE_LOCAL_SPOOL", ".evidence")))
    suite = _detect_suite(config)
    descriptor = RunDescriptor(
        env=os.getenv("EVIDENCE_ENV", "dev"),
        layer=os.getenv("EVIDENCE_LAYER", "omega-core"),
        suite=suite,
        scenario_id=os.getenv("EVIDENCE_SCENARIO_ID", f"{suite}-suite"),
        git_sha=os.getenv("EVIDENCE_GIT_SHA", _git_sha()),
        build_system=os.getenv("EVIDENCE_BUILD_SYSTEM", "pytest"),
        container=os.getenv("EVIDENCE_CONTAINER", "fc-receipts"),
    )
    config._manifest_emitter = emitter
    config._manifest_handle = emitter.begin_run(descriptor)


def pytest_sessionfinish(session: pytest.Session, exitstatus: int) -> None:
    config = session.config
    emitter: RunManifestEmitter | None = getattr(config, "_manifest_emitter", None)
    handle = getattr(config, "_manifest_handle", None)
    if emitter is None or handle is None:
        return

    root = Path(config.rootpath)
    for name in ("junit.xml", "coverage.json", "coverage.xml"):
        path = root / name
        if path.exists():
            emitter.emit_artifact_from_file(handle, name=name, path=path)

    status = "pass" if exitstatus == 0 else "fail"
    for assertion_id in ASSERTION_IDS:
        emitter.record_assertion(handle, AssertionResult(assertion_id=assertion_id, status=status))

    if exitstatus == 0:
        emitter.set_status(handle, "pass")
    else:
        emitter.set_status(
            handle,
            "fail",
            FailureInfo(code="PYTEST_FAILURE", message=f"pytest exitstatus={exitstatus}"),
        )
    emitter.finalize(handle)
