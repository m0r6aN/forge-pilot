# ForgePilot SDK

Official Python SDK for ForgePilot - AI-powered brand campaign creation.

## Installation

```bash
pip install forgepilot
```

## Quick Start

```python
from forgepilot import ForgePilotClient

# Initialize
client = ForgePilotClient(api_key="your-key")

# Create campaign
result = await client.create_brand_campaign(
    business_idea="AI fitness app",
    target_audience="Health-conscious millennials",
    brand_values=["innovation", "wellness"]
)

# Get results
print(f"Brand: {result.brand_name}")
print(f"Domains: {result.available_domains}")
```

## Features

✅ **Brand Campaign Creation** - AI-powered brand strategy
✅ **Domain Research** - Automated availability checking
✅ **Brand Guidelines** - Colors, typography, voice & tone
✅ **Genesis Protocol** - Dynamic tool creation
✅ **Progress Monitoring** - Real-time workflow tracking
✅ **Type Safety** - Full Pydantic models

## Documentation

- [Quick Start Guide](docs/quickstart.md)
- [API Reference](docs/api-reference.md)
- [Examples](examples/)

## Requirements

- Python 3.11+
- httpx
- pydantic

## License

MIT
