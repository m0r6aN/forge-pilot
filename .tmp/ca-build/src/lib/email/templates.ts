export interface TemplateData {
  name?: string
  verificationUrl?: string
  resetUrl?: string
  plan?: string
  expiresIn?: string
  brandName?: string
  brandUrl?: string
  downloadUrl?: string
  trialEndsAt?: string
  updatePaymentUrl?: string
  txHash?: string
  amount?: number
  [key: string]: string | number | undefined
}

interface EmailTemplate {
  subject: string
  html: (data: TemplateData) => string
  text: (data: TemplateData) => string
}

const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'

export const emailTemplates: Record<string, EmailTemplate> = {
  welcome: {
    subject: 'Welcome to ForgePilot! 🚀',
    html: (data) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea, #764ba2); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { background: white; padding: 30px; border: 1px solid #e5e5e5; }
            .cta { background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
            .features { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
            .feature { padding: 15px; border: 1px solid #e5e5e5; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✨ Welcome to ForgePilot!</h1>
            </div>
            <div class="content">
              <h2>Hi ${data.name || 'there'}! 👋</h2>
              
              <p>Welcome to the future of branding! You've just joined thousands of entrepreneurs who are creating professional brand identities in minutes, not months.</p>
              
              ${data.verificationUrl ? `
              <p>Please verify your email to get started:</p>
              <p style="text-align: center;">
                <a href="${data.verificationUrl}" class="cta">Verify Email</a>
              </p>
              ` : ''}
              
              <div class="features">
                <div class="feature">
                  <h3>🎨 AI Brand Generation</h3>
                  <p>Complete brand packages with logos, colors, and guidelines</p>
                </div>
                <div class="feature">
                  <h3>🚀 Marketing Campaigns</h3>
                  <p>Launch multi-channel campaigns with one click</p>
                </div>
                <div class="feature">
                  <h3>📊 Analytics Dashboard</h3>
                  <p>Track performance and optimize your brand strategy</p>
                </div>
                <div class="feature">
                  <h3>💎 Premium Assets</h3>
                  <p>High-quality, commercial-ready brand materials</p>
                </div>
              </div>
              
              <p><strong>Ready to create your first brand?</strong></p>
              
              <a href="${baseUrl}/generator" class="cta">Start Creating →</a>
              
              <p>Need help? Reply to this email or check out our <a href="${baseUrl}/docs">documentation</a>.</p>
              
              <p>Best regards,<br>The ForgePilot Team</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: (data) => `
Welcome to ForgePilot!

Hi ${data.name || 'there'},

Welcome to the future of branding! You've joined thousands of entrepreneurs creating professional brand identities in minutes.

${data.verificationUrl ? `Please verify your email: ${data.verificationUrl}\n` : ''}

Ready to create your first brand? Visit: ${baseUrl}/generator

Best regards,
The ForgePilot Team
    `.trim()
  },

  'brand-ready': {
    subject: '🎉 Your Brand Identity is Ready!',
    html: (data) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea, #764ba2); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { background: white; padding: 30px; border: 1px solid #e5e5e5; }
            .cta { background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Brand Complete!</h1>
            </div>
            <div class="content">
              <h2>Congratulations ${data.name || 'there'}!</h2>
              <p>Your brand identity for <strong>"${data.brandName}"</strong> is ready!</p>
              <a href="${data.downloadUrl || data.brandUrl}" class="cta">View Your Brand →</a>
              <p>Best,<br>The ForgePilot Team</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: (data) => `Your brand "${data.brandName}" is ready! View it at: ${data.downloadUrl || data.brandUrl}`
  },

  'password-reset': {
    subject: 'Reset Your Password',
    html: (data) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea, #764ba2); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e5e5; }
            .cta { background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>Password Reset</h1></div>
            <div class="content">
              <p>Hi ${data.name || 'there'},</p>
              <p>Click below to reset your password. This link expires in ${data.expiresIn || '1 hour'}.</p>
              <p style="text-align: center;"><a href="${data.resetUrl}" class="cta">Reset Password</a></p>
              <p>If you didn't request this, ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: (data) => `Reset your password: ${data.resetUrl}\nExpires in ${data.expiresIn || '1 hour'}.`
  },

  'subscription-confirmed': {
    subject: '🎉 Subscription Confirmed!',
    html: (data) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea, #764ba2); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e5e5; }
            .cta { background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>You're All Set!</h1></div>
            <div class="content">
              <p>Hi ${data.name || 'there'},</p>
              <p>Thank you for subscribing to the <strong>${data.plan}</strong> plan!</p>
              <p style="text-align: center;"><a href="${baseUrl}/dashboard" class="cta">Go to Dashboard</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: (data) => `Thanks for subscribing to ${data.plan}! Visit your dashboard: ${baseUrl}/dashboard`
  },

  'subscription-canceled': {
    subject: 'Subscription Canceled',
    html: (data) => `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body>
          <p>Hi ${data.name || 'there'},</p>
          <p>Your subscription has been canceled. You'll retain access until the end of your billing period.</p>
          <p>We'd love to have you back: <a href="${baseUrl}/pricing">View Plans</a></p>
        </body>
      </html>
    `,
    text: (data) => `Your subscription has been canceled. Resubscribe at: ${baseUrl}/pricing`
  },

  'payment-failed': {
    subject: 'Payment Failed - Action Required',
    html: (data) => `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body>
          <p>Hi ${data.name || 'there'},</p>
          <p>We couldn't process your payment. Please update your payment method:</p>
          <p><a href="${data.updatePaymentUrl || baseUrl + '/settings/billing'}">Update Payment Method</a></p>
        </body>
      </html>
    `,
    text: (data) => `Payment failed. Update your payment method: ${data.updatePaymentUrl || baseUrl + '/settings/billing'}`
  },

  'trial-expiring': {
    subject: 'Your Trial Expires Soon',
    html: (data) => `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body>
          <p>Hi ${data.name || 'there'},</p>
          <p>Your trial expires on ${data.trialEndsAt}. Upgrade to keep your access:</p>
          <p><a href="${baseUrl}/pricing">View Plans</a></p>
        </body>
      </html>
    `,
    text: (data) => `Your trial expires on ${data.trialEndsAt}. Upgrade at: ${baseUrl}/pricing`
  },

  'crypto-payment-confirmed': {
    subject: 'Crypto Payment Confirmed!',
    html: (data) => `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body>
          <p>Hi ${data.name || 'there'},</p>
          <p>Your crypto payment has been confirmed!</p>
          <p>Transaction: <code>${data.txHash}</code></p>
          <p>Your <strong>${data.plan}</strong> subscription is now active.</p>
          <p><a href="${baseUrl}/dashboard">Go to Dashboard</a></p>
        </body>
      </html>
    `,
    text: (data) => `Crypto payment confirmed! TX: ${data.txHash}. Your ${data.plan} plan is active.`
  },

  'launch-blueprint-unlock': {
    subject: 'Verify Email to Unlock Your ForgePilot Blueprint',
    html: (data) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .content { border: 1px solid #e5e7eb; border-radius: 10px; padding: 24px; background: #ffffff; }
            .cta { display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; margin: 16px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="content">
              <h2>One quick step before checkout</h2>
              <p>Use this secure link to verify your email, then you can unlock the full Launch Blueprint.</p>
              <p><a class="cta" href="${data.verificationUrl}">Verify Email</a></p>
              <p>This link expires in 20 minutes.</p>
              <p>- ForgePilot</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: (data) => `Verify your email to unlock the blueprint: ${data.verificationUrl}. This link expires in 20 minutes.`
  },

  'magic-link-continue': {
    subject: 'Continue your ForgePilot session',
    html: (data) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .content { border: 1px solid #e5e7eb; border-radius: 10px; padding: 24px; background: #ffffff; }
            .cta { display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; margin: 16px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="content">
              <h2>Confirm your email to continue</h2>
              <p>Use this secure link to continue your ForgePilot strategy session.</p>
              <p><a class="cta" href="${data.verificationUrl}">Continue via Link</a></p>
              <p>This link expires in ${data.expiresIn || '15 minutes'}.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: (data) =>
      `Confirm your email to continue: ${data.verificationUrl}. This link expires in ${data.expiresIn || '15 minutes'}.`,
  },
}

export function getTemplate(templateId: string) {
  return emailTemplates[templateId] || null
}
