"""Contract tests for Federation Core API endpoints.

These tests verify the API contracts between forgepilot-api and federation_core.
They ensure request/response schemas match expectations and that breaking changes
are caught early.

Contract testing is crucial for microservice architectures to prevent integration issues.
"""

import pytest
import httpx
import os
from typing import Dict, Any
from uuid import uuid4
from jsonschema import validate, ValidationError


@pytest.fixture
def federation_base_url() -> str:
    """Get Federation Core base URL."""
    return os.getenv("FEDERATION_URL", "http://localhost:3000")


# ============================================================================
# Contract Schemas - Define expected API shapes
# ============================================================================

HEALTH_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "status": {"type": "string", "enum": ["healthy", "degraded", "unhealthy"]},
        "version": {"type": "string"},
        "timestamp": {"type": "string", "format": "date-time"},
        "features": {
            "type": "object",
            "properties": {
                "genesis_protocol": {"type": "boolean"},
                "pantheon": {"type": "boolean"},
                "federation": {"type": "boolean"},
            }
        },
        "dependencies": {"type": "object"}
    },
    "required": ["status", "version", "timestamp"]
}

CONVERSATION_CREATE_REQUEST_SCHEMA = {
    "type": "object",
    "properties": {
        "mission": {
            "type": "object",
            "properties": {
                "type": {"type": "string"},
                "workflow": {"type": "string"},
                "objective": {"type": "string"},
                "phases": {"type": "array"},
            },
            "required": ["type", "workflow", "objective"]
        },
        "metadata": {
            "type": "object",
            "properties": {
                "correlation_id": {"type": "string"},
                "tenant_id": {"type": "string"},
                "actor_id": {"type": "string"},
                "source": {"type": "string"},
            }
        }
    },
    "required": ["mission"]
}

CONVERSATION_CREATE_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "conversation_id": {"type": "string"},
        "state": {"type": "string", "enum": ["queued", "active", "processing", "completed", "failed"]},
        "created_at": {"type": "string"},
        "mission_type": {"type": "string"},
    },
    "required": ["conversation_id", "state", "created_at"]
}

CONVERSATION_STATUS_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "conversation_id": {"type": "string"},
        "state": {"type": "string"},
        "created_at": {"type": "string"},
        "updated_at": {"type": "string"},
        "current_phase": {"type": ["string", "null"]},
        "completion_percentage": {"type": "number", "minimum": 0, "maximum": 100},
        "phase_results": {"type": "object"},
        "error": {"type": ["string", "null"]},
    },
    "required": ["conversation_id", "state", "created_at"]
}

GENESIS_TOOL_CREATE_REQUEST_SCHEMA = {
    "type": "object",
    "properties": {
        "protocol": {"type": "string", "const": "genesis"},
        "action": {"type": "string", "enum": ["create_tool", "spawn_agent"]},
        "spec": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "description": {"type": "string"},
                "input_schema": {"type": "object"},
            },
            "required": ["name"]
        },
        "metadata": {"type": "object"}
    },
    "required": ["protocol", "action", "spec"]
}

GENESIS_TOOL_CREATE_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "tool_id": {"type": "string"},
        "name": {"type": "string"},
        "status": {"type": "string", "enum": ["created", "deployed", "ready", "failed"]},
        "created_at": {"type": "string"},
    },
    "required": ["tool_id", "status"]
}


@pytest.mark.contracts
@pytest.mark.asyncio
class TestFederationHealthContract:
    """Test health endpoint contract."""

    async def test_health_endpoint_contract(self, federation_base_url):
        """Verify /health endpoint matches contract."""
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{federation_base_url}/health")

            # Status code contract
            assert response.status_code == 200, "Health endpoint must return 200"

            # Response schema contract
            data = response.json()
            try:
                validate(instance=data, schema=HEALTH_RESPONSE_SCHEMA)
            except ValidationError as e:
                pytest.fail(f"Health response schema violation: {e.message}")

            # Semantic contract
            assert data["status"] in ["healthy", "degraded", "unhealthy"]
            assert len(data["version"]) > 0

    async def test_health_endpoint_headers(self, federation_base_url):
        """Verify health endpoint returns correct headers."""
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{federation_base_url}/health")

            # Headers contract
            assert "content-type" in response.headers
            assert "application/json" in response.headers["content-type"]


