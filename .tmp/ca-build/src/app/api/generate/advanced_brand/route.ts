import { NextRequest, NextResponse } from 'next/server'
import { generateAdvancedBrand, generateLogoVariations } from '@/lib/ai/advanced-brand-generator'

export async function POST(req: NextRequest) {
  try {
    const { businessDescription, industry, targetAudience, style, iterations, includeLogos } = await req.json()
    
    if (!businessDescription || !industry || !targetAudience) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Generate advanced brand concepts
    const brandResult = await generateAdvancedBrand({
      businessDescription,
      industry,
      targetAudience,
      style,
      iterations: iterations || 3
    })

    let logoVariations = null
    if (includeLogos && brandResult.brandIdentity.brandName) {
      logoVariations = await generateLogoVariations(
        brandResult.brandIdentity.brandName,
        style || 'modern',
        4
      )
    }

    // Send completion email
    // await fetch(`${process.env.NEXT_PUBLIC_URL}/api/email`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     email: 'user@example.com', // Get from auth context
    //     templateId: 'brandReady',
    //     templateData: {
    //       name: 'User Name',
    //       brandName: brandResult.brandIdentity.brandName,
    //       downloadUrl: `${process.env.NEXT_PUBLIC_URL}/dashboard/download/brand-package`
    //     }
    //   })
    // })
    
    return NextResponse.json({
      ...brandResult,
      logoVariations
    })
  } catch (error) {
    console.error('Advanced brand generation error:', error)
    return NextResponse.json({ 
      error: 'Generation failed. Please try again.' 
    }, { status: 500 })
  }
}