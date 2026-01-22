'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Zap, Crown, Rocket, Wallet } from 'lucide-react'

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    priceId: 'price_starter_monthly',
    icon: Zap,
    description: 'Perfect for new entrepreneurs',
    features: [
      '3 Brand Identities',
      'Basic Logo Generation',
      'Color Palette & Typography',
      'Email Support',
      'Standard Templates'
    ],
    popular: false
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 149,
    priceId: 'price_growth_monthly',
    icon: Crown,
    description: 'For scaling businesses',
    features: [
      'Unlimited Brand Identities',
      'Advanced Logo Generation',
      'Complete Brand Guidelines',
      '🎨 3D Logo Rendering ($15-75 each)',
      '🎬 3D Splash Screens ($45-225 each)',
      '🌐 Site Hosting ($25/month per site)',
      'Marketing Campaign Tools',
      'Priority Support',
      'Custom Templates',
      'Analytics Dashboard'
    ],
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 399,
    priceId: 'price_enterprise_monthly',
    icon: Rocket,
    description: 'For established companies',
    features: [
      'Everything in Growth',
      '🎯 Unlimited 3D Renders (included)',
      '🏢 Unlimited Site Hosting (included)',
      '🎨 Custom 3D Animations',
      '⚡ Priority Rendering Queue',
      'White-label Solutions',
      'API Access',
      'Custom Integrations',
      'Dedicated Account Manager',
      'Advanced Analytics',
      'Team Collaboration'
    ],
    popular: false
  }
]

export function PricingTiers() {
  const [loading, setLoading] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'crypto'>('stripe')

  const handleSubscribe = async (planId: string, priceId: string) => {
    setLoading(planId)
    
    try {
      if (paymentMethod === 'stripe') {
        const response = await fetch('/api/payments/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceId, planId })
        })
        
        const { url } = await response.json()
        window.location.href = url
      } else {
        // Web3 payment flow
        const response = await fetch('/api/payments/crypto-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId, amount: plans.find(p => p.id === planId)?.price })
        })
        
        const { paymentAddress, amount } = await response.json()
        // Trigger Web3 wallet connection and payment
        await handleCryptoPayment(paymentAddress, amount)
      }
    } catch (error) {
      console.error('Payment failed:', error)
    } finally {
      setLoading(null)
    }
  }

  const handleCryptoPayment = async (address: string, amount: number) => {
    // Web3 payment logic - you'll need to implement wallet connection
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        // Request account access
        await (window as any).ethereum.request({ method: 'eth_requestAccounts' })
        
        // Send transaction
        const transactionParameters = {
          to: address,
          value: (amount * 0.001).toString(16), // Convert USD to ETH (rough conversion)
          gas: '21000',
        }
        
        const txHash = await (window as any).ethereum.request({
          method: 'eth_sendTransaction',
          params: [transactionParameters],
        })
        
        // Verify payment on backend
        await fetch('/api/payments/verify-crypto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ txHash, planId: loading })
        })
        
        alert('Payment successful!')
      } catch (error) {
        console.error('Crypto payment failed:', error)
      }
    } else {
      alert('Please install MetaMask to pay with crypto')
    }
  }

  return (
    <div className="space-y-8">
      {/* Payment Method Toggle */}
      <div className="flex justify-center">
        <div className="flex bg-muted rounded-lg p-1">
          <Button
            variant={paymentMethod === 'stripe' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPaymentMethod('stripe')}
          >
            Credit Card
          </Button>
          <Button
            variant={paymentMethod === 'crypto' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPaymentMethod('crypto')}
          >
            <Wallet className="h-4 w-4 mr-1" />
            Crypto
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => {
          const Icon = plan.icon
          return (
            <Card key={plan.id} className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''}`}>
              {plan.popular && (
                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="text-3xl font-bold">
                  ${plan.price}
                  <span className="text-sm font-normal text-muted-foreground">/month</span>
                </div>
                <p className="text-muted-foreground">{plan.description}</p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className="w-full" 
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => handleSubscribe(plan.id, plan.priceId)}
                  disabled={loading === plan.id}
                >
                  {loading === plan.id ? 'Processing...' : `Get ${plan.name}`}
                </Button>
                
                {paymentMethod === 'crypto' && (
                  <p className="text-xs text-center text-muted-foreground">
                    Pay with ETH, USDC, or other supported tokens
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// Add 3D rendering pricing component
export function PremiumFeaturePricing() {
  return (
    <div className="mt-16 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-8">
      <h3 className="text-2xl font-bold text-center mb-8">🎨 Premium 3D Features</h3>
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="text-center">
            <div className="text-4xl mb-2">🎯</div>
            <h4 className="font-semibold mb-2">3D Logo Rendering</h4>
            <div className="text-2xl font-bold text-purple-600 mb-2">$15-75</div>
            <p className="text-sm text-gray-600 mb-4">Per render</p>
            <ul className="text-sm space-y-1">
              <li>• Multiple angles & formats</li>
              <li>• GLB, USDZ, OBJ exports</li>
              <li>• Studio lighting</li>
              <li>• Material customization</li>
            </ul>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="text-center">
            <div className="text-4xl mb-2">🎬</div>
            <h4 className="font-semibold mb-2">3D Splash Screens</h4>
            <div className="text-2xl font-bold text-purple-600 mb-2">$45-225</div>
            <p className="text-sm text-gray-600 mb-4">Per animation</p>
            <ul className="text-sm space-y-1">
              <li>• Smooth logo animations</li>
              <li>• Multiple durations</li>
              <li>• MP4 & GIF exports</li>
              <li>• Custom transitions</li>
            </ul>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="text-center">
            <div className="text-4xl mb-2">🌐</div>
            <h4 className="font-semibold mb-2">Site Hosting</h4>
            <div className="text-2xl font-bold text-purple-600 mb-2">$25</div>
            <p className="text-sm text-gray-600 mb-4">Per site/month</p>
            <ul className="text-sm space-y-1">
              <li>• Custom domain support</li>
              <li>• SSL certificates</li>
              <li>• Global CDN</li>
              <li>• Analytics included</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="text-center mt-6">
        <p className="text-sm text-gray-600">
          💎 <strong>Enterprise plan includes unlimited 3D renders and site hosting!</strong>
        </p>
      </div>
    </div>
  )
}