@pytest.mark.contracts
@pytest.mark.asyncio
class TestConversationAPIContract:
    """Test conversation creation and management contracts."""

    async def test_create_conversation_contract(self, federation_base_url):
        """Verify POST /conversations endpoint contract."""
        request_payload = {
            "mission": {
                "type": "conversational_pantheon",
                "workflow": "test_workflow",
                "objective": "Test objective",
                "phases": []
            },
            "metadata": {
                "correlation_id": str(uuid4()),
                "tenant_id": str(uuid4()),
                "actor_id": "test@example.com",
                "source": "contract-test"
            }
        }

        # Verify request schema
        try:
            validate(instance=request_payload, schema=CONVERSATION_CREATE_REQUEST_SCHEMA)
        except ValidationError as e:
            pytest.fail(f"Request schema violation: {e.message}")

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{federation_base_url}/conversations",
                json=request_payload
            )

            # Status code contract
            assert response.status_code in [200, 201, 202], \
                f"Create conversation must return 2xx, got {response.status_code}"

            # Response schema contract
            data = response.json()
            try:
                validate(instance=data, schema=CONVERSATION_CREATE_RESPONSE_SCHEMA)
            except ValidationError as e:
                pytest.fail(f"Create conversation response schema violation: {e.message}")

    async def test_get_conversation_contract(self, federation_base_url):
        """Verify GET /conversations/{id} endpoint contract."""
        # First create a conversation
        create_payload = {
            "mission": {
                "type": "conversational_pantheon",
                "workflow": "contract_test",
                "objective": "Contract test",
            },
            "metadata": {
                "correlation_id": str(uuid4()),
                "source": "contract-test"
            }
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            create_response = await client.post(
                f"{federation_base_url}/conversations",
                json=create_payload
            )

            conversation_id = create_response.json()["conversation_id"]

            # Now test GET endpoint
            get_response = await client.get(
                f"{federation_base_url}/conversations/{conversation_id}"
            )

            # Status code contract
            assert get_response.status_code == 200

            # Response schema contract
            data = get_response.json()
            try:
                validate(instance=data, schema=CONVERSATION_STATUS_RESPONSE_SCHEMA)
            except ValidationError as e:
                pytest.fail(f"Get conversation response schema violation: {e.message}")

            # ID consistency contract
            assert data["conversation_id"] == conversation_id

    async def test_conversation_not_found_contract(self, federation_base_url):
        """Verify 404 response contract for non-existent conversation."""
        fake_id = str(uuid4())

        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{federation_base_url}/conversations/{fake_id}"
            )

            # Status code contract
            assert response.status_code == 404

            # Error response should be JSON
            assert "application/json" in response.headers.get("content-type", "")

            data = response.json()
            # Error response should have standard structure
            assert "error" in data or "detail" in data or "message" in data


