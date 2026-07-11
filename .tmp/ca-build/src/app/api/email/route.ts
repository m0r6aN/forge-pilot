import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, sendEmailRaw } from '@/lib/email/email-service'
import { getTemplate } from '@/lib/email/templates'

export async function POST(req: NextRequest) {
  try {
    const { email, name, subject, content, templateId, templateData } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const safeTemplateData = templateData || { name: name || 'there' }
    let result

    if (templateId) {
      const template = getTemplate(templateId)
      if (!template) {
        return NextResponse.json({ error: `Template not found: ${templateId}` }, { status: 400 })
      }

      result = await sendEmail({
        to: email,
        templateId,
        data: safeTemplateData,
        subject,
      })
    } else {
      const html = content || `<p>Hello ${name || 'there'},</p><p>Thank you for using ForgePilot AI!</p>`
      const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      result = await sendEmailRaw({
        to: email,
        subject: subject || 'Welcome to ForgePilot AI',
        html,
        text,
      })
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (error) {
    console.error('Email sending failed:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
