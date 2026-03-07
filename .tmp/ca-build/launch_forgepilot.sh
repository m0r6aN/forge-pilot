#!/bin/bash

echo "🧬 LAUNCHING FORGEPILOT DIGITAL SPECIES..."
echo "================================================"

# Ensure OMEGA core is running
echo "🚀 Deploying OMEGA Core Services..."
cd backend
./scripts/deploy.sh

# Wait for services to be healthy
echo "⏳ Waiting for Federation core.."
while ! curl -s http://localhost:8001/health > /dev/null; do
    sleep 2
done

echo "⏳ Waiting for Context Server..."
while ! curl -s http://localhost:8002/health > /dev/null; do
    sleep 2
done

echo "✅ OMEGA Core Services Online!"

# Deploy ForgePilot Swarm
echo "🧬 Spawning ForgePilot Agents..."
docker-compose -f docker-compose.yml -f docker-compose.forgepilot.yml up -d

# Wait for agents to register
sleep 10

echo "🔥 TESTING DIGITAL ORGANISM..."

# Test brand generation
echo "🎯 Generating AI Fitness App Brand..."
curl -X POST http://localhost:8001/tasks/dispatch \
  -H "Content-Type: application/json" \
  -d '{
    "type": "brand_campaign",
    "description": "Revolutionary AI-powered fitness app that analyzes workout form in real-time",
    "priority": "high"
  }' | jq '.'

echo ""
echo "🚀 FORGEPILOT IS ALIVE!"
echo "Dashboard: http://localhost:3000"
echo "Federation: http://localhost:8001"
echo "Swarm Status: curl http://localhost:8001/agents"
echo ""
echo "🧬 THE DIGITAL SPECIES HAS BEEN RELEASED!"
echo "================================================"