@pytest.mark.contracts
@pytest.mark.asyncio
class TestGenesisAPIContract:
    """Test Genesis Protocol API contracts."""

    async def test_create_tool_contract(self, federation_base_url):
        """Verify POST /genesis/tools endpoint contract."""
        request_payload = {
            "protocol": "genesis",
            "action": "create_tool",
            "spec": {
                "name": "contract_test_tool",
                "description": "Tool for contract testing",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "value": {"type": "string"}
                    }
                },
                "implementation": {
                    "type": "python_function",
                    "code": "def process(value: str) -> dict:\n    return {'result': value}"
                }
            },
            "metadata": {
                "test": "contract",
                "correlation_id": str(uuid4())
            }
        }

        # Verify request schema
        try:
            validate(instance=request_payload, schema=GENESIS_TOOL_CREATE_REQUEST_SCHEMA)
        except ValidationError as e:
            pytest.fail(f"Genesis request schema violation: {e.message}")

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{federation_base_url}/genesis/tools",
                json=request_payload
            )

            # Status code contract
            assert response.status_code in [200, 201, 202], \
                f"Genesis tool creation must return 2xx, got {response.status_code}"

            # Response schema contract
            data = response.json()
            try:
                validate(instance=data, schema=GENESIS_TOOL_CREATE_RESPONSE_SCHEMA)
            except ValidationError as e:
                pytest.fail(f"Genesis response schema violation: {e.message}")

    async def test_get_tool_contract(self, federation_base_url):
        """Verify GET /genesis/tools/{id} endpoint contract."""
        # Create a tool first
        create_payload = {
            "protocol": "genesis",
            "action": "create_tool",
            "spec": {
                "name": "get_contract_test_tool",
                "description": "Test",
            }
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            create_response = await client.post(
                f"{federation_base_url}/genesis/tools",
                json=create_payload
            )

            tool_id = create_response.json()["tool_id"]

            # Now test GET endpoint
            get_response = await client.get(
                f"{federation_base_url}/genesis/tools/{tool_id}"
            )

            # Status code contract
            assert get_response.status_code == 200

            # Response should contain tool info
            data = get_response.json()
            assert "name" in data
            assert "status" in data
            assert data["status"] in ["created", "deployed", "ready", "failed"]


@pytest.mark.contracts
@pytest.mark.asyncio
class TestErrorHandlingContracts:
    """Test error handling and error response contracts."""

    async def test_invalid_json_contract(self, federation_base_url):
        """Verify error handling for invalid JSON."""
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"{federation_base_url}/conversations",
                content="invalid json{{{",  # Malformed JSON
                headers={"content-type": "application/json"}
            )

            # Status code contract
            assert response.status_code in [400, 422]

            # Error response should be JSON
            assert "application/json" in response.headers.get("content-type", "")

    async def test_missing_required_fields_contract(self, federation_base_url):
        """Verify error handling for missing required fields."""
        incomplete_payload = {
            "mission": {
                # Missing required 'type', 'workflow', 'objective'
            }
        }

        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"{federation_base_url}/conversations",
                json=incomplete_payload
            )

            # Status code contract
            assert response.status_code in [400, 422]

            # Error response should describe what's missing
            data = response.json()
            error_text = str(data).lower()
            # Should mention field names or validation
            assert any(word in error_text for word in ["required", "missing", "invalid", "field"])

    async def test_method_not_allowed_contract(self, federation_base_url):
        """Verify error handling for unsupported HTTP methods."""
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Try DELETE on a POST-only endpoint
            response = await client.delete(
                f"{federation_base_url}/conversations/test-id"
            )

            # Status code contract
            assert response.status_code in [405, 404]

            if response.status_code == 405:
                # Should have Allow header
                assert "allow" in response.headers or "Allow" in response.headers


@pytest.mark.contracts
@pytest.mark.asyncio
class TestAPIVersioningContract:
    """Test API versioning contracts."""

    async def test_version_header_contract(self, federation_base_url):
        """Verify API version is communicated in responses."""
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{federation_base_url}/health")

            # Version should be in response body or header
            if "x-api-version" in response.headers or "X-API-Version" in response.headers:
                version = response.headers.get("x-api-version") or response.headers.get("X-API-Version")
                assert len(version) > 0
            else:
                # Version should be in health response
                data = response.json()
                assert "version" in data

    async def test_backwards_compatibility_contract(self, federation_base_url):
        """Verify backwards compatibility with older request formats."""
        # Minimal v1-style request
        minimal_payload = {
            "mission": {
                "type": "conversational_pantheon",
                "workflow": "test",
                "objective": "test"
            }
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{federation_base_url}/conversations",
                json=minimal_payload
            )

            # Should accept minimal format
            assert response.status_code in [200, 201, 202]


@pytest.mark.contracts
@pytest.mark.asyncio
class TestCORSContract:
    """Test CORS (Cross-Origin Resource Sharing) contracts."""

    async def test_cors_headers_contract(self, federation_base_url):
        """Verify CORS headers are present."""
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.options(
                f"{federation_base_url}/health",
                headers={"Origin": "http://localhost:3001"}
            )

            # Should handle OPTIONS request
            assert response.status_code in [200, 204]

            # Should have CORS headers (if CORS is enabled)
            # This is optional depending on federation_core configuration
            cors_headers = {
                "access-control-allow-origin",
                "access-control-allow-methods",
                "access-control-allow-headers"
            }

            headers_lower = {k.lower(): v for k, v in response.headers.items()}

            # If any CORS header is present, check configuration
            if any(h in headers_lower for h in cors_headers):
                assert "access-control-allow-origin" in headers_lower
