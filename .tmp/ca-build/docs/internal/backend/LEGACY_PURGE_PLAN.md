# Legacy Backend Purge Plan

## Overview

The `/backend` directory contains an agent-framework-based implementation that violates OMEGA-native principles. It will be archived and replaced with a thin API layer.

## What's Being Removed

### Directory Structure
```
backend/
├── agents/                 # Local agent implementations
│   ├── brand_strategist/   # OMEGA Pantheon replacement
│   ├── creative_director/  # OMEGA Pantheon replacement
│   ├── domain_hunter/      # OMEGA Pantheon replacement
│   └── legal_guardian/     # OMEGA Pantheon replacement
├── services/
│   └── orchestrator/       # Local orchestration (forbidden)
├── omega/                  # Import-based agent loading
├── example/                # Legacy examples
└── requirements.txt        # Old dependencies
```

## Why It's Being Removed

### 1. **Duplicate Orchestration**
- `services/orchestrator/forgepilot_orchestrator.py` implements workflow management
- This is the **exact responsibility** of Federation Core
- Violates "single control plane" principle

### 2. **Import-Based Agent Loading**
- `omega/` directory contains local agent imports
- Federation Core uses network-based agent discovery
- Import-based approach cannot scale across services

### 3. **Agent Framework Coupling**
- Local agents have framework dependencies
- OMEGA Pantheon agents are framework-agnostic
- Creates tight coupling and deployment complexity

### 4. **State Management**
- Orchestrator manages conversation state locally
- Federation Core is the canonical state store
- Creates state synchronization issues

### 5. **Tool Routing**
- Local orchestrator routes tool invocations
- Federation Core handles all tool routing
- Duplicate routing logic creates inconsistency

## What's Being Kept (Archived)

The entire `/backend` directory will be moved to `/attic/backend_legacy_20260122/` for:
- Historical reference
- Migration rollback if needed
- Understanding legacy design decisions

## Replacement Architecture

### Before (Legacy)
```
Client → forgepilot-api → orchestrator → local agents → tools
                     ↓
            (state management)
```

### After (OMEGA-Native)
```
Client → forgepilot-api → Federation Core → OMEGA Pantheon → MCP Agents
                                   ↓
                        (canonical state store)
```

## Migration Impact

### No Breaking Changes
- API endpoints remain the same
- Request/response schemas unchanged
- Client integration unaffected

### Internal Changes Only
- Implementation replaced
- Federation Core integration
- No backward compatibility layer needed

## Purge Timeline

1. **Archive**: Move `/backend` → `/attic/backend_legacy_20260122/`
2. **Replace**: Create `/forgepilot-api` with thin API layer
3. **Update**: Modify `docker-compose.yml` to use new service
4. **Test**: Verify Federation Core integration
5. **Document**: Update README with new architecture

## Files Affected

### Removed
- `/backend/**/*` (entire directory)

### Modified
- `/docker-compose.yml` - Update service definition
- `/README.md` - Update Quick Start instructions
- `/Dockerfile` - Point to new API

### Created
- `/forgepilot-api/**/*` - New thin API implementation
- `/attic/backend_legacy_20260122/**/*` - Archived legacy code
- `/docs/backend/**/*` - New specifications

## Risk Mitigation

### Rollback Plan
If Federation Core integration fails:
1. Restore from `/attic/backend_legacy_20260122/`
2. Revert `docker-compose.yml` changes
3. No data loss (no migration needed)

### Testing Strategy
1. Unit tests for new API layer
2. Integration tests with Federation Core
3. Contract tests for API schemas
4. Load tests for performance validation

## Success Criteria

- [ ] All legacy backend code archived
- [ ] New API passes all tests
- [ ] Federation Core integration validated
- [ ] Docker Compose updated
- [ ] README updated with new Quick Start
- [ ] No regression in API functionality

## Notes

This is a **replacement**, not a migration. The new implementation shares no code with the legacy backend. This ensures clean separation and prevents architectural compromises.
