'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, Play, Pause, Settings, Plus } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  status: 'active' | 'paused' | 'completed'
  budget: number
  spent: number
  impressions: number
  clicks: number
  conversions: number
  startDate: string
  endDate: string
}

export function MarketingCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/dashboard/campaigns')
      const data = await response.json()
      setCampaigns(data.campaigns || [])
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleCampaign = async (campaignId: string, action: 'pause' | 'resume') => {
    try {
      await fetch(`/api/dashboard/campaigns/${campaignId}/${action}`, { method: 'POST' })
      fetchCampaigns()
    } catch (error) {
      console.error('Failed to toggle campaign:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Marketing Campaigns
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Campaign
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No campaigns yet</p>
            <Button>Create Your First Campaign</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map(campaign => (
              <div key={campaign.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium">{campaign.name}</h3>
                    <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                      {campaign.status}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => toggleCampaign(campaign.id, campaign.status === 'active' ? 'pause' : 'resume')}
                    >
                      {campaign.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="outline">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                  <div>
                    <p className="text-muted-foreground">Impressions</p>
                    <p className="font-medium">{campaign.impressions.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Clicks</p>
                    <p className="font-medium">{campaign.clicks.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Conversions</p>
                    <p className="font-medium">{campaign.conversions}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Budget Progress</span>
                    <span>${campaign.spent} / ${campaign.budget}</span>
                  </div>
                  <Progress value={(campaign.spent / campaign.budget) * 100} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}