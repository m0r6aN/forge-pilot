import { OpenAI } from 'openai'
import { BrandIdentity, GenerationRequest } from '@/lib/types/brand'

const openai = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_KEY,
  baseURL: process.env.AZURE_OPENAI_ENDPOINT,
})

export async function generateBrandIdentity(request: GenerationRequest): Promise<Partial<BrandIdentity>> {
  const prompt = `Generate a complete brand identity for:
Business: ${request.businessDescription}
Industry: ${request.industry}
Target Audience: ${request.targetAudience}

Return JSON with: brandName, tagline, colorPalette (hex codes), brandVoice, typography suggestions`

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
  })

  return JSON.parse(response.choices[0].message.content || '{}')
}

export async function generateLogo(brandName: string, style: string): Promise<string> {
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: `Professional logo for "${brandName}", ${style} style, clean, scalable, business appropriate`,
    size: '1024x1024',
    quality: 'hd',
  })

  return response.data?.[0]?.url || ''
}
