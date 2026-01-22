import { NextRequest, NextResponse } from 'next/server'
import * as jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { FirestoreService } from '@/lib/db/firestore'

const JWT_SECRET = process.env.JWT_SECRET
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET

export async function GET(req: NextRequest) {
  try {
    if (!JWT_SECRET) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const cookieStore = await cookies()
    let token = cookieStore.get('auth-token')?.value
    const refreshToken = cookieStore.get('refresh-token')?.value

    if (!token && !refreshToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    let decoded: any
    let needsRefresh = false

    // Try to verify access token
    if (token) {
      try {
        decoded = jwt.verify(token, JWT_SECRET)
      } catch (error) {
        if ((error as jwt.JsonWebTokenError).name === 'TokenExpiredError') {
          needsRefresh = true
        } else {
          return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }
      }
    } else {
      needsRefresh = true
    }

    // Try to refresh if needed
    if (needsRefresh && refreshToken) {
      try {
        const refreshDecoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET!) as any
        
        // Create new access token
        const newAccessToken = jwt.sign(
          { userId: refreshDecoded.userId, email: refreshDecoded.email, type: 'access' },
          JWT_SECRET,
          { expiresIn: '15m' }
        )

        // Set new access token cookie
        cookieStore.set('auth-token', newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 15 * 60
        })

        decoded = refreshDecoded
      } catch (error) {
        return NextResponse.json({ error: 'Session expired, please login again' }, { status: 401 })
      }
    }

    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Fetch user from Firestore
    const user = await FirestoreService.getUser(decoded.userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get subscription info
    const subscription = await FirestoreService.getSubscription(user.id)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        emailVerified: user.emailVerified,
        subscription: subscription ? {
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        } : null,
      }
    })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
