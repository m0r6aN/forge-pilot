import asyncio
from forgepilot_orchestrator import ForgePilotOrchestrator


async def generate_killer_brand():
    orchestrator = ForgePilotOrchestrator()

    # One call = complete business transformation
    campaign = await orchestrator.create_brand_campaign(
        """
        Revolutionary AI-powered fitness app that creates personalized 
        workout plans using computer vision to analyze form in real-time. 
        Target market: fitness enthusiasts aged 25-40 who value technology 
        and personalized experiences.
        """
    )

    print("🚀 BRAND CAMPAIGN COMPLETE!")
    print(f"💎 Brand Name: {campaign['brand_strategy']['primary_brand']}")
    print(f"🌐 Best Domain: {campaign['domain_options']['recommended']}")
    print(f"⚖️ Legal Status: {campaign['legal_status']['overall_risk']}")
    print(f"💰 Pricing Model: {campaign['pricing_strategy']['model']}")
    print(f"🎯 Launch Strategy: {campaign['launch_plan']['primary_channel']}")

    # The swarm just created a complete business identity in seconds!


if __name__ == "__main__":
    asyncio.run(generate_killer_brand())
