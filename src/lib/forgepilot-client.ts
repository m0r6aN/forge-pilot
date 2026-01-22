// BrandGenie OMEGA Integration Client
// Connects Next.js frontend to the OMEGA-powered BrandGenie backend

export interface BrandCampaignRequest {
  description: string;
  industry?: string;
  target_audience?: string;
  budget_range?: string;
  timeline?: string;
  special_requirements?: string[];
}

export interface BrandCampaignResponse {
  campaign_id: string;
  status: string;
  brand_strategy: {
    business_analysis: any;
    positioning_strategy: any;
    customer_personas: any[];
    brand_narrative: any;
    recommendations: any[];
  };
  domain_options?: {
    available_domains: any[];
    recommended_primary: string;
    total_cost_estimate: string;
  };
  legal_status?: {
    trademark_status: string;
    risk_assessment: string;
    recommended_actions: string[];
  };
  market_intelligence?: {
    market_size: string;
    competition_level: string;
    success_probability: number;
  };
  visual_identity?: {
    color_palette: any;
    typography: any;
    logo_concepts: any[];
  };
  pricing_strategy?: {
    recommended_model: string;
    pricing_tiers: any[];
    revenue_projections: any;
  };
  launch_plan?: {
    launch_strategy: string;
    timeline: any;
    marketing_channels: any[];
    success_metrics: any;
  };
  execution_time: number;
  cost_estimate: number;
  next_actions: string[];
}

export class BrandGenieClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8010') {
    this.baseUrl = baseUrl;
  }

  /**
   * 🚀 Generate a complete brand campaign using OMEGA swarm
   */
  async generateBrandCampaign(request: BrandCampaignRequest): Promise<BrandCampaignResponse> {
    try {
      console.log('🧬 Activating BrandGenie swarm...');
      console.log('📋 Business description:', request.description);

      const response = await fetch(`${this.baseUrl}/campaign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`BrandGenie API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      console.log(`✅ Campaign generated in ${result.execution_time}s`);
      console.log(`💰 Cost: $${result.cost_estimate}`);
      console.log(`🎯 Campaign ID: ${result.campaign_id}`);

      return result;
    } catch (error) {
      console.error('💥 BrandGenie campaign failed:', error);
      throw error;
    }
  }

  /**
   * 🏥 Check BrandGenie service health
   */
  async checkHealth(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('💥 Health check failed:', error);
      throw error;
    }
  }

  /**
   * 🧬 Get available capabilities
   */
  async getCapabilities(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/capabilities`);
      
      if (!response.ok) {
        throw new Error(`Capabilities check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('💥 Capabilities check failed:', error);
      throw error;
    }
  }

  /**
   * 🎯 Quick brand generation for demos
   */
  async quickGenerate(businessDescription: string): Promise<BrandCampaignResponse> {
    return this.generateBrandCampaign({
      description: businessDescription,
    });
  }

  /**
   * 🚀 Advanced brand generation with full parameters
   */
  async advancedGenerate(
    businessDescription: string,
    industry: string,
    targetAudience: string,
    budgetRange?: string,
    timeline?: string
  ): Promise<BrandCampaignResponse> {
    return this.generateBrandCampaign({
      description: businessDescription,
      industry,
      target_audience: targetAudience,
      budget_range: budgetRange,
      timeline,
    });
  }
}

// Export singleton instance
export const brandGenieClient = new BrandGenieClient();

// Export for React hooks
export const useBrandGenie = () => {
  return {
    generateCampaign: brandGenieClient.generateBrandCampaign.bind(brandGenieClient),
    checkHealth: brandGenieClient.checkHealth.bind(brandGenieClient),
    getCapabilities: brandGenieClient.getCapabilities.bind(brandGenieClient),
    quickGenerate: brandGenieClient.quickGenerate.bind(brandGenieClient),
    advancedGenerate: brandGenieClient.advancedGenerate.bind(brandGenieClient),
  };
};

// Example usage in React components:
/*
import { useBrandGenie } from '@/lib/brandgenie-client';

export default function BrandGenerator() {
  const { generateCampaign } = useBrandGenie();
  
  const handleGenerate = async () => {
    try {
      const campaign = await generateCampaign({
        description: "AI-powered fitness app that analyzes workout form in real-time",
        industry: "fitness_technology",
        target_audience: "fitness enthusiasts and personal trainers"
      });
      
      console.log('🎉 Brand campaign generated:', campaign);
      
      // Use the results to update your UI
      setBrandStrategy(campaign.brand_strategy);
      setDomainOptions(campaign.domain_options);
      setVisualIdentity(campaign.visual_identity);
      
    } catch (error) {
      console.error('💥 Campaign generation failed:', error);
    }
  };

  return (
    <button onClick={handleGenerate}>
      🧬 Generate Brand Campaign
    </button>
  );
}
*/
