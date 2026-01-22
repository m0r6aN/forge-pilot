import { NextRequest, NextResponse } from 'next/server'
import * as crypto from 'crypto'
import { FirestoreService } from '@/lib/db/firestore'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Find user
    const user = await FirestoreService.getUserByEmail(normalizedEmail)
    
    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ 
        message: 'If an account exists with that email, you will receive a password reset link.' 
      })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')

    // Store reset token (expires in 1 hour)
    await FirestoreService.createPasswordReset(user.id, resetToken, 3600000)

    // Send password reset email
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
    fetch(`${baseUrl}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: user.email,
        templateId: 'password-reset',
        data: {
          name: user.name,
          resetUrl: `${baseUrl}/auth/reset-password?token=${resetToken}`,
          expiresIn: '1 hour',
        }
      })
    }).catch(err => console.error('Failed to send password reset email:', err))

    return NextResponse.json({ 
      message: 'If an account exists with that email, you will receive a password reset link.' 
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
