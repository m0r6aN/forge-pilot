'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Users, Zap, DollarSign } from 'lucide-react'

const stats = [
  {
    title: 'Brand Assets',
    value: '12',
    change: '+2 this week',
    icon: Zap,
    color: 'text-blue-600'
  },
  {
    title: 'Active Campaigns',
    value: '3',
    change: '+1 this month',
    icon: TrendingUp,
    color: 'text-green-600'
  },
  {
    title: 'Total Impressions',
    value: '45.2K',
    change: '+12% vs last month',
    icon: Users,
    color: 'text-purple-600'
  },
  {
    title: 'Ad Spend',
    value: '$1,240',
    change: 'Within budget',
    icon: DollarSign,
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