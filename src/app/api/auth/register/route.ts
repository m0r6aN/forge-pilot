import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json()

    // Check if user exists (in production, check database)
    // const existingUser = await getUserByEmail(email)
    // if (existingUser) {
    //   return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    // }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user (in production, save to database)
    const newUser = {
      id: Date.now().toString(),
      email,
      password: hashedPassword,
      name,
      plan: 'free',
      createdAt: new Date()
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    )

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })

    // Send welcome email
    await fetch(`${process.env.NEXT_PUBLIC_URL}/api/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newUser.email,
        name: newUser.name,
        subject: 'Welcome to BrandGenie AI!',
        templateId: 'welcome'
      })
    })

    return NextResponse.json({
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        plan: newUser.plan
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}