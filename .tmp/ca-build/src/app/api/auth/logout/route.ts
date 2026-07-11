import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { VERIFIED_EMAIL_SESSION_COOKIE } from '@/lib/auth/verified-email-session'

export async function POST() {
  try {
    const cookieStore = await cookies()
    
    // Clear auth cookies
    cookieStore.delete('auth-token')
    cookieStore.delete('refresh-token')
    cookieStore.delete(VERIFIED_EMAIL_SESSION_COOKIE)

    return NextResponse.json({ ok: true, code: 'logged_out', message: 'Session ended.' })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ ok: false, code: 'server_error', message: 'Unable to end session.' }, { status: 500 })
  }
}
