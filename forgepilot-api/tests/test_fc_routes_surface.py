"""
SENTINEL 2 — FC Route Surface Guard

Fails if WebSocket routes appear, old pantheon WS paths exist, or the
approved REST surface changes without intention.

Approved surface is the single source of truth for forgepilot-api routes.
Any addition/deletion must be reflected here or CI will fail.
"""

import hashlib
import json

import pytest
from fastapi.routing import APIRoute, APIWebSocketRoute

from app.main import app

pytestmark = [pytest.mark.sentinel, pytest.mark.unit]

# The ONLY routes that may exist in forgepilot-api
APPROVED_ROUTES: frozenset[tuple[str, str]] = frozenset(
    {
        ("GET", "/health"),
        ("GET", "/ready"),
        ("POST", "/api/v1/campaigns"),
        ("GET", "/api/v1/campaigns/{campaign_id}"),
        ("GET", "/api/v1/campaigns/{campaign_id}/artifacts"),
    }
)

# OpenAPI / docs paths are allowed implicitly but not in the approved surface
_OPENAPI_PATHS: frozenset[str] = frozenset({"/openapi.json", "/docs", "/redoc"})

# Path fragments that must NEVER appear in any route
FORBIDDEN_FRAGMENTS: list[str] = [
    "/ws",
    "/ws-proxy",
    "/pantheon",
    "/relay",
    "/socket",
    "/federation-core",
]


def _api_routes() -> list[APIRoute]:
    return [r for r in app.routes if isinstance(r, APIRoute)]


def _ws_routes() -> list[APIWebSocketRoute]:
    return [r for r in app.routes if isinstance(r, APIWebSocketRoute)]


def test_no_websocket_routes() -> None:
    """SENTINEL-2a: forgepilot-api is REST-only — zero WebSocket routes permitted."""
    ws = _ws_routes()
    assert not ws, (
        "SENTINEL-2a TRIPPED — WebSocket routes detected in forgepilot-api "
        "(REST-only service):\n" + "\n".join(f"  • {r.path}" for r in ws)
    )


def test_no_forbidden_path_fragments() -> None:
    """SENTINEL-2b: Forbidden path fragments must not appear in any route."""
    violations: list[str] = []
    for route in app.routes:
        path: str = getattr(route, "path", "")
        for fragment in FORBIDDEN_FRAGMENTS:
            if fragment in path:
                violations.append(f"{path!r} contains forbidden fragment {fragment!r}")
    assert not violations, (
        "SENTINEL-2b TRIPPED — Forbidden route fragments detected:\n"
        + "\n".join(f"  • {v}" for v in violations)
    )


def test_all_approved_routes_present() -> None:
    """SENTINEL-2c: Every approved route must exist (deletion guard)."""
    actual: set[tuple[str, str]] = set()
    for route in _api_routes():
        for method in route.methods or []:
            actual.add((method, route.path))

    missing = APPROVED_ROUTES - actual
    assert not missing, (
        "SENTINEL-2c TRIPPED — Approved routes have been REMOVED:\n"
        + "\n".join(f"  • {m[0]} {m[1]}" for m in sorted(missing))
    )


def test_no_unknown_routes_outside_approved_surface() -> None:
    """SENTINEL-2d: No new route may be added without updating APPROVED_ROUTES."""
    actual: set[tuple[str, str]] = set()
    for route in _api_routes():
        if route.path in _OPENAPI_PATHS:
            continue
        for method in route.methods or []:
            actual.add((method, route.path))

    unknown = actual - APPROVED_ROUTES
    assert not unknown, (
        "SENTINEL-2d TRIPPED — New routes detected outside the approved surface.\n"
        "If intentional, add them to APPROVED_ROUTES in this sentinel file.\n"
        + "\n".join(f"  • {m[0]} {m[1]}" for m in sorted(unknown))
    )


def test_health_route_has_no_auth() -> None:
    """SENTINEL-2e: /health must be accessible (no dependency injection on route)."""
    health_routes = [
        r for r in _api_routes() if r.path == "/health" and "GET" in (r.methods or [])
    ]
    assert len(health_routes) == 1, (
        "SENTINEL-2e TRIPPED — /health GET route is missing or duplicated. "
        f"Found {len(health_routes)} matches."
    )


# ─────────────────────────────────────────────────────────────────────────────
# Drift tripwire hashes — update only after doctrine review
# ─────────────────────────────────────────────────────────────────────────────
_APPROVED_ROUTES_HASH = "cc25346bf3dc67e1"
_FORBIDDEN_FRAGS_HASH = "c36f87a3346c6a90"


def _compute_hash(data: object) -> str:
    return hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()[:16]


@pytest.mark.sentinel
class TestFcRouteDriftTripwire:
    """Drift tripwires: detect unapproved changes to route surface constants.

    If APPROVED_ROUTES or FORBIDDEN_FRAGMENTS change without updating the stored
    hash, this class trips and blocks merge.  To approve a change:
      1. Make the intentional edit to the constant.
      2. Re-run the hash function to get the new digest.
      3. Update _APPROVED_ROUTES_HASH / _FORBIDDEN_FRAGS_HASH below.
      4. Commit: sentinel(drift): approve <what changed> — <reason>
    """

    def test_approved_routes_hash_unchanged(self) -> None:
        """DRIFT: APPROVED_ROUTES set must match stored hash."""
        actual = _compute_hash(sorted([list(r) for r in APPROVED_ROUTES]))
        assert actual == _APPROVED_ROUTES_HASH, (
            f"DRIFT TRIPWIRE TRIPPED — APPROVED_ROUTES changed without approval. "
            f"New hash={actual!r}. Update _APPROVED_ROUTES_HASH after doctrine review."
        )

    def test_forbidden_fragments_hash_unchanged(self) -> None:
        """DRIFT: FORBIDDEN_FRAGMENTS list must match stored hash."""
        actual = _compute_hash(sorted(FORBIDDEN_FRAGMENTS))
        assert actual == _FORBIDDEN_FRAGS_HASH, (
            f"DRIFT TRIPWIRE TRIPPED — FORBIDDEN_FRAGMENTS changed without approval. "
            f"New hash={actual!r}. Update _FORBIDDEN_FRAGS_HASH after doctrine review."
        )

