import { NextRequest, NextResponse } from 'next/server'
import { UnifiedMessenger } from '@/lib/messaging/unified-messenger'
import { verifyJWT } from '@/lib/auth/jwt'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const payload = await verifyJWT(token)
    const userId = payload.userId
    
    const body = await request.json()
    const { threadId, recipientId, content, type, channel } = body
    
    const messenger = new UnifiedMessenger()
    const message = await messenger.sendMessage({
      threadId,
      senderId: userId,
      recipientId,
      content,
      type,
      channel
    })
    
    return NextResponse.json({
      success: true,
      message,
      smartReplies: await messenger.generateSmartReply(threadId)
    })
    
  } catch (error) {
    console.error('Message send error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}