import { NextRequest, NextResponse } from 'next/server'
import { readVerifiedEmailSession } from '@/lib/auth/verified-email-session'

export async function GET(req: NextRequest) {
  const session = readVerifiedEmailSession(req)
  if (!session) {
    return NextResponse.json({
      ok: true,
      code: 'unauthenticated',
      authenticated: false,
      user: null,
    })
  }

  return NextResponse.json({
    ok: true,
    code: 'authenticated',
    authenticated: true,
    user: {
      email: session.email,
      emailHash: session.emailHash,
      sessionId: session.sessionId,
    },
  })
}
