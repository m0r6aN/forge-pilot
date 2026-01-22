export const emailTemplates = {
  welcome: {
    subject: 'Welcome to BrandGenie AI! 🎨',
    html: (data: { name: string }) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2DD4BF, #F59E0B); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { background: white; padding: 30px; border: 1px solid #e5e5e5; }
            .cta { background: #2DD4BF; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
            .features { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
            .feature { padding: 15px; border: 1px solid #e5e5e5; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✨ Welcome to BrandGenie AI!</h1>
            </div>
            <div class="content">
              <h2>Hi ${data.name}! 👋</h2>
              
              <p>Welcome to the future of branding! You've just joined thousands of entrepreneurs who are creating professional brand identities in minutes, not months.</p>
              
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
              
              <a href="${process.env.NEXT_PUBLIC_URL}/generator" class="cta">Start Creating →</a>
              
              <p>Need help? Reply to this email or check out our <a href="${process.env.NEXT_PUBLIC_URL}/docs">documentation</a>.</p>
              
              <p>Best regards,<br>The BrandGenie AI Team</p>
            </div>
          </div>
        </body>
      </html>
    `
  },

  brandReady: {
    subject: '🎉 Your Brand Identity is Ready!',
    html: (data: { name: string; brandName: string; downloadUrl: string }) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2DD4BF, #F59E0B); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { background: white; padding: 30px; border: 1px solid #e5e5e5; }
            .cta { background: #2DD4BF; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
            .brand-preview { background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Brand Complete!</h1>
            </div>
            <div class="content">
              <h2>Congratulations ${data.name}!</h2>
              
              <p>Your brand identity for <strong>"${data.brandName}"</strong> is ready and waiting for you!</p>
              
              <div class="brand-preview">
                <h3>📦 Your Brand Package Includes:</h3>
                <ul style="text-align: left; display: inline-block;">
                  <li>✅ Professional Logo (Multiple Formats)</li>
                  <li>✅ Color Palette with Hex Codes</li>
                  <li>✅ Typography Guidelines</li>
                  <li>✅ Brand Voice & Personality</li>
                  <li>✅ Complete Brand Guidelines PDF</li>
                  <li>✅ Social Media Templates</li>
                </ul>
              </div>
              
              <a href="${data.downloadUrl}" class="cta">Download Your Brand Package →</a>
              
              <p><strong>What's Next?</strong></p>
              <ul>
                <li>🚀 Launch marketing campaigns</li>
                <li>📱 Create social media content</li>
                <li>🌐 Build your website with consistent branding</li>
                <li>📈 Track your brand performance</li>
              </ul>
              
              <p>Questions? We're here to help! Reply to this email anytime.</p>
              
              <p>Cheers to your new brand!<br>The BrandGenie AI Team</p>
            </div>
          </div>
        </body>
      </html>
    `
  },

  paymentSuccess: {
    subject: '💳 Payment Confirmed - Welcome to Premium!',
    html: (data: { name: string; plan: string; amount: number }) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2DD4BF, #F59E0B); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { background: white; padding: 30px; border: 1px solid #e5e5e5; }
            .cta { background: #2DD4BF; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
            .receipt { background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💳 Payment Confirmed!</h1>
            </div>
            <div class="content">
              <h2>Thank you ${data.name}!</h2>
              
              <p>Your payment has been processed successfully. Welcome to <strong>${data.plan}</strong> plan!</p>
              
              <div class="receipt">
                <h3>📄 Receipt Details</h3>
                <p><strong>Plan:</strong> ${data.plan}</p>
                <p><strong>Amount:</strong> $${data.amount}/month</p>
                <p><strong>Status:</strong> Active</p>
                <p><strong>Next Billing:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
              </div>
              
              <p><strong>🎉 You now have access to:</strong></p>
              <ul>
                <li>Unlimited brand generations</li>
                <li>Advanced AI features</li>
                <li>Marketing campaign tools</li>
                <li>Priority support</li>
                <li>Premium templates</li>
              </ul>
              
              <a href="${process.env.NEXT_PUBLIC_URL}/dashboard" class="cta">Access Your Dashboard →</a>
              
              <p>Questions about your subscription? Contact us anytime.</p>
              
              <p>Happy branding!<br>The BrandGenie AI Team</p>
            </div>
          </div>
        </body>
      </html>
    `
  }
}