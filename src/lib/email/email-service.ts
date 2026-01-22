import { Resend } from 'resend'
import { emailTemplates, getTemplate, TemplateData } from './templates'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const FROM_EMAIL = process.env.EMAIL_FROM || 'ForgePilot <noreply@forgepilot.com>'

interface SendEmailOptions {
  to: string | string[]
  templateId: string
  data: TemplateData
  subject?: string // Override template subject
}

interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, templateId, data, subject } = options

  if (!resend) {
    console.warn('Resend API key not configured, email not sent')
    // In development, log the email instead of sending
    if (process.env.NODE_ENV === 'development') {
      console.log('DEV EMAIL:', { to, templateId, data })
      return { success: true, messageId: 'dev-' + Date.now() }
    }
    return { success: false, error: 'Email service not configured' }
  }

  const template = getTemplate(templateId)
  if (!template) {
    console.error(`Email template not found: ${templateId}`)
    return { success: false, error: `Template not found: ${templateId}` }
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject: subject || template.subject,
      html: template.html(data),
      text: template.text(data),
    })

    if (result.error) {
      console.error('Resend error:', result.error)
      return { success: false, error: result.error.message }
    }

    return { success: true, messageId: result.data?.id }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error: (error as Error).message }
  }
}

// Batch send emails (for bulk operations)
export async function sendBulkEmails(
  emails: Array<{ to: string; templateId: string; data: TemplateData }>
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = { sent: 0, failed: 0, errors: [] as string[] }

  // Process in batches of 10 to avoid rate limits
  const batchSize = 10
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize)
    
    const batchResults = await Promise.all(
      batch.map(email => sendEmail(email))
    )

    for (const result of batchResults) {
      if (result.success) {
        results.sent++
      } else {
        results.failed++
        if (result.error) results.errors.push(result.error)
      }
    }

    // Small delay between batches
    if (i + batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return results
}

// Email queue for background processing (simple in-memory queue)
// In production, use a proper job queue like BullMQ
interface QueuedEmail {
  id: string
  options: SendEmailOptions
  attempts: number
  maxAttempts: number
  nextAttempt: Date
}

const emailQueue: QueuedEmail[] = []
let processingQueue = false

export function queueEmail(options: SendEmailOptions, maxAttempts = 3): string {
  const id = `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  emailQueue.push({
    id,
    options,
    attempts: 0,
    maxAttempts,
    nextAttempt: new Date(),
  })

  // Start processing if not already running
  if (!processingQueue) {
    processEmailQueue()
  }

  return id
}

async function processEmailQueue() {
  if (processingQueue) return
  processingQueue = true

  while (emailQueue.length > 0) {
    const now = new Date()
    const readyEmails = emailQueue.filter(e => e.nextAttempt <= now)

    if (readyEmails.length === 0) {
      // Wait for next email to be ready
      await new Promise(resolve => setTimeout(resolve, 1000))
      continue
    }

    for (const email of readyEmails) {
      email.attempts++
      const result = await sendEmail(email.options)

      if (result.success) {
        // Remove from queue
        const index = emailQueue.indexOf(email)
        if (index > -1) emailQueue.splice(index, 1)
      } else if (email.attempts >= email.maxAttempts) {
        // Max attempts reached, remove from queue
        console.error(`Email ${email.id} failed after ${email.attempts} attempts`)
        const index = emailQueue.indexOf(email)
        if (index > -1) emailQueue.splice(index, 1)
      } else {
        // Schedule retry with exponential backoff
        email.nextAttempt = new Date(Date.now() + Math.pow(2, email.attempts) * 1000)
      }
    }

    // Small delay between processing cycles
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  processingQueue = false
}

// Export available templates for reference
export const availableTemplates = Object.keys(emailTemplates)
