import { NextRequest, NextResponse } from 'next/server'
import { FirestoreService, collections, db } from '@/lib/db/firestore'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json({ error: 'Verification token is required' }, { status: 400 })
    }

    // Find user with this verification token
    const snapshot = await db.instance
      .collection(collections.users)
      .where('emailVerificationToken', '==', token)
      .where('emailVerified', '==', false)
      .limit(1)
      .get()

    if (snapshot.empty) {
      return NextResponse.json({ error: 'Invalid or expired verification token' }, { status: 400 })
    }

    const userDoc = snapshot.docs[0]
    const userId = userDoc.id

    // Mark email as verified and remove token
    await FirestoreService.updateUser(userId, {
      emailVerified: true,
      emailVerificationToken: undefined,
    })

    return NextResponse.json({ message: 'Email verified successfully' })
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/auth?error=missing_token', req.url))
  }

  // Find user with this verification token
  const snapshot = await db.instance
    .collection(collections.users)
    .where('emailVerificationToken', '==', token)
    .where('emailVerified', '==', false)
    .limit(1)
    .get()

  if (snapshot.empty) {
    return NextResponse.redirect(new URL('/auth?error=invalid_token', req.url))
  }

  const userDoc = snapshot.docs[0]

  // Mark email as verified
  await FirestoreService.updateUser(userDoc.id, {
    emailVerified: true,
    emailVerificationToken: undefined,
  })

  return NextResponse.redirect(new URL('/dashboard?verified=true', req.url))
}
