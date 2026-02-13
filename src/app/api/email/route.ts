import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { emailTemplates } from '@/lib/email/templates'
import { mustGetEnv, getEnv } from '@/lib/config/env'

function createResendClient() {
  return new Resend(mustGetEnv('RESEND_API_KEY'))
}

export async function POST(req: NextRequest) {
  try {
    const resend = createResendClient()
    const { email, name, subject, content, templateId, templateData } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    let emailContent = content
    let emailSubject = subject

    // Use template if specified
    if (templateId && emailTemplates[templateId as keyof typeof emailTemplates]) {
      const template = emailTemplates[templateId as keyof typeof emailTemplates]
      emailSubject = template.subject
      emailContent = template.html(templateData || { name: name || 'there' })
    }

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: getEnv('EMAIL_FROM', 'ForgePilot <noreply@forgepilot.com>')!,
      to: [email],
      subject: emailSubject || 'Welcome to ForgePilot AI',
      html: emailContent || `<p>Hello ${name || 'there'},</p><p>Thank you for using ForgePilot AI!</p>`,
      tags: [
        {
          name: 'template_id',
          value: templateId || 'custom'
        }
      ]
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, messageId: data?.id })
  } catch (error) {
    console.error('Email sending failed:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
