"""CLI wrapper for the canonical evidence emitter."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.evidence import EvidenceEmitter, EvidenceRunDescriptor, AssertionResult, FailureInfo


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Emit canonical run evidence artifacts")
    parser.add_argument("--descriptor", required=True, help="Path to descriptor JSON file")
    parser.add_argument(
        "--artifact",
        action="append",
        default=[],
        help="Artifact mapping in form name=path/to/file",
    )
    parser.add_argument(
        "--assertion",
        action="append",
        default=[],
        help="Assertion in form id=status[:message]",
    )
    parser.add_argument("--status", default="pass", choices=["pass", "fail", "skip", "abort"])
    parser.add_argument("--failure-code")
    parser.add_argument("--failure-message")
    parser.add_argument("--failure-root-cause")
    parser.add_argument("--prefer-local", action="store_true")
    parser.add_argument("--strict-upload", action="store_true")
    return parser.parse_args()


def parse_descriptor(path: str) -> EvidenceRunDescriptor:
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    return EvidenceRunDescriptor(
        env=payload["env"],
        layer=payload["layer"],
        suite=payload["suite"],
        scenario_id=payload["scenarioId"],
        source_git_sha=payload["source"]["git"]["sha"],
        source_build_system=payload["source"]["build"]["system"],
        storage_container=payload["storage"]["container"],
        source_git_repo=payload["source"]["git"].get("repo"),
        source_git_branch=payload["source"]["git"].get("branch"),
        source_git_tag=payload["source"]["git"].get("tag"),
        source_build_id=payload["source"]["build"].get("buildId"),
        source_build_run_number=payload["source"]["build"].get("runNumber"),
        source_build_pipeline=payload["source"]["build"].get("pipeline"),
        source_build_job=payload["source"]["build"].get("job"),
        context=payload.get("context"),
        tags=payload.get("tags"),
    )


def main() -> int:
    args = parse_args()
    descriptor = parse_descriptor(args.descriptor)
    emitter = EvidenceEmitter(
        strict_upload=args.strict_upload,
        prefer_local=args.prefer_local,
    )
    handle = emitter.begin_run(descriptor)

    for artifact in args.artifact:
        name, file_path = artifact.split("=", 1)
        emitter.emit_artifact(handle, name=name, file_path=file_path)

    for assertion in args.assertion:
        head, *tail = assertion.split(":", 2)
        assertion_id, status = head.split("=", 1)
        message = tail[0] if tail else None
        emitter.record_assertion(
            handle,
            AssertionResult(assertion_id=assertion_id, status=status, message=message),
        )

    failure = None
    if args.status in {"fail", "abort"}:
        failure = FailureInfo(
            code=args.failure_code or "UNSPECIFIED_FAILURE",
            message=args.failure_message or "Run failed",
            root_cause_hint=args.failure_root_cause,
        )
    emitter.set_status(handle, status=args.status, failure=failure)
    finalized = emitter.finalize_run(handle)
    print(
        json.dumps(
            {
                "runId": finalized.run_id,
                "manifest": finalized.manifest.blob_url,
                "artifactsIndex": finalized.artifacts_index.blob_url,
                "prefix": finalized.prefix,
                "container": finalized.container,
                "account": finalized.account,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
