'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, FileCheck2, Sparkles, Wallet } from 'lucide-react'

const stats = [
  {
    title: 'Blueprints Started',
    value: '12',
    change: '+2 this week',
    icon: Sparkles,
    color: 'text-blue-600'
  },
  {
    title: 'Brand Packages',
    value: '8',
    change: 'Ready for download',
    icon: FileCheck2,
    color: 'text-green-600'
  },
  {
    title: 'Verification Status',
    value: '100%',
    change: 'Evidence pipeline healthy',
    icon: CheckCircle2,
    color: 'text-purple-600'
  },
  {
    title: 'MRR Target',
    value: '$69',
    change: 'Per active blueprint customer',
    icon: Wallet,
    color: 'text-orange-600'
  }
]

export function DashboardStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
