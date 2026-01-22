import { NextRequest, NextResponse } from 'next/server'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { FirestoreService } from '@/lib/db/firestore'

const JWT_SECRET = process.env.JWT_SECRET
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET

export async function POST(req: NextRequest) {
  try {
    if (!JWT_SECRET) {
      console.error('JWT_SECRET is not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Find user in Firestore
    const user = await FirestoreService.getUserByEmail(email.toLowerCase())
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Create access token (short-lived)
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'access' },
      JWT_SECRET,
      { expiresIn: '15m' }
    )

    // Create refresh token (long-lived)
    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'refresh' },
      JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    )

    // Set cookies
    const cookieStore = await cookies()
    cookieStore.set('auth-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 // 15 minutes
    })
    cookieStore.set('refresh-token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        emailVerified: user.emailVerified
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
