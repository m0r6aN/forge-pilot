import { NextRequest, NextResponse } from 'next/server'
import * as jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { FirestoreService, db } from '@/lib/db/firestore'

const JWT_SECRET = process.env.JWT_SECRET

// Plan prices in USD
const PLAN_PRICES: Record<string, number> = {
  starter: 29,
  growth: 79,
  professional: 199,
  enterprise: 499,
}

// In production, fetch real-time price from an API like CoinGecko
async function getEthPrice(): Promise<number> {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
    const data = await response.json()
    return data.ethereum.usd
  } catch {
    // Fallback price
    return 2000
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    
    if (!token || !JWT_SECRET) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    let decoded: any
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const user = await FirestoreService.getUser(decoded.userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { planId } = await req.json()
    
    if (!planId || !PLAN_PRICES[planId]) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 })
    }

    const usdAmount = PLAN_PRICES[planId]
    const ethPrice = await getEthPrice()
    const ethAmount = usdAmount / ethPrice
    
    const paymentAddress = process.env.CRYPTO_WALLET_ADDRESS
    if (!paymentAddress) {
      return NextResponse.json({ error: 'Crypto payments not configured' }, { status: 500 })
    }
    
    // Create pending payment record
    const paymentRef = db.instance.collection('crypto_payments').doc()
    const payment = {
      id: paymentRef.id,
      userId: user.id,
      planId,
      amountUsd: usdAmount,
      amount: ethAmount,
      currency: 'ETH',
      walletAddress: paymentAddress,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    }
    
    await paymentRef.set(payment)

    return NextResponse.json({
      paymentId: payment.id,
      paymentAddress,
      amount: ethAmount.toFixed(6),
      amountUsd: usdAmount,
      currency: 'ETH',
      expiresAt: payment.expiresAt,
    })
  } catch (error) {
    console.error('Crypto checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create crypto payment' },
      { status: 500 }
    )
  }
}
