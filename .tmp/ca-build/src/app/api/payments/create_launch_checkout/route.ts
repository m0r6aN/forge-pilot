import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import * as jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { isValidSessionId } from '@/lib/launch/types'
import { mustGetEnv } from '@/lib/config/env'
import {
  appendLedger,
  structuredInfo,
  upsertTrace,
  verifyTraceReceiptBinding,
} from '@/lib/launch/runtime-store'

interface LaunchUnlockSessionPayload {
  type: 'launch_unlock_session'
  email: string
  sessionId: string
}

function createStripeClient() {
  return new Stripe(mustGetEnv('STRIPE_SECRET_KEY'), {
    apiVersion: '2025-12-15.clover',
  })
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, traceId, receiptRef } = (await req.json()) as {
      sessionId?: string
      traceId?: string
      receiptRef?: string
    }
    const requestIdempotencyKey = req.headers.get('idempotency-key')?.trim()

    if (!sessionId || !isValidSessionId(sessionId)) {
      return NextResponse.json({ error: 'Valid sessionId is required' }, { status: 400 })
    }

    if (!traceId || typeof traceId !== 'string') {
      await appendLedger({
        type: 'attack.rejected',
        traceId: 'unknown',
        at: new Date().toISOString(),
        detail: 'checkout missing traceId',
      })
      return NextResponse.json({ error: 'traceId is required for checkout binding' }, { status: 400 })
    }

    if (!receiptRef || typeof receiptRef !== 'string') {
      await appendLedger({
        type: 'attack.rejected',
        traceId,
        at: new Date().toISOString(),
        detail: 'checkout missing receiptRef',
      })
      return NextResponse.json({ error: 'receiptRef is required for checkout binding' }, { status: 400 })
    }

    const binding = await verifyTraceReceiptBinding(traceId, receiptRef, {
      requireSuccess: true,
      rejectRevoked: true,
    })
    if (!binding.ok) {
      await appendLedger({
        type: 'attack.rejected',
        traceId,
        receiptRef,
        at: new Date().toISOString(),
        detail: binding.reason,
      })
      return NextResponse.json({ error: binding.reason }, { status: binding.status })
    }

    const trace = binding.trace
    if (trace.status === 'unlocked' || trace.payment.completedAt) {
      return NextResponse.json({ error: 'Trace already unlocked' }, { status: 409 })
    }

    const cookieStore = await cookies()
    const unlockToken = cookieStore.get('launch-unlock-session')?.value

    if (!unlockToken) {
      return NextResponse.json({ error: 'Email verification required before checkout' }, { status: 401 })
    }

    let unlockSession: LaunchUnlockSessionPayload
    try {
      unlockSession = jwt.verify(unlockToken, mustGetEnv('JWT_SECRET')) as LaunchUnlockSessionPayload
    } catch {
      return NextResponse.json({ error: 'Verification session expired. Request a new email link.' }, { status: 401 })
    }

    if (unlockSession.type !== 'launch_unlock_session' || unlockSession.sessionId !== sessionId) {
      return NextResponse.json({ error: 'Verification session mismatch. Request a new email link.' }, { status: 401 })
    }

    const stripe = createStripeClient()
    const priceId = mustGetEnv('STRIPE_LAUNCH_BLUEPRINT_PRICE_ID')
    const appBaseUrl = mustGetEnv('NEXT_PUBLIC_URL')
    const idempotencyKey =
      requestIdempotencyKey || `launch-checkout:${unlockSession.sessionId}:${unlockSession.email.toLowerCase()}`

    const checkout = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        payment_method_types: ['card'],
        allow_promotion_codes: true,
        client_reference_id: sessionId,
        customer_email: unlockSession.email,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appBaseUrl}/launch?checkout=success`,
        cancel_url: `${appBaseUrl}/launch?checkout=canceled`,
        metadata: {
          sessionId,
          email: unlockSession.email,
          product: 'launch-blueprint',
          traceId,
          receiptRef,
          workflowVersion: trace.workflowVersion,
        },
      },
      { idempotencyKey }
    )

    trace.payment.checkoutSessionId = checkout.id
    trace.payment.checkoutCreatedAt = new Date().toISOString()
    trace.updatedAt = new Date().toISOString()
    await upsertTrace(trace)

    await appendLedger({
      type: 'payment.created',
      traceId,
      receiptRef,
      at: new Date().toISOString(),
      meta: {
        checkoutSessionId: checkout.id,
      },
    })
    structuredInfo('payment.created', { traceId })

    return NextResponse.json({ url: checkout.url })
  } catch (error) {
    console.error('Launch checkout creation failed:', error)
    return NextResponse.json({ error: 'Failed to create launch checkout session' }, { status: 500 })
  }
}
