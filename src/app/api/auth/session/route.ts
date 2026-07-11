import { NextRequest, NextResponse } from 'next/server'
import { readVerifiedEmailSession } from '@/lib/auth/verified-email-session'

export async function GET(req: NextRequest) {
  const session = readVerifiedEmailSession(req)
  if (!session) {
    return NextResponse.json({ ok: true, code: 'unauthenticated', verified: false })
  }

  return NextResponse.json({
    ok: true,
    code: 'authenticated',
    verified: true,
    email: session.email,
    emailHash: session.emailHash,
    sessionId: session.sessionId,
  })
}
