const request = {
  businessDescription: "Complete AI business operating system - generates brands, websites, marketing, manages infrastructure",
  industry: "enterprise-saas", 
  targetAudience: "entrepreneurs, agencies, enterprises",
  style: "enterprise-premium"
}

// This should give us 5 badass enterprise names!
const results = await generateAdvancedBrand(request)