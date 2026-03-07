import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { consumeMagicLinkToken, issueResumeCode } from '@/lib/launch/security'
import { signVerifiedEmailSession, VERIFIED_EMAIL_SESSION_COOKIE } from '@/lib/auth/verified-email-session'
import { structuredInfo } from '@/lib/launch/runtime-store'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const token = searchParams.get('token') || ''
  const state = searchParams.get('state') || ''
  const returnTo = searchParams.get('returnTo') || '/launch'
  const redirectPath = returnTo.startsWith('/') ? returnTo : '/launch'

  if (!token || !state) {
    structuredInfo('auth.verify.fail', { reason: 'missing_token_or_state' })
    return NextResponse.redirect(new URL(`/continue?status=invalid&returnTo=${encodeURIComponent(redirectPath)}`, origin))
  }

  const consumed = consumeMagicLinkToken({ token, state })
  if (!consumed.ok) {
    structuredInfo('auth.verify.fail', { reason: consumed.reason })
    return NextResponse.redirect(new URL(`/continue?status=invalid&returnTo=${encodeURIComponent(redirectPath)}`, origin))
  }

  const sessionId = randomUUID()
  const sessionToken = signVerifiedEmailSession({
    email: consumed.record.email,
    sessionId,
  })

  const resumeCode = issueResumeCode({
    email: consumed.record.email,
    returnTo: redirectPath,
    ttlMs: 10 * 60 * 1000,
  })
  const redirectUrl = new URL('/continue', origin)
  redirectUrl.searchParams.set('verified', '1')
  redirectUrl.searchParams.set('returnTo', redirectPath)
  redirectUrl.searchParams.set('code', resumeCode)

  const response = NextResponse.redirect(redirectUrl)
  response.cookies.set(VERIFIED_EMAIL_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60,
  })
  structuredInfo('auth.verify.success', {
    emailHash: consumed.record.emailHash,
    sessionId,
  })

  return response
}
