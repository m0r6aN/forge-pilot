import { NextRequest, NextResponse } from 'next/server'
import * as bcrypt from 'bcryptjs'
import { FirestoreService } from '@/lib/db/firestore'

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Verify reset token
    const resetRecord = await FirestoreService.getPasswordResetByToken(token)
    if (!resetRecord) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 })
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12)

    // Update user password
    await FirestoreService.updateUser(resetRecord.userId, { passwordHash })

    // Mark reset token as used
    await FirestoreService.markPasswordResetUsed(resetRecord.id)

    return NextResponse.json({ message: 'Password reset successfully' })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
