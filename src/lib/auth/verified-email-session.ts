import * as jwt from 'jsonwebtoken'
import type { NextRequest } from 'next/server'
import { mustGetEnv } from '@/lib/config/env'
import { hashEmail } from '@/lib/launch/security'

export const VERIFIED_EMAIL_SESSION_COOKIE = 'forgepilot-email-session'

export interface VerifiedEmailSessionPayload {
  type: 'verified_email_session'
  email: string
  emailHash: string
  sessionId: string
}

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase()
}

export function signVerifiedEmailSession(input: { email: string; sessionId: string; expiresIn?: string }): string {
  const email = normalizeEmail(input.email)
  const payload: VerifiedEmailSessionPayload = {
    type: 'verified_email_session',
    email,
    emailHash: hashEmail(email),
    sessionId: input.sessionId,
  }
  const expiresInSeconds = input.expiresIn ? Number(input.expiresIn) : 60 * 60
  const signer = (jwt as unknown as { sign?: typeof import('jsonwebtoken').sign; default?: { sign: typeof import('jsonwebtoken').sign } }).sign
    ?? (jwt as unknown as { default?: { sign: typeof import('jsonwebtoken').sign } }).default?.sign
  if (!signer) {
    throw new Error('JWT signer is unavailable')
  }
  return signer(payload, mustGetEnv('JWT_SECRET'), { expiresIn: Number.isFinite(expiresInSeconds) && expiresInSeconds > 0 ? expiresInSeconds : 60 * 60 })
}

export function readVerifiedEmailSession(req: NextRequest): VerifiedEmailSessionPayload | null {
  const token = req.cookies.get(VERIFIED_EMAIL_SESSION_COOKIE)?.value
  if (!token) {
    return null
  }

  try {
    const verifier = (jwt as unknown as { verify?: typeof import('jsonwebtoken').verify; default?: { verify: typeof import('jsonwebtoken').verify } }).verify
      ?? (jwt as unknown as { default?: { verify: typeof import('jsonwebtoken').verify } }).default?.verify
    if (!verifier) {
      return null
    }
    const decoded = verifier(token, mustGetEnv('JWT_SECRET')) as VerifiedEmailSessionPayload
    if (decoded.type !== 'verified_email_session' || !decoded.email || !decoded.emailHash || !decoded.sessionId) {
      return null
    }
    return decoded
  } catch {
    return null
  }
}
