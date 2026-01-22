import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { FirestoreService } from '@/lib/db/firestore'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Plan mapping from Stripe product to our plan names
const PRODUCT_PLAN_MAP: Record<string, 'starter' | 'growth' | 'professional' | 'enterprise'> = {
  [process.env.STRIPE_STARTER_PRODUCT_ID || '']: 'starter',
  [process.env.STRIPE_GROWTH_PRODUCT_ID || '']: 'growth',
  [process.env.STRIPE_PROFESSIONAL_PRODUCT_ID || '']: 'professional',
  [process.env.STRIPE_ENTERPRISE_PRODUCT_ID || '']: 'enterprise',
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const planId = session.metadata?.planId
  
  if (!userId || !planId) {
    console.error('Missing metadata in checkout session')
    return
  }

  // Update user's plan
  await FirestoreService.updateUser(userId, {
    plan: planId as any,
  })

  // Send success notification email
  const user = await FirestoreService.getUser(userId)
  if (user) {
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
    fetch(`${baseUrl}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: user.email,
        templateId: 'subscription-confirmed',
        data: {
          name: user.name,
          plan: planId,
        }
      })
    }).catch(err => console.error('Failed to send confirmation email:', err))
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  if (!userId) {
    // Try to find user by Stripe customer ID
    const customerId = subscription.customer as string
    const snapshot = await FirestoreService.getUserByEmail('') // This won't work, need to search by stripeCustomerId
    console.error('Could not identify user for subscription update')
    return
  }

  // Get the plan from the subscription's product
  const item = subscription.items.data[0]
  const productId = item?.price?.product as string
  const plan = PRODUCT_PLAN_MAP[productId] || 'starter'

  // Get or create subscription record
  const existingSub = await FirestoreService.getSubscription(userId)
  
  const subscriptionData = {
    userId,
    plan,
    status: mapStripeStatus(subscription.status),
    stripeSubscriptionId: subscription.id,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  }

  if (existingSub) {
    await FirestoreService.updateSubscription(existingSub.id, subscriptionData)
  } else {
    await FirestoreService.createSubscription(subscriptionData)
  }

  // Update user's plan
  await FirestoreService.updateUser(userId, { plan })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  if (!userId) return

  // Downgrade user to free plan
  await FirestoreService.updateUser(userId, { plan: 'free' })

  // Update subscription record
  const existingSub = await FirestoreService.getSubscription(userId)
  if (existingSub) {
    await FirestoreService.updateSubscription(existingSub.id, {
      status: 'canceled',
    })
  }

  // Send cancellation email
  const user = await FirestoreService.getUser(userId)
  if (user) {
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
    fetch(`${baseUrl}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: user.email,
        templateId: 'subscription-canceled',
        data: {
          name: user.name,
        }
      })
    }).catch(err => console.error('Failed to send cancellation email:', err))
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  const subscriptionId = invoice.subscription as string

  if (!subscriptionId) return

  // Record the payment for usage tracking
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const userId = subscription.metadata?.userId
  
  if (userId) {
    await FirestoreService.recordUsage(userId, 'api_call', 0) // Reset period marker
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) return

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const userId = subscription.metadata?.userId
  
  if (!userId) return

  // Update subscription status
  const existingSub = await FirestoreService.getSubscription(userId)
  if (existingSub) {
    await FirestoreService.updateSubscription(existingSub.id, {
      status: 'past_due',
    })
  }

  // Send payment failed email
  const user = await FirestoreService.getUser(userId)
  if (user) {
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
    fetch(`${baseUrl}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: user.email,
        templateId: 'payment-failed',
        data: {
          name: user.name,
          updatePaymentUrl: `${baseUrl}/settings/billing`,
        }
      })
    }).catch(err => console.error('Failed to send payment failed email:', err))
  }
}

function mapStripeStatus(status: Stripe.Subscription.Status): 'active' | 'canceled' | 'past_due' | 'trialing' {
  switch (status) {
    case 'active':
      return 'active'
    case 'canceled':
    case 'unpaid':
      return 'canceled'
    case 'past_due':
    case 'incomplete':
    case 'incomplete_expired':
      return 'past_due'
    case 'trialing':
      return 'trialing'
    default:
      return 'active'
  }
}
