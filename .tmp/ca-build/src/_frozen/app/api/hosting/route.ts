import { NextRequest, NextResponse } from 'next/server'
import { SiteBuilder } from '@/lib/hosting/site-builder'
import { FirestoreService } from '@/lib/db/firestore'
import { verifyJWT } from '@/lib/auth/jwt'
import { checkUserPlan } from '@/lib/auth/subscription'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const payload = await verifyJWT(token)
    const userId = payload.userId
    
    // Check user plan - site hosting requires Growth plan or higher
    const userPlan = await checkUserPlan(userId)
    if (!['growth', 'enterprise'].includes(userPlan)) {
      return NextResponse.json({ 
        error: 'Site hosting requires Growth plan or higher',
        upgradeUrl: '/pricing?feature=site-hosting'
      }, { status: 403 })
    }
    
    const body = await request.json()
    const { brandId, config } = body
    
    // Validate brand ownership
    const brand = await FirestoreService.getBrand(brandId)
    if (!brand || brand.userId !== userId) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }
    
    // Create and deploy site
    const siteBuilder = new SiteBuilder()
    const site = await siteBuilder.createSite(userId, brandId, config)
    
    // Record usage
    await FirestoreService.recordUsage(userId, 'site-hosting', 25) // $25/month per site
    
    return NextResponse.json({
      success: true,
      site,
      message: 'Site deployed successfully!'
    })
    
  } catch (error) {
    console.error('Site creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create site' },
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
    
    // Get user's hosted sites
    const sites = await FirestoreService.getUserSites(userId)
    
    return NextResponse.json({ sites })
    
  } catch (error) {
    console.error('Get sites error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sites' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const payload = await verifyJWT(token)
    const userId = payload.userId
    
    const body = await request.json()
    const { siteId, updates } = body
    
    // Validate site ownership
    const site = await FirestoreService.getSite(siteId)
    if (!site || site.userId !== userId) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }
    
    // Update site
    const siteBuilder = new SiteBuilder()
    await siteBuilder.updateSite(siteId, updates)
    
    return NextResponse.json({
      success: true,
      message: 'Site updated successfully!'
    })
    
  } catch (error) {
    console.error('Site update error:', error)
    return NextResponse.json(
      { error: 'Failed to update site' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const payload = await verifyJWT(token)
    const userId = payload.userId
    
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')
    
    if (!siteId) {
      return NextResponse.json({ error: 'Site ID required' }, { status: 400 })
    }
    
    // Validate site ownership
    const site = await FirestoreService.getSite(siteId)
    if (!site || site.userId !== userId) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }
    
    // Delete site
    const siteBuilder = new SiteBuilder()
    await siteBuilder.deleteSite(siteId)
    
    return NextResponse.json({
      success: true,
      message: 'Site deleted successfully!'
    })
    
  } catch (error) {
    console.error('Site deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete site' },
      { status: 500 }
    )
  }
}