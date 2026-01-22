// Super simple test without imports
const { OpenAI } = require('openai')

const openai = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_KEY,
  baseURL: process.env.AZURE_OPENAI_ENDPOINT,
})

const testBrand = async () => {
  const prompt = `Create brand identity for:
Business: Complete AI business operating system - generates brands, websites, marketing, manages infrastructure
Industry: enterprise-saas
Target: entrepreneurs, agencies, enterprises
Style: enterprise-premium

Return JSON with brandName, tagline, colorPalette, brandVoice`

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
  })

  console.log('🔥 OUR AI SUGGESTS:', response.choices[0].message.content)
}

testBrand()