'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  DollarSign, 
  Users, 
  Zap, 
  TrendingUp,
  Activity,
  CreditCard
} from 'lucide-react'

const metrics = [
  {
    title: 'Total Revenue',
    value: '$48,290',
    change: '+12.5%',
    trend: 'up',
    icon: DollarSign,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10'
  },
  {
    title: 'Active Users',
    value: '2,847',
    change: '+8.2%',
    trend: 'up',
    icon: Users,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  {
    title: 'API Requests',
    value: '1.2M',
    change: '+23.1%',
    trend: 'up',
    icon: Zap,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10'
  },
  {
    title: 'Brands Generated',
    value: '15,482',
    change: '+18.7%',
    trend: 'up',
    icon: Activity,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10'
  },
  {
    title: 'Subscriptions',
    value: '892',
    change: '+5.4%',
    trend: 'up',
    icon: CreditCard,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10'
  },
  {
    title: 'Growth Rate',
    value: '24.8%',
    change: '+3.2%',
    trend: 'up',
    icon: TrendingUp,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10'
  }
]

export function AdminMetrics() {
  return (
    <Card className="col-span-2 bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-purple-500" />
          Platform Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.map((metric) => {
            const Icon = metric.icon
            return (
              <div
                key={metric.title}
                className="p-4 rounded-lg bg-gray-900/50 border border-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                    <Icon className={`h-4 w-4 ${metric.color}`} />
                  </div>
                  <span className="text-xs text-green-400 font-medium">
                    {metric.change}
                  </span>
                </div>
                <p className="text-2xl font-bold text-white">{metric.value}</p>
                <p className="text-sm text-gray-400">{metric.title}</p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

