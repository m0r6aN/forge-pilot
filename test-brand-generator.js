// Quick test script to run our brand generator
import { generateAdvancedBrand } from './src/lib/ai/advanced-brand-generator.js'

const testOurOwnBrand = async () => {
  const request = {
    businessDescription: "Complete AI business operating system - generates brands, websites, marketing, manages infrastructure",
    industry: "enterprise-saas", 
    targetAudience: "entrepreneurs, agencies, enterprises",
    style: "enterprise-premium"
  }
  
  const results = await generateAdvancedBrand(request)
  console.log('🔥 OUR AI SUGGESTS:', results)
}

testOurOwnBrand()

