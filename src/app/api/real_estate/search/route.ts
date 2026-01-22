import { NextRequest, NextResponse } from 'next/server'
import { PropertySearchService } from '@/lib/real-estate/property-search'
import { verifyJWT } from '@/lib/auth/jwt'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const payload = await verifyJWT(token)
    const userId = payload.userId
    
    const body = await request.json()
    const { searchCriteria } = body
    
    const propertyService = new PropertySearchService()
    const properties = await propertyService.searchProperties(searchCriteria)
    
    // Record search for analytics
    await FirestoreService.recordActivity(userId, 'property-search', searchCriteria)
    
    return NextResponse.json({
      success: true,
      properties,
      totalFound: properties.length,
      searchId: `search_${Date.now()}`
    })
    
  } catch (error) {
    console.error('Property search error:', error)
    return NextResponse.json({ error: 'Failed to search properties' }, { status: 500 })
  }
}