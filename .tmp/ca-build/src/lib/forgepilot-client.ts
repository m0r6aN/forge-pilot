// ForgePilot OMEGA Integration Client
// Connects Next.js frontend to the OMEGA-powered ForgePilot backend

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

export class ForgePilotClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8010') {
    this.baseUrl = baseUrl;
  }

  /**
   * 🚀 Generate a complete brand campaign using OMEGA swarm
   */
  async generateBrandCampaign(request: BrandCampaignRequest): Promise<BrandCampaignResponse> {
    try {
      console.log('🧬 Activating ForgePilot swarm...');
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
        throw new Error(`ForgePilot API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      console.log(`✅ Campaign generated in ${result.execution_time}s`);
      console.log(`💰 Cost: $${result.cost_estimate}`);
      console.log(`🎯 Campaign ID: ${result.campaign_id}`);

      return result;
    } catch (error) {
      console.error('💥 ForgePilot campaign failed:', error);
      throw error;
    }
  }

  /**
   * 🏥 Check ForgePilot service health
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

  /**
   * 🔍 Fetch a verified evidence pack by hash
   */
  async getEvidencePack(packHash: string): Promise<any> {
    try {
      console.log(`🔍 Retrieving evidence pack: ${packHash}`);
      
      const response = await fetch(`${this.baseUrl}/evidence/${packHash}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Evidence pack not found: ${packHash}`);
        }
        const errorText = await response.text();
        throw new Error(`ForgePilot API error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('💥 Evidence retrieval failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const forgePilotClient = new ForgePilotClient();

// Export for React hooks
export const useForgePilot = () => {
  return {
    generateCampaign: forgePilotClient.generateBrandCampaign.bind(forgePilotClient),
    checkHealth: forgePilotClient.checkHealth.bind(forgePilotClient),
    getCapabilities: forgePilotClient.getCapabilities.bind(forgePilotClient),
    quickGenerate: forgePilotClient.quickGenerate.bind(forgePilotClient),
    advancedGenerate: forgePilotClient.advancedGenerate.bind(forgePilotClient),
    getEvidencePack: forgePilotClient.getEvidencePack.bind(forgePilotClient),
  };
};

// Example usage in React components:
/*
import { useForgePilot } from '@/lib/forgepilot-client';

export default function BrandGenerator() {
  const { generateCampaign } = useForgePilot();
  
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
