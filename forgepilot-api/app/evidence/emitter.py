"""Canonical evidence emitter for test and experiment runs."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from hashlib import sha256
from io import BufferedReader
import json
import mimetypes
from pathlib import Path
from typing import Any, BinaryIO
from uuid import uuid4

try:
    from azure.identity import DefaultAzureCredential
    from azure.storage.blob import BlobServiceClient
except Exception:  # pragma: no cover - optional dependency at runtime
    DefaultAzureCredential = None
    BlobServiceClient = None


SUITE_VALUES = {
    "smoke",
    "unit",
    "contract",
    "integration",
    "e2e",
    "chaos",
    "perf",
    "obs",
}
STATUS_VALUES = {"pass", "fail", "skip", "abort"}
ASSERTION_STATUS_VALUES = {"pass", "fail", "skip"}
EVIDENCE_ACCOUNT = "keonreceipts"


@dataclass(slots=True)
class EvidenceRunDescriptor:
    env: str
    layer: str
    suite: str
    scenario_id: str
    source_git_sha: str
    source_build_system: str
    storage_container: str
    source_git_repo: str | None = None
    source_git_branch: str | None = None
    source_git_tag: str | None = None
    source_build_id: str | None = None
    source_build_run_number: str | None = None
    source_build_pipeline: str | None = None
    source_build_job: str | None = None
    context: dict[str, str] | None = None
    tags: dict[str, str] | None = None

    def validate(self) -> None:
        if self.suite not in SUITE_VALUES:
            raise ValueError(f"Invalid suite: {self.suite}")
        for field_value, label in (
            (self.env, "env"),
            (self.layer, "layer"),
            (self.scenario_id, "scenario_id"),
            (self.source_git_sha, "source_git_sha"),
            (self.source_build_system, "source_build_system"),
            (self.storage_container, "storage_container"),
        ):
            if not field_value:
                raise ValueError(f"{label} is required")


@dataclass(slots=True)
class ArtifactDescriptor:
    name: str
    blob_url: str
    sha256_hex: str
    content_type: str | None = None
    bytes: int | None = None

    def to_manifest_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "name": self.name,
            "blobUrl": self.blob_url,
            "sha256": self.sha256_hex,
        }
        if self.content_type:
            payload["contentType"] = self.content_type
        if self.bytes is not None:
            payload["bytes"] = self.bytes
        return payload


@dataclass(slots=True)
class AssertionResult:
    assertion_id: str
    status: str
    message: str | None = None

    def validate(self) -> None:
        if self.status not in ASSERTION_STATUS_VALUES:
            raise ValueError(f"Invalid assertion status: {self.status}")

    def to_manifest_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {"id": self.assertion_id, "status": self.status}
        if self.message:
            payload["message"] = self.message
        return payload


@dataclass(slots=True)
class FailureInfo:
    code: str
    message: str
    root_cause_hint: str | None = None

    def to_manifest_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {"code": self.code, "message": self.message}
        if self.root_cause_hint:
            payload["rootCauseHint"] = self.root_cause_hint
        return payload


@dataclass(slots=True)
class RunHandle:
    descriptor: EvidenceRunDescriptor
    run_id: str
    timestamp: str
    prefix: str
    started_at_utc: datetime
    manifest: dict[str, Any]
    artifacts: dict[str, ArtifactDescriptor] = field(default_factory=dict)
    dedupe_index: dict[str, ArtifactDescriptor] = field(default_factory=dict)
    assertions: dict[str, AssertionResult] = field(default_factory=dict)
    status: str = "abort"
    failure: FailureInfo | None = None


@dataclass(slots=True)
class FinalizedRun:
    run_id: str
    manifest: ArtifactDescriptor
    artifacts_index: ArtifactDescriptor
    all_artifacts: list[ArtifactDescriptor]
    prefix: str
    container: str
    account: str


class _BlobWriter:
    def upload(
        self,
        *,
        container: str,
        key: str,
        payload: bytes,
        content_type: str | None,
    ) -> str:
        raise NotImplementedError


class _AzureBlobWriter(_BlobWriter):
    def __init__(self, account: str):
        if BlobServiceClient is None or DefaultAzureCredential is None:
            raise RuntimeError(
                "azure-storage-blob and azure-identity are required for Azure uploads"
            )
        account_url = f"https://{account}.blob.core.windows.net"
        credential = DefaultAzureCredential()
        self._client = BlobServiceClient(account_url=account_url, credential=credential)
        self._account = account

    def upload(
        self,
        *,
        container: str,
        key: str,
        payload: bytes,
        content_type: str | None,
    ) -> str:
        blob_client = self._client.get_blob_client(container=container, blob=key)
        if content_type:
            blob_client.upload_blob(
                payload,
                overwrite=True,
                content_type=content_type,
            )
        else:
            blob_client.upload_blob(payload, overwrite=True)
        return f"https://{self._account}.blob.core.windows.net/{container}/{key}"


class _LocalBlobWriter(_BlobWriter):
    def __init__(self, root: Path, account: str):
        self._root = root
        self._account = account

    def upload(
        self,
        *,
        container: str,
        key: str,
        payload: bytes,
        content_type: str | None,
    ) -> str:
        _ = content_type
        target = self._root / self._account / container / key
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(payload)
        normalized = target.as_posix()
        return f"file://{normalized}"


class EvidenceEmitter:
    """Language-agnostic interface implementation for run evidence emission."""

    def __init__(
        self,
        *,
        account: str = EVIDENCE_ACCOUNT,
        enabled: bool = True,
        strict_upload: bool = False,
        local_spool_root: Path | None = None,
        prefer_local: bool = False,
    ):
        self._account = account
        self._enabled = enabled
        self._strict = strict_upload
        self._local_root = local_spool_root or Path(".evidence")
        self._prefer_local = prefer_local
        self._writer = self._resolve_writer()

    def _resolve_writer(self) -> _BlobWriter:
        if not self._enabled or self._prefer_local:
            return _LocalBlobWriter(root=self._local_root, account=self._account)
        try:
            return _AzureBlobWriter(account=self._account)
        except Exception:
            if self._strict:
                raise
            return _LocalBlobWriter(root=self._local_root, account=self._account)

    def begin_run(self, descriptor: EvidenceRunDescriptor) -> RunHandle:
        descriptor.validate()
        run_id = f"run_{uuid4().hex}"
        timestamp = datetime.now(timezone.utc).isoformat()
        prefix = (
            f"{descriptor.env}/{descriptor.layer}/{descriptor.suite}/"
            f"{descriptor.scenario_id}/{run_id}"
        )
        manifest: dict[str, Any] = {
            "schemaVersion": "v1.0.0",
            "runId": run_id,
            "timestamp": timestamp,
            "env": descriptor.env,
            "layer": descriptor.layer,
            "suite": descriptor.suite,
            "scenarioId": descriptor.scenario_id,
            "status": "abort",
            "source": {
                "git": {"sha": descriptor.source_git_sha},
                "build": {"system": descriptor.source_build_system},
            },
            "evidence": {
                "storage": {
                    "account": self._account,
                    "container": descriptor.storage_container,
                    "prefix": prefix,
                },
                "artifacts": [],
            },
        }

        if descriptor.source_git_repo:
            manifest["source"]["git"]["repo"] = descriptor.source_git_repo
        if descriptor.source_git_branch:
            manifest["source"]["git"]["branch"] = descriptor.source_git_branch
        if descriptor.source_git_tag:
            manifest["source"]["git"]["tag"] = descriptor.source_git_tag
        if descriptor.source_build_id:
            manifest["source"]["build"]["buildId"] = descriptor.source_build_id
        if descriptor.source_build_run_number:
            manifest["source"]["build"]["runNumber"] = descriptor.source_build_run_number
        if descriptor.source_build_pipeline:
            manifest["source"]["build"]["pipeline"] = descriptor.source_build_pipeline
        if descriptor.source_build_job:
            manifest["source"]["build"]["job"] = descriptor.source_build_job
        if descriptor.context:
            manifest["context"] = dict(descriptor.context)
        if descriptor.tags:
            manifest["tags"] = dict(descriptor.tags)

        return RunHandle(
            descriptor=descriptor,
            run_id=run_id,
            timestamp=timestamp,
            prefix=prefix,
            started_at_utc=datetime.now(timezone.utc),
            manifest=manifest,
        )

    def emit_artifact(
        self,
        handle: RunHandle,
        *,
        name: str,
        bytes_payload: bytes | None = None,
        file_path: str | None = None,
        stream: BinaryIO | None = None,
        content_type: str | None = None,
        dedupe_key: str | None = None,
    ) -> ArtifactDescriptor:
        payload = self._resolve_payload(
            bytes_payload=bytes_payload, file_path=file_path, stream=stream
        )
        sha256_hex = sha256(payload).hexdigest()
        if dedupe_key and dedupe_key in handle.dedupe_index:
            existing = handle.dedupe_index[dedupe_key]
            if existing.sha256_hex == sha256_hex:
                return existing
        if name in handle.artifacts and handle.artifacts[name].sha256_hex == sha256_hex:
            return handle.artifacts[name]

        final_content_type = content_type or self._guess_content_type(name)
        key = f"{handle.prefix}/{name}"
        blob_url = self._writer.upload(
            container=handle.descriptor.storage_container,
            key=key,
            payload=payload,
            content_type=final_content_type,
        )
        descriptor = ArtifactDescriptor(
            name=name,
            blob_url=blob_url,
            sha256_hex=sha256_hex,
            content_type=final_content_type,
            bytes=len(payload),
        )
        handle.artifacts[name] = descriptor
        if dedupe_key:
            handle.dedupe_index[dedupe_key] = descriptor
        return descriptor

    def record_assertion(self, handle: RunHandle, assertion: AssertionResult) -> None:
        assertion.validate()
        handle.assertions[assertion.assertion_id] = assertion

    def set_metric(self, handle: RunHandle, path: str, value: Any) -> None:
        keys = path.split(".")
        current = handle.manifest
        for key in keys[:-1]:
            if key not in current or not isinstance(current[key], dict):
                current[key] = {}
            current = current[key]
        current[keys[-1]] = value

    def set_context(self, handle: RunHandle, context_patch: dict[str, str]) -> None:
        if "context" not in handle.manifest:
            handle.manifest["context"] = {}
        handle.manifest["context"].update(context_patch)

    def set_status(
        self,
        handle: RunHandle,
        *,
        status: str,
        failure: FailureInfo | None = None,
    ) -> None:
        if status not in STATUS_VALUES:
            raise ValueError(f"Invalid status: {status}")
        handle.status = status
        handle.failure = failure

    def finalize_run(self, handle: RunHandle) -> FinalizedRun:
        ended = datetime.now(timezone.utc)
        handle.manifest["status"] = handle.status
        handle.manifest["durationMs"] = int(
            (ended - handle.started_at_utc).total_seconds() * 1000
        )
        if handle.assertions:
            ordered = sorted(handle.assertions.values(), key=lambda x: x.assertion_id)
            handle.manifest["assertions"] = [a.to_manifest_dict() for a in ordered]
        if handle.failure:
            handle.manifest["failure"] = handle.failure.to_manifest_dict()

        regular_artifacts = [
            handle.artifacts[name]
            for name in sorted(
                [k for k in handle.artifacts.keys() if k not in {"run_manifest.json", "artifacts.json"}]
            )
        ]
        handle.manifest["evidence"]["artifacts"] = [
            artifact.to_manifest_dict() for artifact in regular_artifacts
        ]

        manifest_bytes = self._canonical_json_bytes(handle.manifest)
        manifest_descriptor = self.emit_artifact(
            handle,
            name="run_manifest.json",
            bytes_payload=manifest_bytes,
            content_type="application/json",
        )
        artifacts_index = {
            "runId": handle.run_id,
            "artifacts": [
                a.to_manifest_dict()
                for a in [*regular_artifacts, manifest_descriptor]
            ],
        }
        artifacts_index_bytes = self._canonical_json_bytes(artifacts_index)
        artifacts_index_descriptor = self.emit_artifact(
            handle,
            name="artifacts.json",
            bytes_payload=artifacts_index_bytes,
            content_type="application/json",
        )

        all_artifacts = [*regular_artifacts, manifest_descriptor, artifacts_index_descriptor]
        return FinalizedRun(
            run_id=handle.run_id,
            manifest=manifest_descriptor,
            artifacts_index=artifacts_index_descriptor,
            all_artifacts=all_artifacts,
            prefix=handle.prefix,
            container=handle.descriptor.storage_container,
            account=self._account,
        )

    def abort_run(self, handle: RunHandle, failure: FailureInfo) -> FinalizedRun:
        self.set_status(handle, status="abort", failure=failure)
        return self.finalize_run(handle)

    @staticmethod
    def _resolve_payload(
        *,
        bytes_payload: bytes | None,
        file_path: str | None,
        stream: BinaryIO | None,
    ) -> bytes:
        modes_used = sum(
            candidate is not None for candidate in [bytes_payload, file_path, stream]
        )
        if modes_used != 1:
            raise ValueError("Exactly one of bytes_payload, file_path, or stream is required")
        if bytes_payload is not None:
            return bytes_payload
        if file_path is not None:
            return Path(file_path).read_bytes()
        read_stream = stream if isinstance(stream, BufferedReader) else stream
        if read_stream is None:
            raise ValueError("Invalid stream payload")
        return read_stream.read()

    @staticmethod
    def _canonical_json_bytes(payload: dict[str, Any]) -> bytes:
        return json.dumps(
            payload,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=True,
        ).encode("utf-8")

    @staticmethod
    def _guess_content_type(name: str) -> str | None:
        guessed, _ = mimetypes.guess_type(name)
        return guessed
