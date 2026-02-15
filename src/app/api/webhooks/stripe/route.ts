import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { FirestoreService } from '@/lib/db/firestore'
import { getEnv, mustGetEnv } from '@/lib/config/env'
import {
  appendLedger,
  structuredInfo,
  upsertTrace,
  verifyTraceReceiptBinding,
} from '@/lib/launch/runtime-store'
import { buildBlueprintRequestedEvent } from '@/lib/launch/blueprint-events'
import { publishBlueprintRequested } from '@/lib/launch/redis-pubsub'

function createStripeClient() {
  return new Stripe(mustGetEnv('STRIPE_SECRET_KEY'), {
    apiVersion: '2025-12-15.clover',
  })
}

// Plan mapping from Stripe product to our v1 plan names
const PRODUCT_PLAN_MAP: Record<string, 'starter'> = {
  [getEnv('STRIPE_LAUNCH_BLUEPRINT_PRODUCT_ID', getEnv('STRIPE_STARTER_PRODUCT_ID')) || '']: 'starter',
}

export async function POST(req: NextRequest) {
  try {
    const stripe = createStripeClient()
    const webhookSecret = mustGetEnv('STRIPE_WEBHOOK_SECRET')
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe signature' }, { status: 400 })
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
        await handleCheckoutCompleted(session, event.id)
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
        await handleInvoicePaid(stripe, invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(stripe, invoice)
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

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, paymentEventId?: string) {
  const traceId = session.metadata?.traceId?.trim()
  const receiptRef = session.metadata?.receiptRef?.trim()
  const workflowVersion = session.metadata?.workflowVersion?.trim()

  if (traceId || receiptRef || workflowVersion) {
    if (!traceId || !receiptRef || !workflowVersion) {
      await appendLedger({
        type: 'payment.ignored',
        traceId: traceId || 'unknown',
        at: new Date().toISOString(),
        detail: 'missing required launch metadata',
        meta: { checkoutSessionId: session.id },
      })
      return
    }

    const binding = await verifyTraceReceiptBinding(traceId, receiptRef, {
      requireSuccess: true,
      rejectRevoked: true,
    })
    if (!binding.ok) {
      await appendLedger({
        type: 'payment.ignored',
        traceId,
        at: new Date().toISOString(),
        detail: binding.reason,
        meta: { checkoutSessionId: session.id },
      })
      return
    }

    const trace = binding.trace
    if (trace.status !== 'unlocked') {
      trace.status = 'unlocked'
      trace.payment.completedAt = new Date().toISOString()
      trace.payment.unlockedAt = trace.payment.completedAt
      trace.updatedAt = new Date().toISOString()
      await upsertTrace(trace)
    }

    if (trace.blueprint && trace.blueprintReceiptRef) {
      return
    }

    await appendLedger({
      type: 'payment.completed',
      traceId,
      receiptRef,
      at: new Date().toISOString(),
      meta: {
        checkoutSessionId: session.id,
        workflowVersion,
      },
    })
    structuredInfo('payment.completed', { traceId })

    const email = session.metadata?.email?.trim() || session.customer_details?.email?.trim()
    if (!email) {
      await appendLedger({
        type: 'blueprint.failed',
        traceId,
        receiptRef,
        at: new Date().toISOString(),
        detail: 'missing email for blueprint request',
        meta: { checkoutSessionId: session.id },
      })
      return
    }

    try {
      const tenantId = process.env.OMEGA_TENANT_ID || 'tenant-demo'
      const correlationId = trace.traceId
      const event = buildBlueprintRequestedEvent({
        traceId,
        tenantId,
        correlationId,
        email,
        paymentEventId: paymentEventId || session.id,
        checkoutSessionId: session.id,
        teaserReceiptRef: receiptRef,
        service: 'forgepilot-webhook',
      })

      if (trace.blueprintRequestKey === event.idempotencyKey) {
        return
      }

      trace.blueprintRequestedAt = new Date().toISOString()
      trace.blueprintRequestEventId = event.eventId
      trace.blueprintRequestKey = event.idempotencyKey
      trace.updatedAt = new Date().toISOString()
      await upsertTrace(trace)

      await publishBlueprintRequested(event)
      await appendLedger({
        type: 'blueprint.requested',
        traceId,
        receiptRef,
        at: new Date().toISOString(),
        meta: {
          checkoutSessionId: session.id,
          eventId: event.eventId,
          idempotencyKey: event.idempotencyKey,
          channel: 'omega.forgepilot.blueprint.requested.v1',
        },
      })
      structuredInfo('blueprint.requested', { traceId, eventId: event.eventId })
    } catch (error) {
      await appendLedger({
        type: 'blueprint.failed',
        traceId,
        receiptRef,
        at: new Date().toISOString(),
        detail: error instanceof Error ? error.message : 'Failed to publish blueprint request event',
        meta: { checkoutSessionId: session.id },
      })
      structuredInfo('blueprint.request.publish_failed', {
        traceId,
        error: error instanceof Error ? error.message : 'unknown',
      })
    }
    return
  }

  const userId = session.metadata?.userId
  const planId = session.metadata?.planId

  if (!userId || !planId) {
    console.error('Missing metadata in checkout session')
    return
  }

  await FirestoreService.updateUser(userId, {
    plan: planId as any,
  })

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
    currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
    currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
    cancelAtPeriodEnd: (subscription as any).cancel_at_period_end || false,
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

async function handleInvoicePaid(stripe: Stripe, invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice)

  if (!subscriptionId) return

  // Record the payment for usage tracking
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const userId = subscription.metadata?.userId
  
  if (userId) {
    await FirestoreService.recordUsage(userId, 'api_call', 0) // Reset period marker
  }
}

async function handlePaymentFailed(stripe: Stripe, invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice)
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

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const sub = (
    invoice as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null
    }
  ).subscription

  if (!sub) {
    return null
  }

  if (typeof sub === 'string') {
    return sub
  }

  return sub.id ?? null
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
