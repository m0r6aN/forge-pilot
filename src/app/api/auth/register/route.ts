import { NextRequest, NextResponse } from 'next/server'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import * as crypto from 'crypto'
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

    const { email, password, name } = await req.json()

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if user exists
    const existingUser = await FirestoreService.getUserByEmail(normalizedEmail)
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex')

    // Create user in Firestore
    const newUser = await FirestoreService.createUser({
      email: normalizedEmail,
      name: name.trim(),
      passwordHash,
      plan: 'free',
      emailVerified: false,
      emailVerificationToken,
    })

    // Create default user settings
    await FirestoreService.createUserSettings(newUser.id)

    // Create access token
    const accessToken = jwt.sign(
      { userId: newUser.id, email: newUser.email, type: 'access' },
      JWT_SECRET,
      { expiresIn: '15m' }
    )

    // Create refresh token
    const refreshToken = jwt.sign(
      { userId: newUser.id, email: newUser.email, type: 'refresh' },
      JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    )

    // Set cookies
    const cookieStore = await cookies()
    cookieStore.set('auth-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60
    })
    cookieStore.set('refresh-token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60
    })

    // Send welcome email (fire and forget)
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
    fetch(`${baseUrl}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: newUser.email,
        templateId: 'welcome',
        data: {
          name: newUser.name,
          verificationUrl: `${baseUrl}/auth/verify-email?token=${emailVerificationToken}`,
        }
      })
    }).catch(err => console.error('Failed to send welcome email:', err))

    return NextResponse.json({
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        plan: newUser.plan,
        emailVerified: newUser.emailVerified,
      },
      message: 'Registration successful. Please check your email to verify your account.'
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
