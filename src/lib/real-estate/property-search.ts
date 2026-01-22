import { OpenAI } from 'openai'

export interface PropertySearchCriteria {
  businessType: string
  location: string
  budget: { min: number; max: number }
  spaceType: 'lease' | 'purchase' | 'both'
  squareFootage: { min: number; max: number }
  requirements: string[]
  timeline: string
}

export interface CommercialProperty {
  id: string
  address: string
  price: number
  squareFootage: number
  type: 'retail' | 'office' | 'warehouse' | 'restaurant' | 'mixed'
  amenities: string[]
  images: string[]
  floorPlan?: string
  zoning: string
  parking: number
  mlsId: string
  agentInfo: AgentInfo
}

export interface AgentInfo {
  id: string
  name: string
  company: string
  phone: string
  email: string
  rating: number
  commissionRate: number
}

export class PropertySearchService {
  private openai: OpenAI
  private mlsIntegrations: MLSIntegration[]

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.AZURE_OPENAI_KEY })
    this.mlsIntegrations = [
      new MLSIntegration('CRMLS'), // California
      new MLSIntegration('NYMLS'), // New York
      new MLSIntegration('HAR'),   // Houston
      // Add more MLS systems
    ]
  }

  async searchProperties(criteria: PropertySearchCriteria): Promise<CommercialProperty[]> {
    // Search across multiple MLS systems
    const allProperties = []
    
    for (const mls of this.mlsIntegrations) {
      const properties = await mls.searchCommercial(criteria)
      allProperties.push(...properties)
    }

    // AI-powered property matching
    const matchedProperties = await this.aiPropertyMatching(criteria, allProperties)
    
    // Add our registered agents for properties without representation
    return await this.enrichWithAgents(matchedProperties)
  }

  private async aiPropertyMatching(criteria: PropertySearchCriteria, properties: any[]): Promise<CommercialProperty[]> {
    const prompt = `
      Analyze these commercial properties for a ${criteria.businessType} business:
      
      Requirements: ${criteria.requirements.join(', ')}
      Budget: $${criteria.budget.min} - $${criteria.budget.max}
      Space: ${criteria.squareFootage.min} - ${criteria.squareFootage.max} sq ft
      
      Properties: ${JSON.stringify(properties.slice(0, 20))}
      
      Rank properties by suitability (1-10) and explain why each property would work well for this business type.
      Consider foot traffic, zoning, accessibility, and business-specific needs.
      
      Return as JSON with rankings and explanations.
    `

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    })

    const analysis = JSON.parse(response.choices[0].message.content || '{}')
    
    // Sort properties by AI ranking
    return properties
      .map(prop => ({ ...prop, aiScore: analysis.rankings[prop.id] || 0 }))
      .sort((a, b) => b.aiScore - a.aiScore)
      .slice(0, 50)
  }

  async getPropertyInsights(propertyId: string, businessType: string): Promise<any> {
    const property = await this.getPropertyDetails(propertyId)
    
    const insights = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{
        role: 'user',
        content: `Analyze this commercial property for a ${businessType}:
        
        Address: ${property.address}
        Size: ${property.squareFootage} sq ft
        Zoning: ${property.zoning}
        
        Provide insights on:
        1. Foot traffic potential
        2. Demographics of area
        3. Competition analysis
        4. Growth potential
        5. Renovation needs
        6. ROI projections
        
        Be specific and actionable.`
      }],
      temperature: 0.4,
    })

    return {
      property,
      insights: insights.choices[0].message.content,
      demographics: await this.getDemographics(property.address),
      competition: await this.getCompetitionAnalysis(property.address, businessType)
    }
  }
}