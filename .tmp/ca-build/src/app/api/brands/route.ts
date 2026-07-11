import { NextRequest, NextResponse } from 'next/server'
import { FirestoreService } from '@/lib/db/firestore'
import { generateAdvancedBrand } from '@/lib/ai/advanced-brand-generator'
import { verifyJWT } from '@/lib/auth/jwt'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const payload = await verifyJWT(token)
    const userId = payload.userId
    
    const body = await request.json()
    const { businessDescription, industry, targetAudience, style } = body
    
    // Create brand record in database
    const brand = await FirestoreService.createBrand({
      userId,
      brandName: '', // Will be updated after generation
      tagline: '',
      colorPalette: [],
      brandVoice: '',
      typography: '',
      status: 'generating',
      businessDescription,
      industry,
      targetAudience,
    })
    
    // Track generation
    const generation = await FirestoreService.trackGeneration({
      userId,
      brandId: brand.id,
      type: 'brand',
      prompt: `Business: ${businessDescription}, Industry: ${industry}, Target: ${targetAudience}`,
      status: 'pending',
    })
    
    // Generate brand identity
    const result = await generateAdvancedBrand({
      businessDescription,
      industry,
      targetAudience,
      style,
    })
    
    // Update brand with generated data
    await FirestoreService.updateBrand(brand.id, {
      brandName: result.brandIdentity.brandName || '',
      tagline: result.brandIdentity.tagline || '',
      colorPalette: result.brandIdentity.colorPalette || [],
      brandVoice: result.brandIdentity.brandVoice || '',
      typography: result.brandIdentity.typography || '',
      status: 'completed',
    })
    
    // Complete generation tracking
    await FirestoreService.completeGeneration(generation.id, result)
    
    return NextResponse.json({
      brandId: brand.id,
      ...result,
    })
    
  } catch (error) {
    console.error('Brand generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate brand' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const payload = await verifyJWT(token)
    const userId = payload.userId
    
    // Get user's brands
    const brands = await FirestoreService.getUserBrands(userId)
    
    return NextResponse.json({ brands })
    
  } catch (error) {
    console.error('Get brands error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch brands' },
      { status: 500 }
    )
  }
}