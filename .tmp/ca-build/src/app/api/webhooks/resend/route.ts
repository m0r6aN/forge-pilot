import { NextRequest, NextResponse } from 'next/server'
import * as crypto from 'crypto'
import { db, collections } from '@/lib/db/firestore'

const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET

interface ResendWebhookPayload {
  type: 'email.sent' | 'email.delivered' | 'email.opened' | 'email.clicked' | 'email.bounced' | 'email.complained'
  created_at: string
  data: {
    email_id: string
    from: string
    to: string[]
    subject: string
    created_at: string
    [key: string]: any
  }
}

// Verify webhook signature
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('resend-signature')

    // Verify signature if secret is configured
    if (RESEND_WEBHOOK_SECRET && signature) {
      if (!verifySignature(body, signature, RESEND_WEBHOOK_SECRET)) {
        console.error('Invalid Resend webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const payload: ResendWebhookPayload = JSON.parse(body)

    // Log the event
    console.log(`Resend webhook: ${payload.type}`, payload.data.email_id)

    // Store email event in database for tracking
    await db.instance.collection('email_events').add({
      emailId: payload.data.email_id,
      type: payload.type,
      from: payload.data.from,
      to: payload.data.to,
      subject: payload.data.subject,
      eventData: payload.data,
      createdAt: new Date(payload.created_at),
      recordedAt: new Date(),
    })

    // Handle specific events
    switch (payload.type) {
      case 'email.bounced':
        // Handle bounced emails - could mark user email as invalid
        console.warn(`Email bounced: ${payload.data.to.join(', ')}`)
        // TODO: Update user record to mark email as bounced
        break

      case 'email.complained':
        // Handle spam complaints - important for compliance
        console.warn(`Spam complaint: ${payload.data.to.join(', ')}`)
        // TODO: Unsubscribe user from marketing emails
        break

      case 'email.delivered':
        // Track successful deliveries for analytics
        break

      case 'email.opened':
        // Track opens for analytics
        break

      case 'email.clicked':
        // Track clicks for analytics
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Resend webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
