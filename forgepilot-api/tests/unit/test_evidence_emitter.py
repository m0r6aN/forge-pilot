"""Unit tests for canonical evidence emitter behavior."""

from pathlib import Path

from app.evidence import (
    EvidenceEmitter,
    EvidenceRunDescriptor,
    AssertionResult,
)


def _descriptor() -> EvidenceRunDescriptor:
    return EvidenceRunDescriptor(
        env="dev",
        layer="keon-backend",
        suite="unit",
        scenario_id="Unit-Emitter",
        source_git_sha="abcdef1",
        source_build_system="pytest",
        storage_container="fc-receipts",
    )


def test_prefix_contains_env_layer_suite_scenario_runid(tmp_path: Path):
    emitter = EvidenceEmitter(prefer_local=True, local_spool_root=tmp_path)
    handle = emitter.begin_run(_descriptor())
    assert handle.prefix.startswith("dev/keon-backend/unit/Unit-Emitter/run_")


def test_finalize_writes_manifest_and_artifacts_index(tmp_path: Path):
    emitter = EvidenceEmitter(prefer_local=True, local_spool_root=tmp_path)
    handle = emitter.begin_run(_descriptor())
    emitter.emit_artifact(handle, name="logs.txt", bytes_payload=b"hello")
    emitter.record_assertion(handle, AssertionResult(assertion_id="INV-DETERMINISM", status="pass"))
    emitter.set_status(handle, status="pass")
    finalized = emitter.finalize_run(handle)

    assert finalized.manifest.name == "run_manifest.json"
    assert finalized.artifacts_index.name == "artifacts.json"
    assert finalized.account == "keonreceipts"
    assert finalized.all_artifacts[-1].name == "artifacts.json"
