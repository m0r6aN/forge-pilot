import { OpenAI } from 'openai'
import { BrandIdentity, GenerationRequest, BrandStyle } from '@/lib/types/brand'

const openai = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_KEY,
  baseURL: process.env.AZURE_OPENAI_ENDPOINT,
})

export async function generateAdvancedBrand(request: GenerationRequest & {
  style?: BrandStyle
  iterations?: number
  previousResults?: Partial<BrandIdentity>[]
}): Promise<{
  brandIdentity: Partial<BrandIdentity>
  alternatives: Partial<BrandIdentity>[]
  reasoning: string
}> {
  const { businessDescription, industry, targetAudience, style = 'modern', iterations = 3 } = request

  // Generate multiple brand concepts
  const concepts = await Promise.all(
    Array.from({ length: iterations }, async (_, i) => {
      const prompt = `Create brand identity #${i + 1} for:
Business: ${businessDescription}
Industry: ${industry}
Target: ${targetAudience}
Style: ${style}

${request.previousResults ? `Avoid these concepts: ${JSON.stringify(request.previousResults)}` : ''}

Return JSON with:
- brandName (unique, memorable)
- tagline (compelling, under 10 words)
- colorPalette (5 hex codes with names)
- brandVoice (tone, personality traits)
- typography (primary font style, secondary suggestions)
- logoDescription (detailed visual description)
- brandPersonality (3-5 key traits)
- targetEmotions (feelings to evoke)
- competitiveDifferentiation (unique positioning)

Make each concept distinctly different in approach.`

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8 + (i * 0.1), // Increase creativity for each iteration
      })

      return JSON.parse(response.choices[0].message.content || '{}')
    })
  )

  // Generate reasoning for the primary concept
  const reasoningPrompt = `Analyze this brand concept and explain why it's effective:
${JSON.stringify(concepts[0])}

Provide strategic reasoning covering:
- Market positioning
- Target audience alignment
- Competitive advantages
- Emotional resonance
- Scalability potential`

  const reasoningResponse = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: reasoningPrompt }],
    temperature: 0.3,
  })

  return {
    brandIdentity: concepts[0],
    alternatives: concepts.slice(1),
    reasoning: reasoningResponse.choices[0].message.content || ''
  }
}

export async function generateLogoVariations(brandName: string, style: string, variations: number = 4): Promise<{
  logos: Array<{ url: string; style: string; description: string }>
}> {
  const styles = ['minimalist', 'modern', 'classic', 'playful', 'bold', 'elegant']
  
  const logoPromises = Array.from({ length: variations }, async (_, i) => {
    const logoStyle = styles[i] || style
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `Professional logo for "${brandName}", ${logoStyle} style, clean vector design, scalable, business appropriate, white background, high contrast`,
      size: '1024x1024',
      quality: 'hd',
    })

    return {
      url: response.data[0].url || '',
      style: logoStyle,
      description: `${logoStyle.charAt(0).toUpperCase() + logoStyle.slice(1)} style logo with clean, professional design`
    }
  })

  const logos = await Promise.all(logoPromises)
  
  return { logos }
}