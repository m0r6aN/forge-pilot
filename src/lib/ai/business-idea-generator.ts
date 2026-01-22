import { OpenAI } from 'openai'

export interface BusinessIdeaRequest {
  interests: string[]
  skills: string[]
  budget: number
  timeCommitment: 'part-time' | 'full-time'
  riskTolerance: 'low' | 'medium' | 'high'
  location: string
  targetMarket?: string
  preferredIndustries?: string[]
}

export interface BusinessIdea {
  id: string
  name: string
  description: string
  industry: string
  targetMarket: string
  problemSolved: string
  uniqueValueProposition: string
  revenueModel: string
  startupCosts: {
    initial: number
    monthly: number
    breakdown: Array<{ item: string; cost: number; required: boolean }>
  }
  revenueProjections: {
    month1: number
    month6: number
    year1: number
    year3: number
    assumptions: string[]
  }
  marketAnalysis: {
    size: string
    growth: string
    competition: string
    barriers: string
    opportunities: string[]
  }
  executionPlan: {
    phase1: string[]
    phase2: string[]
    phase3: string[]
    timeline: string
  }
  requiredServices: Array<{
    service: string
    description: string
    cost: number
    priority: 'essential' | 'recommended' | 'optional'
    brandgenieOffering: boolean
  }>
  riskAssessment: {
    level: 'low' | 'medium' | 'high'
    factors: string[]
    mitigation: string[]
  }
  successFactors: string[]
  nextSteps: string[]
}

