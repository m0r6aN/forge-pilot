import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import * as jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { FirestoreService } from '@/lib/db/firestore'
import { mustGetEnv, getEnv } from '@/lib/config/env'

function createStripeClient() {
  return new Stripe(mustGetEnv('STRIPE_SECRET_KEY'), {
    apiVersion: '2025-12-15.clover',
  })
}

const V1_PLAN_ID = 'starter'

// Map plan IDs to Stripe price IDs
const PLAN_PRICE_MAP: Record<string, string> = {
  starter: getEnv('STRIPE_LAUNCH_BLUEPRINT_PRICE_ID', getEnv('STRIPE_STARTER_PRICE_ID')) || '',
}

export async function POST(req: NextRequest) {
  try {
    const stripe = createStripeClient()
    const jwtSecret = mustGetEnv('JWT_SECRET')

    // Get authenticated user
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    let decoded: any
    try {
      decoded = jwt.verify(token, jwtSecret)
    } catch {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const user = await FirestoreService.getUser(decoded.userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { planId } = await req.json()
    if (planId !== V1_PLAN_ID) {
      return NextResponse.json({ error: 'Only Launch Blueprint is available in v1' }, { status: 400 })
    }

    const finalPriceId = PLAN_PRICE_MAP[planId]
    if (!finalPriceId) {
      return NextResponse.json({ error: 'Launch Blueprint price is not configured' }, { status: 400 })
    }

    // Get or create Stripe customer
    let stripeCustomerId = user.stripeCustomerId
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      })
      stripeCustomerId = customer.id
      await FirestoreService.updateUser(user.id, { stripeCustomerId })
    }

    // Check for existing subscription
    const existingSubscription = await FirestoreService.getSubscription(user.id)
    
    if (existingSubscription && existingSubscription.status === 'active') {
      // Create portal session for upgrades/downgrades
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${process.env.NEXT_PUBLIC_URL}/dashboard`,
      })
      return NextResponse.json({ url: portalSession.url, isPortal: true })
    }
    
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: finalPriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?success=true&plan=${planId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/pricing?canceled=true`,
      metadata: {
        planId,
        userId: user.id,
      },
      subscription_data: {
        metadata: {
          planId,
          userId: user.id,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
