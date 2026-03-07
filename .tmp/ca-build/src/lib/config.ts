   export const config = {
     azure: {
       openaiEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
       openaiKey: process.env.AZURE_OPENAI_KEY,
       storageAccount: process.env.AZURE_STORAGE_ACCOUNT,
     },
     stripe: {
       secretKey: process.env.STRIPE_SECRET_KEY,
       webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
     },
     resend: {
       apiKey: process.env.RESEND_API_KEY,
     }
   }
