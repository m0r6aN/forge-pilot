import { NextRequest, NextResponse } from 'next/server'
import { Renderer3D } from '@/lib/ai/3d-renderer'
import { FirestoreService } from '@/lib/db/firestore'
import { verifyJWT } from '@/lib/auth/jwt'
import { checkUserPlan } from '@/lib/auth/subscription'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const payload = await verifyJWT(token)
    const userId = payload.userId
    
    // Check user plan - 3D rendering requires Growth plan or higher
    const userPlan = await checkUserPlan(userId)
    if (!['growth', 'enterprise'].includes(userPlan)) {
      return NextResponse.json({ 
        error: 'Premium feature requires Growth plan or higher',
        upgradeUrl: '/pricing?feature=3d-rendering'
      }, { status: 403 })
    }
    
    const body = await request.json()
    const { brandId, type, options } = body
    
    // Get brand data
    const brand = await FirestoreService.getBrand(brandId)
    if (!brand || brand.userId !== userId) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }
    
    // Track 3D generation
    const generation = await FirestoreService.trackGeneration({
      userId,
      brandId,
      type: '3d-render',
      prompt: `3D ${type} for ${brand.brandName}`,
      status: 'pending',
    })
    
    // Generate 3D render
    const renderer = new Renderer3D()
    let result
    
    switch (type) {
      case '3d-logo':
        result = await renderer.generate3DLogo(brand, options)
        break
      case '3d-icon':
        result = await renderer.generate3DIcon(brand, options.iconType, options)
        break
      case 'splash-screen':
        result = await renderer.generateSplashScreen(brand, options)
        break
      default:
        throw new Error(`Unsupported 3D render type: ${type}`)
    }
    
    // Save 3D render to database
    await FirestoreService.save3DRender({
      userId,
      brandId,
      generationId: generation.id,
      type,
      result,
      cost: result.metadata.cost,
    })
    
    // Complete generation tracking
    await FirestoreService.completeGeneration(generation.id, result)
    
    // Charge user for premium feature
    await FirestoreService.recordUsage(userId, '3d-render', result.metadata.cost)
    
    return NextResponse.json({
      success: true,
      render: result,
      cost: result.metadata.cost,
      generationId: generation.id
    })
    
  } catch (error) {
    console.error('3D rendering error:', error)
    return NextResponse.json(
      { error: 'Failed to generate 3D render' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const payload = await verifyJWT(token)
    const userId = payload.userId
    
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    
    // Get user's 3D renders
    const renders = await FirestoreService.get3DRenders(userId, brandId)
    
    return NextResponse.json({ renders })
    
  } catch (error) {
    console.error('Get 3D renders error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch 3D renders' },
      { status: 500 }
    )
  }
}