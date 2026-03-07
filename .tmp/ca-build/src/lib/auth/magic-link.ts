import { randomUUID } from 'crypto'
import { mustGetEnv } from '@/lib/config/env'
import { sendEmail } from '@/lib/email/email-service'
import { checkRateLimit, hashEmail, issueMagicLinkToken } from '@/lib/launch/security'
import { structuredInfo } from '@/lib/launch/runtime-store'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function startMagicLinkFlow(params: {
  email: string
  ip: string
  userAgent: string
  returnTo?: string
  context?: Record<string, unknown> | null
}) {
  const email = params.email.trim().toLowerCase()
  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false as const, status: 400, error: 'Valid email is required' }
  }

  const emailHash = hashEmail(email)
  const ipRate = checkRateLimit(`auth-start:ip:${params.ip}`, 12, 15 * 60 * 1000)
  if (!ipRate.allowed) {
    structuredInfo('auth.start', { ok: false, reason: 'rate_limited_ip', emailHash })
    return { ok: false as const, status: 429, error: 'Too many requests', retryAfterMs: Math.max(0, ipRate.resetAt - Date.now()) }
  }

  const emailRate = checkRateLimit(`auth-start:email:${emailHash}`, 5, 15 * 60 * 1000)
  if (!emailRate.allowed) {
    structuredInfo('auth.start', { ok: false, reason: 'rate_limited_email', emailHash })
    return { ok: false as const, status: 429, error: 'Too many requests', retryAfterMs: Math.max(0, emailRate.resetAt - Date.now()) }
  }

  const state = randomUUID()
  const returnTo = params.returnTo && params.returnTo.startsWith('/') ? params.returnTo : '/launch'
  const token = issueMagicLinkToken({
    email,
    returnTo,
    context: params.context || null,
    state,
    ttlMs: 15 * 60 * 1000,
    ip: params.ip,
    userAgent: params.userAgent,
  })

  const baseUrl = mustGetEnv('NEXT_PUBLIC_URL')
  const verificationUrl =
    `${baseUrl}/api/auth/verify?token=${encodeURIComponent(token)}` +
    `&state=${encodeURIComponent(state)}` +
    `&returnTo=${encodeURIComponent(returnTo)}`

  const sendResult = await sendEmail({
    to: email,
    templateId: 'magic-link-continue',
    data: { verificationUrl, expiresIn: '15 minutes' },
  })

  if (!sendResult.success) {
    structuredInfo('auth.start', { ok: false, reason: 'email_send_failed', emailHash })
    return { ok: false as const, status: 500, error: sendResult.error || 'Failed to send email link' }
  }
  structuredInfo('auth.start', { ok: true, emailHash })

  return {
    ok: true as const,
    emailHash,
    message: "If it's a valid address, you'll receive a link.",
  }
}
