import { NextRequest, NextResponse } from 'next/server'
import * as jwt from 'jsonwebtoken'
import { mustGetEnv } from '@/lib/config/env'
import { consumeOneTimeToken } from '@/lib/launch/security'

interface LaunchUnlockTokenPayload {
  type: 'launch_unlock_email'
  email: string
  sessionId: string
  tokenId?: string
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/launch?unlock=invalid', origin))
  }

  try {
    const jwtSecret = mustGetEnv('JWT_SECRET')

    const decoded = jwt.verify(token, jwtSecret) as LaunchUnlockTokenPayload

    if (decoded.type !== 'launch_unlock_email' || !decoded.email || !decoded.sessionId || !decoded.tokenId) {
      return NextResponse.redirect(new URL('/launch?unlock=invalid', origin))
    }

    const firstUse = consumeOneTimeToken(decoded.tokenId, 25 * 60 * 60 * 1000)
    if (!firstUse) {
      return NextResponse.redirect(new URL('/launch?unlock=invalid', origin))
    }

    const unlockSessionToken = jwt.sign(
      {
        type: 'launch_unlock_session',
        email: decoded.email,
        sessionId: decoded.sessionId,
      },
      jwtSecret,
      { expiresIn: '24h' }
    )

    const response = NextResponse.redirect(new URL('/launch?unlock=verified', origin))
    response.cookies.set('launch-unlock-session', unlockSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Launch unlock verification failed:', error)
    return NextResponse.redirect(new URL('/launch?unlock=invalid', origin))
  }
}
