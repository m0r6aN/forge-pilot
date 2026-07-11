export interface BrandIdentity {
  id: string
  userId: string
  businessName: string
  businessDescription: string
  industry: string
  targetAudience: string
  brandName: string
  tagline: string
  colorPalette: {
    primary: string
    secondary: string
    accent: string
    neutral: string[]
  }
  logoUrl?: string
  logoVariations?: string[]
  typography: {
    primary: string
    secondary: string
  }
  brandVoice: {
    tone: string
    personality: string[]
    messaging: string[]
  }
  createdAt: Date
  updatedAt: Date
}

export interface GenerationRequest {
  businessDescription: string
  industry: string
  targetAudience: string
  preferences?: {
    colorPreferences?: string[]
    stylePreferences?: string[]
    avoidWords?: string[]
  }
}

export type BrandStyle =
  | 'modern'
  | 'minimalist'
  | 'classic'
  | 'playful'
  | 'bold'
  | 'elegant'
  | 'tech'
  | 'organic'
