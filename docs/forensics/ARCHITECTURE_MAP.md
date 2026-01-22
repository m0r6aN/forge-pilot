# ForgePilot Architecture Map

```mermaid
flowchart LR
    subgraph Web["Next.js Frontend (3030)"]
        UI["Pages & API routes"]
        Client["BrandGenieClient (src/lib/forgepilot-client.ts)"]
    end

    subgraph Orchestrator["FastAPI Orchestrator (8010)"]
        Service["/campaign /health /capabilities"]
        Core["ForgePilotOrchestrator"]
        Agents["Agent Registry"]
        BS["Brand Strategist (real)"]
        Sim["Domain/Legal/Market/Creative/Pricing/Launch (simulated)"]
    end

    subgraph OMEGA["OMEGA Core (expected external)"]
        Fed["Federation Core :8001"]
        Ctx["Context Server :8002"]
    end

    UI --> Client
    Client -- HTTP --> Service
    Service --> Core
    Core --> Agents
    Agents --> BS
    Agents --> Sim
    Core -- HTTP POST /campaigns/* --> Fed
    BS -- HTTP POST /context/gather --> Ctx
```

## Call Graph (who calls who)
- Frontend `BrandGenieClient` → Backend `/campaign` (HTTP POST JSON) and `/health`/`/capabilities` (HTTP GET).
- FastAPI service → `ForgePilotOrchestrator.create_brand_campaign` → `_execute_*` methods → agent registry entries.
- Orchestrator (when `is_omega_available()` true) → OMEGA Federation Core via HTTP POST `/campaigns/register` and `/campaigns/complete`.
- Brand Strategist Agent (when `is_omega_available()` true) → OMEGA Context Server via HTTP POST `/context/gather`; registers task completion via `/tasks/complete` to Federation Core.

## Notes
- Only Brand Strategist agent is implemented; others are simulated fallbacks.
- OMEGA availability detection relies on importing `core.*` modules; current tree lacks `core`, so integration currently runs in fallback/failed mode.
