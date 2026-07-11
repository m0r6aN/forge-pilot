import { NextRequest, NextResponse } from 'next/server'
import * as jwt from 'jsonwebtoken'
import { mustGetEnv } from '@/lib/config/env'
import { isValidSessionId } from '@/lib/launch/types'

interface LaunchUnlockSessionPayload {
  type: 'launch_unlock_session'
  email: string
  sessionId: string
}

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('sessionId')
    if (!sessionId || !isValidSessionId(sessionId)) {
      return NextResponse.json({ verified: false }, { status: 400 })
    }

    const token = req.cookies.get('launch-unlock-session')?.value
    if (!token) {
      return NextResponse.json({ verified: false })
    }

    const decoded = jwt.verify(token, mustGetEnv('JWT_SECRET')) as LaunchUnlockSessionPayload
    const verified = decoded.type === 'launch_unlock_session' && decoded.sessionId === sessionId

    return NextResponse.json({
      verified,
      email: verified ? decoded.email : undefined,
    })
  } catch {
    return NextResponse.json({ verified: false })
  }
}
