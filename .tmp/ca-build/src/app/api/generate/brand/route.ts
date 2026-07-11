import { NextRequest, NextResponse } from 'next/server'
import { generateBrandIdentity } from '@/lib/ai/brand-generator'

export async function POST(req: NextRequest) {
  try {
    const { businessDescription, industry, targetAudience } = await req.json()
    
    if (!businessDescription || !industry || !targetAudience) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const brandIdentity = await generateBrandIdentity({
      businessDescription,
      industry,
      targetAudience
    })
    
    return NextResponse.json(brandIdentity)
  } catch (error) {
    console.error('Brand generation error:', error)
    return NextResponse.json({ 
      error: 'Generation failed. Please try again.' 
    }, { status: 500 })
  }
}

