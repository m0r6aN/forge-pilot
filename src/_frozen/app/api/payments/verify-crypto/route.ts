import { NextRequest, NextResponse } from 'next/server'
import * as jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { FirestoreService, db, collections } from '@/lib/db/firestore'

const JWT_SECRET = process.env.JWT_SECRET

interface CryptoPayment {
  id: string
  userId: string
  planId: string
  amount: number
  currency: string
  walletAddress: string
  txHash?: string
  status: 'pending' | 'confirmed' | 'failed'
  createdAt: Date
  confirmedAt?: Date
}

// In production, integrate with a blockchain API like Etherscan, Infura, or Alchemy
async function verifyTransaction(txHash: string, expectedAmount: number, expectedAddress: string): Promise<boolean> {
  // Mock verification - in production, use actual blockchain API
  // Example with Etherscan:
  // const response = await fetch(`https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`)
  // const data = await response.json()
  // return data.result && data.result.to.toLowerCase() === expectedAddress.toLowerCase() && parseFloat(data.result.value) >= expectedAmount
  
  console.log(`Verifying transaction: ${txHash}`)
  return txHash.startsWith('0x') && txHash.length === 66
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

    const { paymentId, txHash } = await req.json()

    if (!paymentId || !txHash) {
      return NextResponse.json({ error: 'Payment ID and transaction hash are required' }, { status: 400 })
    }

    // Get the pending payment
    const paymentDoc = await db.instance.collection('crypto_payments').doc(paymentId).get()
    
    if (!paymentDoc.exists) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const payment = paymentDoc.data() as CryptoPayment

    if (payment.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (payment.status === 'confirmed') {
      return NextResponse.json({ error: 'Payment already confirmed' }, { status: 400 })
    }

    // Verify the transaction on blockchain
    const isValid = await verifyTransaction(
      txHash,
      payment.amount,
      payment.walletAddress
    )

    if (!isValid) {
      return NextResponse.json({ error: 'Transaction verification failed' }, { status: 400 })
    }

    // Update payment record
    await db.instance.collection('crypto_payments').doc(paymentId).update({
      txHash,
      status: 'confirmed',
      confirmedAt: new Date(),
    })

    // Update user's plan
    await FirestoreService.updateUser(user.id, {
      plan: payment.planId as any,
    })

    // Create subscription record
    const existingSub = await FirestoreService.getSubscription(user.id)
    const subscriptionData = {
      userId: user.id,
      plan: payment.planId as any,
      status: 'active' as const,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      cancelAtPeriodEnd: false,
    }

    if (existingSub) {
      await FirestoreService.updateSubscription(existingSub.id, subscriptionData)
    } else {
      await FirestoreService.createSubscription(subscriptionData)
    }

    // Send confirmation email
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
    fetch(`${baseUrl}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: user.email,
        templateId: 'crypto-payment-confirmed',
        data: {
          name: user.name,
          plan: payment.planId,
          txHash,
        }
      })
    }).catch(err => console.error('Failed to send confirmation email:', err))

    return NextResponse.json({
      message: 'Payment verified successfully',
      plan: payment.planId,
    })
  } catch (error) {
    console.error('Crypto verification error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
