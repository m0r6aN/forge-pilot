#!/usr/bin/env python3
"""
🧬 ForgePilot Integration Test - Quick Verification

This script tests the complete ForgePilot integration to ensure:
1. OMEGA compatibility layer works
2. Brand Strategist Agent loads correctly
3. Orchestrator class functions properly
4. FastAPI service is ready

Run this before deploying to catch any integration issues.
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the backend source to Python path
backend_src = Path(__file__).parent / "backend" / "src"
sys.path.insert(0, str(backend_src))


async def test_omega_compatibility():
    """Test OMEGA compatibility layer"""
    print("🧬 Testing OMEGA compatibility layer...")

    try:
        from forgepilot.omega import (
            BaseAgent,
            CollaboratorMixin,
            TaskResult,
            is_omega_available,
            get_omega_info,
        )

        print(f"   ✅ OMEGA classes imported successfully")

        # Test OMEGA info
        omega_info = get_omega_info()
        print(f"   📊 OMEGA Status: {omega_info['mode']}")
        print(f"   📍 OMEGA Available: {is_omega_available()}")

        # Test TaskResult
        result = TaskResult(success=True, data={"test": "data"})
        print(f"   ✅ TaskResult creation: {result.success}")

        return True

    except Exception as e:
        print(f"   ❌ OMEGA compatibility error: {e}")
        return False


async def test_brand_strategist_agent():
    """Test Brand Strategist Agent"""
    print("🎯 Testing Brand Strategist Agent...")

    try:
        from forgepilot.agents.brand_strategist.agent import brand_strategist_agent

        print(
            f"   ✅ Brand Strategist Agent imported: {brand_strategist_agent.agent_name}"
        )

        # Test task relevance
        test_task = {"description": "Create a brand strategy for an AI fitness app"}
        is_relevant = await brand_strategist_agent.is_task_relevant(test_task)
        print(f"   🎯 Task relevance check: {is_relevant}")

        # Test task execution (quick test)
        if is_relevant:
            print("   🚀 Testing task execution...")
            result = await brand_strategist_agent.execute_task(test_task)
            print(f"   ✅ Task execution: {result.success}")
            if result.success:
                strategy = result.data
                print(f"   📊 Generated strategy components: {len(strategy)}")

        return True

    except Exception as e:
        print(f"   ❌ Brand Strategist Agent error: {e}")
        return False


async def test_orchestrator():
    """Test ForgePilot Orchestrator"""
    print("🧬 Testing ForgePilot Orchestrator...")

    try:
        from forgepilot.services.orchestrator.forgepilot_orchestrator import (
            ForgePilotOrchestrator,
            BrandCampaignRequest,
        )

        # Create orchestrator instance
        orchestrator = ForgePilotOrchestrator()
        print(f"   ✅ Orchestrator created: {orchestrator.orchestrator_id}")

        # Test agent loading
        await orchestrator._load_agents()
        available_agents = [
            name for name, agent in orchestrator.agent_registry.items() if agent
        ]
        print(f"   🤖 Available agents: {available_agents}")

        # Quick campaign test (shortened)
        request = BrandCampaignRequest(
            description="AI fitness app for testing purposes",
            industry="fitness_technology",
        )

        print("   🚀 Testing quick campaign generation...")
        campaign = await orchestrator.create_brand_campaign(request)
        print(f"   ✅ Campaign generated: {campaign.campaign_id}")
        print(f"   ⚡ Execution time: {campaign.execution_time:.1f}s")
        print(f"   💰 Cost estimate: ${campaign.cost_estimate}")

        return True

    except Exception as e:
        print(f"   ❌ Orchestrator error: {e}")
        return False


async def test_fastapi_service():
    """Test FastAPI service import"""
    print("🌐 Testing FastAPI service...")

    try:
        from forgepilot.services.orchestrator.service import app, orchestrator

        print(f"   ✅ FastAPI app imported: {app.title}")
        print(f"   🧬 Service orchestrator: {orchestrator.orchestrator_id}")

        # Test that routes are registered
        routes = [route.path for route in app.routes]
        expected_routes = ["/campaign", "/health", "/capabilities"]

        for route in expected_routes:
            if route in routes:
                print(f"   ✅ Route available: {route}")
            else:
                print(f"   ⚠️  Route missing: {route}")

        return True

    except Exception as e:
        print(f"   ❌ FastAPI service error: {e}")
        return False


async def main():
    """Run all integration tests"""
    print("🧬" * 25)
    print("🚀 FORGEPILOT INTEGRATION TEST")
    print("🧬" * 25)
    print()

    tests = [
        ("OMEGA Compatibility", test_omega_compatibility),
        ("Brand Strategist Agent", test_brand_strategist_agent),
        ("ForgePilot Orchestrator", test_orchestrator),
        ("FastAPI Service", test_fastapi_service),
    ]

    results = []

    for test_name, test_func in tests:
        print(f"🔍 Running {test_name} test...")
        try:
            success = await test_func()
            results.append((test_name, success))
        except Exception as e:
            print(f"   💥 Test {test_name} crashed: {e}")
            results.append((test_name, False))
        print()

    # Final results
    print("📊 INTEGRATION TEST RESULTS")
    print("=" * 40)

    passed = 0
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"   {status} {test_name}")
        if success:
            passed += 1

    success_rate = (passed / len(results)) * 100
    print(f"\n🎯 Success Rate: {passed}/{len(results)} ({success_rate:.0f}%)")

    if success_rate == 100:
        print("🚀 ALL TESTS PASSED! ForgePilot integration is ready!")
        print("💡 Next steps:")
        print("   1. Run: ./quick-start.sh")
        print("   2. Test: python3 demo.py")
        print("   3. Deploy: docker-compose up -d")
    elif success_rate >= 75:
        print("⚡ MOSTLY WORKING! Some components need attention.")
        print("💡 Fix failed tests and re-run this script.")
    else:
        print("💥 MULTIPLE ISSUES DETECTED!")
        print("💡 Review failed tests and check dependencies.")

    print(f"\n🧬 Integration test complete!")
    return success_rate == 100


if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n👋 Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Test suite crashed: {e}")
        sys.exit(1)
