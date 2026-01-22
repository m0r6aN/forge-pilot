import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, queueEmail, availableTemplates } from '@/lib/email/email-service'
import { TemplateData } from '@/lib/email/templates'

// Internal API key for server-to-server communication
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY

export async function POST(req: NextRequest) {
  try {
    // Verify internal API key if configured
    const apiKey = req.headers.get('x-api-key')
    if (INTERNAL_API_KEY && apiKey !== INTERNAL_API_KEY) {
      // Allow requests from same origin (internal API calls)
      const origin = req.headers.get('origin')
      const host = req.headers.get('host')
      const isInternal = !origin || origin.includes(host || '')
      
      if (!isInternal) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body = await req.json()
    const { to, templateId, data, subject, queue } = body as {
      to: string | string[]
      templateId: string
      data: TemplateData
      subject?: string
      queue?: boolean
    }

    // Validate required fields
    if (!to || !templateId) {
      return NextResponse.json(
        { error: 'Missing required fields: to, templateId' },
        { status: 400 }
      )
    }

    // Validate template exists
    if (!availableTemplates.includes(templateId)) {
      return NextResponse.json(
        { error: `Invalid template: ${templateId}. Available: ${availableTemplates.join(', ')}` },
        { status: 400 }
      )
    }

    // Queue email for background processing or send immediately
    if (queue) {
      const queueId = queueEmail({ to, templateId, data: data || {}, subject })
      return NextResponse.json({ 
        success: true, 
        queued: true,
        queueId,
        message: 'Email queued for delivery' 
      })
    }

    // Send immediately
    const result = await sendEmail({ to, templateId, data: data || {}, subject })

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}

// GET endpoint to list available templates
export async function GET() {
  return NextResponse.json({
    templates: availableTemplates,
  })
}