export class BusinessIdeaGenerator {
  private openai: OpenAI
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.AZURE_OPENAI_KEY,
      baseURL: process.env.AZURE_OPENAI_ENDPOINT,
    })
  }
  
  async generateBusinessIdeas(request: BusinessIdeaRequest): Promise<BusinessIdea[]> {
    // Step 1: Deep market research
    const marketGaps = await this.identifyMarketGaps(request)
    
    // Step 2: Generate business concepts
    const concepts = await this.generateBusinessConcepts(request, marketGaps)
    
    // Step 3: Validate and score ideas
    const validatedIdeas = await this.validateBusinessIdeas(concepts, request)
    
    // Step 4: Create detailed business plans
    const detailedPlans = await Promise.all(
      validatedIdeas.slice(0, 5).map(idea => this.createDetailedBusinessPlan(idea, request))
    )
    
    return detailedPlans
  }
  
  private async identifyMarketGaps(request: BusinessIdeaRequest): Promise<any[]> {
    const researchPrompt = `
      Conduct deep market research to identify profitable business opportunities:
      
      User Profile:
      - Interests: ${request.interests.join(', ')}
      - Skills: ${request.skills.join(', ')}
      - Budget: $${request.budget}
      - Time: ${request.timeCommitment}
      - Risk tolerance: ${request.riskTolerance}
      - Location: ${request.location}
      
      Research Focus:
      1. Emerging market trends and gaps
      2. Underserved customer segments
      3. Technology disruption opportunities
      4. Local market needs in ${request.location}
      5. Scalable business models
      6. Low-competition niches
      
      For each opportunity, provide:
      - Market size and growth potential
      - Competition analysis
      - Entry barriers
      - Revenue potential
      - Required investment
      - Success probability
      
      Return top 10 opportunities as JSON array.
    `
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: researchPrompt }],
      temperature: 0.3,
    })
    
    return JSON.parse(response.choices[0].message.content || '[]')
  }
  
  private async generateBusinessConcepts(request: BusinessIdeaRequest, marketGaps: any[]): Promise<any[]> {
    const conceptPrompt = `
      Generate innovative business concepts based on these market opportunities:
      
      Market Gaps: ${JSON.stringify(marketGaps)}
      
      User Constraints:
      - Budget: $${request.budget}
      - Skills: ${request.skills.join(', ')}
      - Time: ${request.timeCommitment}
      - Risk: ${request.riskTolerance}
      
      For each concept, create:
      - Unique business name
      - Clear value proposition
      - Target customer profile
      - Revenue model
      - Competitive advantage
      - Scalability potential
      - Implementation difficulty
      
      Focus on businesses that can be started quickly and scaled efficiently.
      Return 15 concepts as JSON array.
    `
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: conceptPrompt }],
      temperature: 0.7,
    })
    
    return JSON.parse(response.choices[0].message.content || '[]')
  }
  
  private async createDetailedBusinessPlan(concept: any, request: BusinessIdeaRequest): Promise<BusinessIdea> {
    const planPrompt = `
      Create a comprehensive business plan for: ${concept.name}
      
      Concept: ${JSON.stringify(concept)}
      User Profile: ${JSON.stringify(request)}
      
      Provide detailed analysis including:
      
      1. MARKET ANALYSIS
      - Total addressable market size
      - Target customer segments
      - Competition landscape
      - Market trends and growth
      
      2. FINANCIAL PROJECTIONS
      - Startup costs breakdown
      - Monthly operating expenses
      - Revenue projections (realistic)
      - Break-even analysis
      - 3-year financial forecast
      
      3. EXECUTION ROADMAP
      - Phase 1: MVP and validation (0-3 months)
      - Phase 2: Growth and scaling (3-12 months)
      - Phase 3: Expansion (12+ months)
      
      4. REQUIRED SERVICES
      List all services needed to execute this business:
      - Brand identity and design
      - Website and e-commerce
      - Domain registration
      - Marketing and advertising
      - Legal entity formation
      - Business registration
      - Social media management
      - Customer support systems
      - Analytics and tracking
      - Payment processing
      
      For each service, specify:
      - Why it's needed
      - Estimated cost
      - Priority level
      - Whether BrandGenie offers it
      
      5. RISK ASSESSMENT
      - Key risks and challenges
      - Mitigation strategies
      - Success probability
      
      Return as detailed JSON object.
    `
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: planPrompt }],
      temperature: 0.4,
    })
    
    const businessPlan = JSON.parse(response.choices[0].message.content || '{}')
    
    // Add BrandGenie service mappings
    const enhancedPlan = await this.mapToBrandGenieServices(businessPlan)
    
    return {
      id: `business_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...enhancedPlan
    }
  }
  
  private async mapToBrandGenieServices(businessPlan: any): Promise<any> {
    const serviceMapping = {
      'Brand identity and design': {
        service: 'AI Brand Generation',
        cost: 0, // Included in subscription
        brandgenieOffering: true,
        priority: 'essential'
      },
      'Website and e-commerce': {
        service: 'Website Builder + E-commerce',
        cost: 0, // Included in subscription
        brandgenieOffering: true,
        priority: 'essential'
      },
      'Domain registration': {
        service: 'Domain Registration',
        cost: 12.99,
        brandgenieOffering: true,
        priority: 'essential'
      },
      'Marketing and advertising': {
        service: 'AI Marketing Automation',
        cost: 0, // Included in subscription
        brandgenieOffering: true,
        priority: 'essential'
      },
      'Legal entity formation': {
        service: 'Business Entity Registration',
        cost: 299,
        brandgenieOffering: true,
        priority: 'essential'
      },
      'Social media management': {
        service: 'AI Social Media Manager',
        cost: 0, // Included in subscription
        brandgenieOffering: true,
        priority: 'recommended'
      },
      'AI avatar creation': {
        service: 'AI Avatar & Video Suite',
        cost: 197,
        brandgenieOffering: true,
        priority: 'recommended'
      },
      'Customer support systems': {
        service: 'AI Customer Support',
        cost: 0, // Included in subscription
        brandgenieOffering: true,
        priority: 'recommended'
      }
    }
    
    // Map services to our offerings
    businessPlan.requiredServices = businessPlan.requiredServices?.map((service: any) => ({
      ...service,
      ...serviceMapping[service.service] || { brandgenieOffering: false }
    }))
    
    return businessPlan
  }
  
  async generateBusinessEntityOptions(businessName: string, state: string): Promise<any> {
    const entityPrompt = `
      Recommend the best business entity type for: "${businessName}" in ${state}
      
      Analyze and recommend:
      1. LLC vs Corporation vs Partnership
      2. Tax implications
      3. Liability protection
      4. Operational complexity
      5. Cost considerations
      6. Future growth plans
      
      Provide specific recommendations with reasoning.
    `
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: entityPrompt }],
      temperature: 0.3,
    })
    
    return JSON.parse(response.choices[0].message.content || '{}')
  }
}