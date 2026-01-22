'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, Edit, Share, Palette, FileText } from 'lucide-react'
import Image from 'next/image'

interface BrandAsset {
  id: string
  name: string
  type: 'logo' | 'color-palette' | 'typography' | 'brand-guide'
  url?: string
  data?: any
  createdAt: string
}

export function BrandAssets() {
  const [assets, setAssets] = useState<BrandAsset[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBrandAssets()
  }, [])

  const fetchBrandAssets = async () => {
    try {
      const response = await fetch('/api/dashboard/assets')
      const data = await response.json()
      setAssets(data.assets || [])
    } catch (error) {
      console.error('Failed to fetch assets:', error)
    } finally {
      setLoading(false)
    }
  }

  const downloadAsset = async (assetId: string) => {
    try {
      const response = await fetch(`/api/dashboard/assets/${assetId}/download`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `brand-asset-${assetId}`
      a.click()
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Brand Assets
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No brand assets yet</p>
            <Button asChild>
              <a href="/generator">Create Your First Brand</a>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {assets.map(asset => (
              <div key={asset.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {asset.type === 'logo' && asset.url && (
                    <Image src={asset.url} alt="Logo" width={40} height={40} className="rounded" />
                  )}
                  {asset.type === 'color-palette' && (
                    <div className="flex gap-1">
                      {asset.data?.colors?.slice(0, 4).map((color: string, i: number) => (
                        <div key={i} className="w-6 h-6 rounded" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{asset.name}</p>
                    <Badge variant="secondary">{asset.type}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => downloadAsset(asset.id)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Share className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}