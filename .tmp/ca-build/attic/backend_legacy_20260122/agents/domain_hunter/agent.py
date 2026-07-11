from core.agents.base_agent import BaseAgent
from core.mixins.collaborator import CollaboratorMixin
from core.models.core_models import TaskResult
import aiohttp
import asyncio
import re
from typing import Dict, Any, List


class DomainHunterAgent(BaseAgent, CollaboratorMixin):
    """Real-time domain availability and optimization specialist"""

    def __init__(self):
        super().__init__(
            agent_name="domain_hunter",
            description="Hunts for available domains and optimizes domain strategies",
            capabilities=[
                "domain_availability_check",
                "domain_suggestion_generation",
                "tld_analysis",
                "domain_valuation",
            ],
            version="1.0.0",
        )

    def _extract_brand_names(self, description: str) -> List[str]:
        """Extract potential brand names from task description"""
        # Simple extraction - look for quoted names or capitalize words
        quoted_names = re.findall(r'"([^"]*)"', description)
        if quoted_names:
            return quoted_names

        # Fallback: extract meaningful words
        words = re.findall(r"\b[A-Z][a-z]+\b", description)
        return words[:3] if words else ["brandname"]

    def _generate_domain_summary(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate summary of domain search results"""
        total_domains = len(results)
        available_domains = [r for r in results if r.get("available", False)]
        premium_domains = [r for r in results if r.get("premium", False)]

        return {
            "total_searched": total_domains,
            "available_count": len(available_domains),
            "premium_count": len(premium_domains),
            "availability_rate": len(available_domains) / total_domains
            if total_domains > 0
            else 0,
            "average_price": sum(r.get("price", 0) for r in available_domains)
            / len(available_domains)
            if available_domains
            else 0,
        }

    def _generate_domain_recommendations(
        self, results: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate domain recommendations based on results"""
        available_domains = [r for r in results if r.get("available", False)]

        # Sort by preference: .com first, then by price
        com_domains = [r for r in available_domains if r.get("tld") == ".com"]
        other_domains = [r for r in available_domains if r.get("tld") != ".com"]
        other_domains.sort(key=lambda x: x.get("price", 999))

        return {
            "primary_recommendation": com_domains[0]["domain"]
            if com_domains
            else (available_domains[0]["domain"] if available_domains else None),
            "alternatives": [
                r["domain"] for r in (com_domains[1:3] + other_domains[:2])
            ],
            "premium_options": [
                r["domain"] for r in available_domains if r.get("premium", False)
            ][:3],
            "total_cost_estimate": f"${sum(r.get('price', 0) for r in available_domains[:5]):.2f} for top 5 domains",
        }

    async def is_task_relevant(self, task: Dict[str, Any]) -> bool:
        """Check if task involves domain research"""
        keywords = [
            "domain",
            "website",
            "url",
            "tld",
            "domain name",
            "domain research",
            "domain availability",
        ]
        task_text = str(task.get("description", "")).lower()
        return any(keyword in task_text for keyword in keywords)

    async def execute_task(self, task: Dict[str, Any]) -> TaskResult:
        """Execute domain hunting tasks"""
        try:
            brand_names = task.get("brand_names", [])
            if not brand_names:
                # Extract from task description
                brand_names = self._extract_brand_names(task.get("description", ""))

            domain_analysis = await self._hunt_domains(brand_names)

            return TaskResult(
                success=True,
                data=domain_analysis,
                metadata={
                    "agent": self.agent_name,
                    "domains_checked": len(domain_analysis.get("results", [])),
                    "available_domains": len(
                        [
                            d
                            for d in domain_analysis.get("results", [])
                            if d.get("available", False)
                        ]
                    ),
                },
            )

        except Exception as e:
            return TaskResult(success=False, error=str(e))

    async def _hunt_domains(self, brand_names: List[str]) -> Dict[str, Any]:
        """Hunt for available domains across multiple TLDs"""
        tlds = [".com", ".io", ".ai", ".co", ".app", ".dev", ".tech"]
        results = []

        for brand in brand_names:
            for tld in tlds:
                domain = f"{brand.lower().replace(' ', '')}{tld}"
                availability = await self._check_domain_availability(domain)

                results.append(
                    {
                        "domain": domain,
                        "brand": brand,
                        "tld": tld,
                        "available": availability["available"],
                        "price": availability.get("price"),
                        "premium": availability.get("premium", False),
                    }
                )

        return {
            "results": results,
            "summary": self._generate_domain_summary(results),
            "recommendations": self._generate_domain_recommendations(results),
        }

    async def _check_domain_availability(self, domain: str) -> Dict[str, Any]:
        """Check if domain is available (implement with your preferred API)"""
        # Example implementation - replace with your domain API
        # This is a placeholder - use services like Namecheap, GoDaddy APIs
        await asyncio.sleep(0.1)  # Rate limiting

        return {"available": True, "price": 12.99, "premium": False}  # Placeholder
