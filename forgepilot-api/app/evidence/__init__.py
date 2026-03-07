"""Evidence emission primitives for canonical run manifests."""

from .emitter import (
    EvidenceRunDescriptor,
    ArtifactDescriptor,
    AssertionResult,
    FailureInfo,
    FinalizedRun,
    EvidenceEmitter,
)

__all__ = [
    "EvidenceRunDescriptor",
    "ArtifactDescriptor",
    "AssertionResult",
    "FailureInfo",
    "FinalizedRun",
    "EvidenceEmitter",
]
