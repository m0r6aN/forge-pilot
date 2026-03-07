import { NextRequest, NextResponse } from 'next/server'
import * as jwt from 'jsonwebtoken'
import { isValidSessionId } from '@/lib/launch/types'
import { mustGetEnv } from '@/lib/config/env'
import { sendEmail } from '@/lib/email/email-service'
import { checkRateLimit, getIdempotentResponse, setIdempotentResponse } from '@/lib/launch/security'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  try {
    const { email, sessionId } = (await req.json()) as { email?: string; sessionId?: string }
    const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown')
      .split(',')[0]
      .trim()
    const idempotencyKey = req.headers.get('idempotency-key')?.trim()

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

    if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    if (!sessionId || !isValidSessionId(sessionId)) {
      return NextResponse.json({ error: 'Valid sessionId is required' }, { status: 400 })
    }

    if (idempotencyKey) {
      const cached = getIdempotentResponse(`launch-unlock:${idempotencyKey}`)
      if (cached) {
        return NextResponse.json(cached)
      }
    }

    const rateResult = checkRateLimit(`launch-unlock:${ip}:${normalizedEmail}`, 5, 15 * 60 * 1000)
    if (!rateResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too many unlock link requests. Please wait before retrying.',
          retryAfterMs: Math.max(0, rateResult.resetAt - Date.now()),
        },
        { status: 429 }
      )
    }

    const jwtSecret = mustGetEnv('JWT_SECRET')
    const baseUrl = mustGetEnv('NEXT_PUBLIC_URL')
    const tokenId = crypto.randomUUID()

    const token = jwt.sign(
      {
        type: 'launch_unlock_email',
        email: normalizedEmail,
        sessionId,
        tokenId,
      },
      jwtSecret,
      { expiresIn: '20m' }
    )

    const verificationUrl = `${baseUrl}/api/launch/unlock/verify?token=${encodeURIComponent(token)}`

    const sendResult = await sendEmail({
      to: normalizedEmail,
      templateId: 'launch-blueprint-unlock',
      data: { verificationUrl },
    })

    if (!sendResult.success) {
      return NextResponse.json({ error: sendResult.error || 'Failed to send email link' }, { status: 500 })
    }

    const responsePayload = { success: true }
    if (idempotencyKey) {
      setIdempotentResponse(`launch-unlock:${idempotencyKey}`, responsePayload, 20 * 60 * 1000)
    }

    return NextResponse.json(responsePayload)
  } catch (error) {
    console.error('Launch unlock email request failed:', error)
    return NextResponse.json({ error: 'Failed to send verification link' }, { status: 500 })
  }
}
