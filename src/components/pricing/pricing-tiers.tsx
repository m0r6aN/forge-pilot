'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { voiceStrings } from '@/lib/ui/voiceStrings'
import { Check, Rocket } from 'lucide-react'
import { useState } from 'react'

const launchBlueprintPlan = {
  id: 'starter',
  name: 'ForgePilot Launch Blueprint',
  price: 69,
  icon: Rocket,
  description: 'One focused offer to launch a revenue-ready brand fast.',
  features: [
    'Business Idea Generator',
    'Advanced Brand Generator',
    'Evidence and verification package',
    'Stripe checkout integration',
    'Secure auth and dashboard access',
    'Federation-ready backend integration',
    'Optional simple landing output'
  ],
}

export function PricingTiers() {
  const [loading, setLoading] = useState<string | null>(null)

  const handleSubscribe = async (planId: string) => {
    setLoading(planId)
    
    try {
      const response = await fetch('/api/payments/create_checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      })

      const data = await response.json()
      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Failed to create checkout session')
      }
      window.location.href = data.url
    } catch (error) {
      console.error('Payment failed:', error)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-primary shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-sm w-fit">
            <Rocket className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">{launchBlueprintPlan.name}</CardTitle>
          <div className="text-3xl font-bold">
            ${launchBlueprintPlan.price}
            <span className="text-sm font-normal text-muted-foreground">/month</span>
          </div>
          <p className="text-muted-foreground">{launchBlueprintPlan.description}</p>
        </CardHeader>

        <CardContent className="space-y-4">
          <ul className="space-y-3">
            {launchBlueprintPlan.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>

          <Button
            className="w-full"
            onClick={() => handleSubscribe(launchBlueprintPlan.id)}
            disabled={loading === launchBlueprintPlan.id}
          >
            {loading === launchBlueprintPlan.id ? voiceStrings.pricing.checkoutInitAction : 'Start Launch Blueprint'}
          </Button>
          <p className="text-xs text-center text-muted-foreground">Stripe payments only for v1.</p>
        </CardContent>
      </Card>
    </div>
  )
}
