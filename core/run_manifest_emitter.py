"""Canonical run manifest emitter for omega-core test suites."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
import hashlib
import json
import mimetypes
from pathlib import Path
from typing import Any
from uuid import uuid4


SUITES = {"smoke", "unit", "contract", "integration", "e2e", "chaos", "perf", "obs"}
STATUSES = {"pass", "fail", "skip", "abort"}


@dataclass(slots=True)
class RunDescriptor:
    env: str
    layer: str
    suite: str
    scenario_id: str
    git_sha: str
    build_system: str
    container: str

    def validate(self) -> None:
        if self.suite not in SUITES:
            raise ValueError(f"Invalid suite: {self.suite}")
        for value, name in (
            (self.env, "env"),
            (self.layer, "layer"),
            (self.scenario_id, "scenario_id"),
            (self.git_sha, "git_sha"),
            (self.build_system, "build_system"),
            (self.container, "container"),
        ):
            if not value:
                raise ValueError(f"{name} is required")


@dataclass(slots=True)
class Artifact:
    name: str
    blob_url: str
    sha256: str
    content_type: str | None = None
    bytes_size: int | None = None

    def to_dict(self) -> dict[str, Any]:
        data: dict[str, Any] = {
            "name": self.name,
            "blobUrl": self.blob_url,
            "sha256": self.sha256,
        }
        if self.content_type:
            data["contentType"] = self.content_type
        if self.bytes_size is not None:
            data["bytes"] = self.bytes_size
        return data


@dataclass(slots=True)
class AssertionResult:
    assertion_id: str
    status: str
    message: str | None = None

    def to_dict(self) -> dict[str, Any]:
        data: dict[str, Any] = {"id": self.assertion_id, "status": self.status}
        if self.message:
            data["message"] = self.message
        return data


@dataclass(slots=True)
class FailureInfo:
    code: str
    message: str
    root_cause_hint: str | None = None

    def to_dict(self) -> dict[str, Any]:
        data: dict[str, Any] = {"code": self.code, "message": self.message}
        if self.root_cause_hint:
            data["rootCauseHint"] = self.root_cause_hint
        return data


@dataclass(slots=True)
class RunHandle:
    descriptor: RunDescriptor
    run_id: str
    timestamp: str
    prefix: str
    started_at: datetime
    manifest: dict[str, Any]
    artifacts: dict[str, Artifact] = field(default_factory=dict)
    assertions: dict[str, AssertionResult] = field(default_factory=dict)
    status: str = "abort"
    failure: FailureInfo | None = None


class RunManifestEmitter:
    """Minimal local-spool emitter with canonical path and manifest semantics."""

    def __init__(
        self,
        *,
        account: str = "keonreceipts",
        local_root: Path | None = None,
    ):
        self.account = account
        self.local_root = local_root or Path(".evidence")

    def begin_run(self, descriptor: RunDescriptor) -> RunHandle:
        descriptor.validate()
        run_id = f"run_{uuid4().hex}"
        ts = datetime.now(timezone.utc).isoformat()
        prefix = f"{descriptor.env}/{descriptor.layer}/{descriptor.suite}/{descriptor.scenario_id}/{run_id}"
        manifest = {
            "schemaVersion": "v1.0.0",
            "runId": run_id,
            "timestamp": ts,
            "env": descriptor.env,
            "layer": descriptor.layer,
            "suite": descriptor.suite,
            "scenarioId": descriptor.scenario_id,
            "status": "abort",
            "source": {
                "git": {"sha": descriptor.git_sha},
                "build": {"system": descriptor.build_system},
            },
            "evidence": {
                "storage": {
                    "account": self.account,
                    "container": descriptor.container,
                    "prefix": prefix,
                },
                "artifacts": [],
            },
        }
        return RunHandle(
            descriptor=descriptor,
            run_id=run_id,
            timestamp=ts,
            prefix=prefix,
            started_at=datetime.now(timezone.utc),
            manifest=manifest,
        )

    def emit_artifact(self, handle: RunHandle, *, name: str, content: bytes) -> Artifact:
        sha = hashlib.sha256(content).hexdigest()
        content_type = mimetypes.guess_type(name)[0]
        key = f"{handle.prefix}/{name}"
        target = self.local_root / self.account / handle.descriptor.container / key
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        artifact = Artifact(
            name=name,
            blob_url=f"file://{target.as_posix()}",
            sha256=sha,
            content_type=content_type,
            bytes_size=len(content),
        )
        handle.artifacts[name] = artifact
        return artifact

    def emit_artifact_from_file(self, handle: RunHandle, *, name: str, path: Path) -> Artifact:
        return self.emit_artifact(handle, name=name, content=path.read_bytes())

    def record_assertion(self, handle: RunHandle, assertion: AssertionResult) -> None:
        handle.assertions[assertion.assertion_id] = assertion

    def set_context(self, handle: RunHandle, context: dict[str, str]) -> None:
        if "context" not in handle.manifest:
            handle.manifest["context"] = {}
        handle.manifest["context"].update(context)

    def set_metric(self, handle: RunHandle, path: str, value: Any) -> None:
        cursor: dict[str, Any] = handle.manifest
        keys = path.split(".")
        for key in keys[:-1]:
            if key not in cursor or not isinstance(cursor[key], dict):
                cursor[key] = {}
            cursor = cursor[key]
        cursor[keys[-1]] = value

    def set_status(self, handle: RunHandle, status: str, failure: FailureInfo | None = None) -> None:
        if status not in STATUSES:
            raise ValueError(f"Invalid status: {status}")
        handle.status = status
        handle.failure = failure

    def finalize(self, handle: RunHandle) -> dict[str, Any]:
        ended = datetime.now(timezone.utc)
        handle.manifest["status"] = handle.status
        handle.manifest["durationMs"] = int((ended - handle.started_at).total_seconds() * 1000)
        if handle.assertions:
            ordered = [handle.assertions[k].to_dict() for k in sorted(handle.assertions)]
            handle.manifest["assertions"] = ordered
        if handle.failure:
            handle.manifest["failure"] = handle.failure.to_dict()

        base_artifacts = [handle.artifacts[k] for k in sorted(handle.artifacts)]
        handle.manifest["evidence"]["artifacts"] = [a.to_dict() for a in base_artifacts]
        manifest_bytes = json.dumps(handle.manifest, sort_keys=True, separators=(",", ":")).encode("utf-8")
        manifest_artifact = self.emit_artifact(handle, name="run_manifest.json", content=manifest_bytes)
        artifacts_index = {
            "runId": handle.run_id,
            "artifacts": [a.to_dict() for a in [*base_artifacts, manifest_artifact]],
        }
        artifacts_bytes = json.dumps(artifacts_index, sort_keys=True, separators=(",", ":")).encode("utf-8")
        artifacts_artifact = self.emit_artifact(handle, name="artifacts.json", content=artifacts_bytes)
        return {
            "runId": handle.run_id,
            "manifest": manifest_artifact,
            "artifactsIndex": artifacts_artifact,
            "allArtifacts": [*base_artifacts, manifest_artifact, artifacts_artifact],
            "prefix": handle.prefix,
            "container": handle.descriptor.container,
            "account": self.account,
        }
