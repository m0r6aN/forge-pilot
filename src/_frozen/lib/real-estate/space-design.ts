export interface SpaceDesignRequest {
  propertyId?: string
  businessType: string
  dimensions?: { width: number; length: number; height: number }
  floorPlan?: string // uploaded image
  budget: number
  style: 'modern' | 'traditional' | 'industrial' | 'minimalist' | 'luxury'
  requirements: string[]
}

export interface DesignResult {
  floorPlan2D: string
  floorPlan3D: string
  renderings: string[]
  furnitureList: FurnitureItem[]
  colorPalette: string[]
  totalCost: number
  timeline: string
  contractorRecommendations: Contractor[]
}

export class SpaceDesignService {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.AZURE_OPENAI_KEY })
  }

  async designSpace(request: SpaceDesignRequest): Promise<DesignResult> {
    // Generate optimal layout for business type
    const layout = await this.generateOptimalLayout(request)
    
    // Create 2D floor plan
    const floorPlan2D = await this.generate2DFloorPlan(layout, request)
    
    // Create 3D renderings
    const renderings = await this.generate3DRenderings(layout, request)
    
    // Generate furniture and fixture recommendations
    const furnitureList = await this.generateFurnitureList(request)
    
    // Create color palette
    const colorPalette = await this.generateColorPalette(request)
    
    // Calculate costs and timeline
    const costAnalysis = await this.calculateProjectCosts(furnitureList, request)
    
    return {
      floorPlan2D,
      floorPlan3D: renderings[0],
      renderings,
      furnitureList,
      colorPalette,
      totalCost: costAnalysis.total,
      timeline: costAnalysis.timeline,
      contractorRecommendations: await this.findContractors(request)
    }
  }

  private async generateOptimalLayout(request: SpaceDesignRequest): Promise<any> {
    const prompt = `
      Design an optimal layout for a ${request.businessType} business:
      
      Space: ${request.dimensions?.width}' x ${request.dimensions?.length}' x ${request.dimensions?.height}'
      Budget: $${request.budget}
      Style: ${request.style}
      Requirements: ${request.requirements.join(', ')}
      
      Consider:
      - Customer flow and experience
      - Operational efficiency
      - ADA compliance
      - Fire safety codes
      - Industry best practices
      
      Provide detailed layout with zones, dimensions, and rationale.
    `

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
    })

    return JSON.parse(response.choices[0].message.content || '{}')
  }

  private async generate2DFloorPlan(layout: any, request: SpaceDesignRequest): Promise<string> {
    // Generate 2D floor plan using DALL-E
    const floorPlanPrompt = `
      Professional 2D architectural floor plan for ${request.businessType}:
      
      Layout: ${JSON.stringify(layout)}
      Style: Clean, professional architectural drawing
      Include: Dimensions, room labels, fixtures, furniture placement
      View: Top-down architectural plan view
      
      Black lines on white background, professional CAD style
    `

    const image = await this.openai.images.generate({
      model: "dall-e-3",
      prompt: floorPlanPrompt,
      size: "1024x1024",
      quality: "hd",
      n: 1,
    })

    return image.data[0].url || ''
  }

  private async generate3DRenderings(layout: any, request: SpaceDesignRequest): Promise<string[]> {
    const renderings = []
    
    const views = ['entrance view', 'main area view', 'customer perspective', 'overview perspective']
    
    for (const view of views) {
      const renderingPrompt = `
        Photorealistic 3D interior rendering of ${request.businessType}:
        
        Layout: ${JSON.stringify(layout)}
        View: ${view}
        Style: ${request.style}
        Lighting: Professional interior lighting
        Quality: Architectural visualization quality
        
        Include proper materials, textures, and realistic lighting
      `

      const rendering = await this.openai.images.generate({
        model: "dall-e-3",
        prompt: renderingPrompt,
        size: "1024x1024",
        quality: "hd",
        n: 1,
      })

      renderings.push(rendering.data[0].url || '')
    }

    return renderings
  }
}