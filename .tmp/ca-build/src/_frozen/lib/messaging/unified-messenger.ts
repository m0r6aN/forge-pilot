export interface Message {
  id: string
  threadId: string
  senderId: string
  recipientId: string
  content: string
  type: 'text' | 'image' | 'file' | 'voice' | 'video'
  channel: 'internal' | 'email' | 'sms' | 'whatsapp' | 'slack' | 'teams'
  timestamp: Date
  status: 'sent' | 'delivered' | 'read' | 'failed'
  metadata?: Record<string, any>
}

export interface MessageThread {
  id: string
  participants: string[]
  subject: string
  type: 'customer' | 'vendor' | 'team' | 'support'
  lastMessage: Message
  unreadCount: number
  tags: string[]
  priority: 'low' | 'normal' | 'high' | 'urgent'
}

export class UnifiedMessenger {
  private channels: MessageChannel[]

  constructor() {
    this.channels = [
      new EmailChannel(),
      new SMSChannel(),
      new WhatsAppChannel(),
      new SlackChannel(),
      new TeamsChannel(),
      new InternalChannel()
    ]
  }

  async sendMessage(message: Omit<Message, 'id' | 'timestamp' | 'status'>): Promise<Message> {
    const fullMessage: Message = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      status: 'sent'
    }

    // Find appropriate channel
    const channel = this.channels.find(c => c.type === message.channel)
    if (!channel) {
      throw new Error(`Unsupported channel: ${message.channel}`)
    }

    try {
      // Send via channel
      await channel.send(fullMessage)
      
      // Store in database
      await this.storeMessage(fullMessage)
      
      // Update thread
      await this.updateThread(fullMessage.threadId, fullMessage)
      
      // Trigger notifications
      await this.triggerNotifications(fullMessage)
      
      return fullMessage
      
    } catch (error) {
      fullMessage.status = 'failed'
      await this.storeMessage(fullMessage)
      throw error
    }
  }

  async getConversations(userId: string, filters?: any): Promise<MessageThread[]> {
    const threads = await FirestoreService.getMessageThreads(userId, filters)
    
    // Enrich with AI insights
    for (const thread of threads) {
      thread.aiInsights = await this.generateThreadInsights(thread)
    }
    
    return threads
  }

  async generateSmartReply(threadId: string, context?: string): Promise<string[]> {
    const thread = await this.getThread(threadId)
    const recentMessages = thread.messages.slice(-10)
    
    const prompt = `
      Generate 3 smart reply options for this conversation:
      
      Context: ${context || 'Business communication'}
      Recent messages: ${recentMessages.map(m => `${m.senderId}: ${m.content}`).join('\n')}
      
      Generate professional, contextually appropriate responses.
      Keep them concise and actionable.
    `

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    })

    return JSON.parse(response.choices[0].message.content || '[]')
  }

  async autoRespond(message: Message): Promise<void> {
    // Check if auto-response is enabled and appropriate
    const shouldAutoRespond = await this.shouldAutoRespond(message)
    
    if (shouldAutoRespond) {
      const response = await this.generateAutoResponse(message)
      
      await this.sendMessage({
        threadId: message.threadId,
        senderId: 'system',
        recipientId: message.senderId,
        content: response,
        type: 'text',
        channel: message.channel
      })
    }
  }
}