import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    // Mock campaign data - replace with database queries
    const mockCampaigns = [
      {
        id: '1',
        name: 'Brand Awareness Campaign',
        status: 'active',
        budget: 1000,
        spent: 650,
        impressions: 45000,
        clicks: 1200,
        conversions: 45,
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      }
    ]

    return NextResponse.json({ campaigns: mockCampaigns })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }
}