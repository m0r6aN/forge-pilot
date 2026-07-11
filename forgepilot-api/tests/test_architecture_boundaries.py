"""
SENTINEL 1 — Architecture Boundary Guard

Fails if forgepilot-api imports from forbidden namespaces or if anything
other than FederationClient constructs httpx clients.

This is a static-analysis test (AST-based) — no runtime dependencies.
"""

import ast
import pathlib
import pytest

pytestmark = [pytest.mark.sentinel, pytest.mark.unit]

APP_DIR = pathlib.Path(__file__).parent.parent / "app"

# Namespaces that must NEVER appear in forgepilot-api imports
FORBIDDEN_NAMESPACES = [
    "keon_sdk",
    "keon_cortex",
    "services.federation_core",
    "services.orchestrator",
    "agents.orchestrator",
    "agents.planner",
    "relay",
    "workflows.keon_runtime",
    "stages.prompt_airlock",
    "integrations.keon",
]

# Deletion guard: app/ must not shrink below this many .py files
MINIMUM_APP_MODULES = 8


def _collect_imports(tree: ast.AST) -> list[str]:
    """Return all imported module names from an AST."""
    names: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                names.append(alias.name)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                names.append(node.module)
    return names


def test_no_forbidden_namespace_imports() -> None:
    """SENTINEL-1a: forgepilot-api must never import from forbidden namespaces."""
    violations: list[str] = []
    for py_file in sorted(APP_DIR.rglob("*.py")):
        source = py_file.read_text(encoding="utf-8")
        try:
            tree = ast.parse(source, filename=str(py_file))
        except SyntaxError:
            continue
        for imported in _collect_imports(tree):
            for forbidden in FORBIDDEN_NAMESPACES:
                if imported == forbidden or imported.startswith(forbidden + "."):
                    rel = py_file.relative_to(APP_DIR)
                    violations.append(f"{rel}: imports '{imported}'")

    assert not violations, (
        "SENTINEL-1a TRIPPED — forgepilot-api has forbidden namespace imports:\n"
        + "\n".join(f"  • {v}" for v in violations)
    )


def test_federation_client_is_only_httpx_user() -> None:
    """SENTINEL-1b: Only FederationClient may construct httpx clients in app/."""
    violations: list[str] = []
    exempt = APP_DIR / "clients" / "federation_client.py"

    for py_file in sorted(APP_DIR.rglob("*.py")):
        if py_file == exempt:
            continue
        source = py_file.read_text(encoding="utf-8")
        # Only flag direct httpx client construction, NOT usage of FederationClient()
        if "httpx.AsyncClient(" in source or "httpx.Client(" in source:
            violations.append(str(py_file.relative_to(APP_DIR)))

    assert not violations, (
        "SENTINEL-1b TRIPPED — httpx client usage found outside FederationClient:\n"
        + "\n".join(f"  • {v}" for v in violations)
    )


def test_app_module_count_not_regressed() -> None:
    """SENTINEL-1c: Module count must not fall below minimum (deletion guard)."""
    py_files = list(APP_DIR.rglob("*.py"))
    count = len(py_files)
    assert count >= MINIMUM_APP_MODULES, (
        f"SENTINEL-1c TRIPPED — Only {count} Python modules in app/ "
        f"(expected >= {MINIMUM_APP_MODULES}). Did something get deleted?"
    )


def test_app_dir_exists() -> None:
    """SENTINEL-1d: app/ directory must exist (workspace sanity guard)."""
    assert APP_DIR.is_dir(), (
        f"SENTINEL-1d TRIPPED — app/ directory not found at {APP_DIR}. "
        "Workspace structure has changed."
    )

