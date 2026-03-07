import { NextRequest, NextResponse } from 'next/server'
import { startMagicLinkFlow } from '@/lib/auth/magic-link'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      email?: string
      returnTo?: string
      context?: Record<string, unknown>
    }

    const email = typeof body?.email === 'string' ? body.email : ''
    const returnTo = typeof body?.returnTo === 'string' ? body.returnTo : '/launch'
    const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown')
      .split(',')[0]
      .trim()
    const userAgent = req.headers.get('user-agent') || 'unknown'

    const result = await startMagicLinkFlow({
      email,
      returnTo,
      context: body?.context || null,
      ip,
      userAgent,
    })

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: result.status === 429 ? 'rate_limited' : 'start_failed',
          message: result.error,
          retryAfterMs: 'retryAfterMs' in result ? result.retryAfterMs : undefined,
        },
        { status: result.status }
      )
    }

    return NextResponse.json({
      ok: true,
      code: 'verification_required',
      message: result.message,
      next: { action: 'check_email', href: `/continue?returnTo=${encodeURIComponent(returnTo)}` },
    })
  } catch (error) {
    console.error('Magic link start failed:', error)
    return NextResponse.json({ ok: false, code: 'server_error', message: 'Failed to start verification' }, { status: 500 })
  }
}
