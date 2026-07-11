import { NextRequest, NextResponse } from 'next/server'
import { DomainManager } from '@/lib/hosting/domain-manager'
import { verifyJWT } from '@/lib/auth/jwt'
import { checkUserPlan } from '@/lib/auth/subscription'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const query = searchParams.get('q')
    const domain = searchParams.get('domain')
    
    const domainManager = new DomainManager()
    
    switch (action) {
      case 'search':
        if (!query) {
          return NextResponse.json({ error: 'Query required' }, { status: 400 })
        }
        const searchResults = await domainManager.searchDomains(query)
        return NextResponse.json({ results: searchResults })
        
      case 'pricing':
        const pricing = await domainManager.getDomainPricing()
        return NextResponse.json({ pricing })
        
      case 'analytics':
        if (!domain) {
          return NextResponse.json({ error: 'Domain required' }, { status: 400 })
        }
        const analytics = await domainManager.getDomainAnalytics(domain)
        return NextResponse.json({ analytics })
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Domain API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const payload = await verifyJWT(token)
    const userId = payload.userId
    
    const body = await request.json()
    const { action, ...data } = body
    
    const domainManager = new DomainManager()
    
    switch (action) {
      case 'register':
        // Check user plan - domain registration requires Growth plan
        const userPlan = await checkUserPlan(userId)
        if (!['growth', 'scale', 'enterprise'].includes(userPlan)) {
          return NextResponse.json({ 
            error: 'Domain registration requires Growth plan or higher',
            upgradeUrl: '/pricing?feature=domain-registration'
          }, { status: 403 })
        }
        
        const registration = await domainManager.registerDomain({
          ...data,
          userId
        })
        
        return NextResponse.json({
          success: true,
          registration,
          message: 'Domain registered successfully!'
        })
        
      case 'park':
        const parkingUrl = await domainManager.parkDomain(data.domain, data.config)
        
        return NextResponse.json({
          success: true,
          parkingUrl,
          message: 'Domain parked successfully!'
        })
        
      case 'forward':
        await domainManager.setupDomainForwarding(
          data.domain,
          data.targetUrl,
          data.type
        )
        
        return NextResponse.json({
          success: true,
          message: 'Domain forwarding configured!'
        })
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Domain registration error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}