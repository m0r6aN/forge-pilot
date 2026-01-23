'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  MoreVertical,
  Mail,
  Shield,
  Crown
} from 'lucide-react'

const users = [
  {
    id: '1',
    name: 'Sarah Chen',
    email: 'sarah@example.com',
    plan: 'Enterprise',
    status: 'active',
    brandsCreated: 47,
    joinedAt: '2024-01-15'
  },
  {
    id: '2',
    name: 'Marcus Rodriguez',
    email: 'marcus@example.com',
    plan: 'Professional',
    status: 'active',
    brandsCreated: 23,
    joinedAt: '2024-02-20'
  },
  {
    id: '3',
    name: 'Emily Watson',
    email: 'emily@example.com',
    plan: 'Starter',
    status: 'trial',
    brandsCreated: 5,
    joinedAt: '2024-03-10'
  },
  {
    id: '4',
    name: 'David Kim',
    email: 'david@example.com',
    plan: 'Professional',
    status: 'active',
    brandsCreated: 31,
    joinedAt: '2024-01-28'
  }
]

const planColors: Record<string, string> = {
  'Enterprise': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Professional': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Starter': 'bg-gray-500/20 text-gray-400 border-gray-500/30'
}

const statusColors: Record<string, string> = {
  'active': 'bg-green-500/20 text-green-400',
  'trial': 'bg-yellow-500/20 text-yellow-400',
  'inactive': 'bg-red-500/20 text-red-400'
}

export function UserManagement() {
  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500" />
          Recent Users
        </CardTitle>
        <Button variant="outline" size="sm" className="border-gray-600 text-gray-300">
          View All
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-medium">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="font-medium text-white">{user.name}</p>
                  <p className="text-sm text-gray-400 flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {user.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={planColors[user.plan]}>
                  {user.plan === 'Enterprise' && <Crown className="h-3 w-3 mr-1" />}
                  {user.plan}
                </Badge>
                <Badge className={statusColors[user.status]}>
                  {user.status}
                </Badge>
                <Button variant="ghost" size="icon" className="text-gray-400">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

