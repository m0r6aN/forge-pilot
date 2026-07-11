import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { consumeResumeCode } from '@/lib/launch/security'
import { signVerifiedEmailSession, VERIFIED_EMAIL_SESSION_COOKIE } from '@/lib/auth/verified-email-session'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { code?: string; returnTo?: string }
    const code = typeof body?.code === 'string' ? body.code.trim() : ''

    if (!code) {
      return NextResponse.json(
        { ok: false, code: 'invalid_code', message: 'Enter a valid code.' },
        { status: 400 }
      )
    }

    const consumed = consumeResumeCode(code)
    if (!consumed.ok) {
      return NextResponse.json(
        { ok: false, code: 'invalid_code', message: 'That code is invalid or expired.' },
        { status: 400 }
      )
    }

    const sessionToken = signVerifiedEmailSession({
      email: consumed.record.email,
      sessionId: randomUUID(),
    })

    const returnTo =
      typeof body?.returnTo === 'string' && body.returnTo.startsWith('/')
        ? body.returnTo
        : consumed.record.returnTo || '/launch'

    const response = NextResponse.json({
      ok: true,
      code: 'session_resumed',
      next: { action: 'continue', href: returnTo },
    })
    response.cookies.set(VERIFIED_EMAIL_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    })
    return response
  } catch (error) {
    console.error('Auth resume failed:', error)
    return NextResponse.json({ ok: false, code: 'server_error', message: 'Unable to resume session.' }, { status: 500 })
  }
}
