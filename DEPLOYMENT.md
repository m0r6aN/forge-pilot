# 🚀 ForgePilot AI - GCP Deployment Guide

## Quick Start (5 minutes!)

### Prerequisites
- Google Cloud account with billing enabled
- GitHub account
- Domain name (optional)

### 1. Clone & Setup
```bash
git clone https://github.com/your-username/forge-pilot-ai.git
cd forge-pilot-ai
chmod +x scripts/*.sh
```

### 2. GCP Setup
```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Create new project
gcloud projects create forgepilot-ai-prod --name="ForgePilot AI"
gcloud config set project forgepilot-ai-prod

# Enable billing (replace with your billing account)
gcloud billing projects link forgepilot-ai-prod --billing-account=YOUR-BILLING-ACCOUNT-ID
```

### 3. Deploy Infrastructure
```bash
./scripts/deploy.sh forgepilot-ai-prod us-central1
```

### 4. Setup Secrets
```bash
./scripts/setup-secrets.sh
```

### 5. Deploy Application
```bash
# Push to main branch triggers auto-deployment
git add .
git commit -m "Initial deployment"
git push origin main
```

## 💰 Cost Breakdown (Monthly)
- **Cloud Run**: ~$5-15 (pay per request)
- **Cloud Storage**: ~$1-3 (static assets)
- **Secret Manager**: ~$0.50
- **Cloud Build**: ~$2-5 (CI/CD)
- **Total**: **$8-25/month** (scales with usage)

## 🔧 Configuration

### Environment Variables
Set in Google Secret Manager:
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `RESEND_API_KEY`: Email service API key
- `JWT_SECRET`: JWT signing secret
- `AZURE_OPENAI_KEY`: Azure OpenAI API key

### Custom Domain (Optional)
```bash
# Map custom domain to Cloud Run
gcloud run domain-mappings create --service=forgepilot-api --domain=yourdomain.com --region=us-central1
```

## 📊 Monitoring
- **Logs**: `gcloud logs tail --service=forgepilot-api`
- **Metrics**: Google Cloud Console > Cloud Run
- **Budget**: Alerts set at 50%, 80%, 100% of $50/month

## 🚀 Scaling
- **Auto-scaling**: 0-10 instances based on traffic
- **Cold starts**: ~2-3 seconds (optimized)
- **Concurrent requests**: 100 per instance

## 🔒 Security
- HTTPS enforced
- Secrets in Secret Manager
- IAM roles with least privilege
- Container security scanning

## 🆘 Troubleshooting
```bash
# Check deployment status
gcloud run services describe forgepilot-api --region=us-central1

# View logs
gcloud logs tail --service=forgepilot-api --region=us-central1

# Update secrets
./scripts/setup-secrets.sh
```

**You're live! 🎉** Your ForgePilot AI is now running on Google Cloud Platform!