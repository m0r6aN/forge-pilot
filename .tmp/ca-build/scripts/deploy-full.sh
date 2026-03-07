#!/bin/bash

# Complete ForgePilot AI Deployment with Database, CDN, and Custom Domain
set -e

echo "🚀 Deploying FULL STACK ForgePilot AI to GCP..."

# Check if required tools are installed
command -v terraform >/dev/null 2>&1 || { echo "❌ Terraform is required but not installed. Aborting." >&2; exit 1; }
command -v gcloud >/dev/null 2>&1 || { echo "❌ Google Cloud SDK is required but not installed. Aborting." >&2; exit 1; }

# Set variables
PROJECT_ID=${1:-"forgepilot-ai-prod"}
REGION=${2:-"us-central1"}
DOMAIN_NAME=${3:-"forgepilot.ai"}
BILLING_ACCOUNT=${4}
NOTIFICATION_EMAIL=${5}

if [ -z "$BILLING_ACCOUNT" ] || [ -z "$NOTIFICATION_EMAIL" ]; then
    echo "❌ Usage: $0 <project-id> <region> <domain> <billing-account-id> <notification-email>"
    echo "Example: $0 forgepilot-ai-prod us-central1 forgepilot.ai 01234-ABCDEF-567890 admin@forgepilot.ai"
    exit 1
fi

echo "📋 Project: $PROJECT_ID"
echo "🌍 Region: $REGION"
echo "🌐 Domain: $DOMAIN_NAME"
echo "💳 Billing: $BILLING_ACCOUNT"
echo "📧 Email: $NOTIFICATION_EMAIL"

# Authenticate with GCP
echo "🔐 Authenticating with Google Cloud..."
gcloud auth login
gcloud config set project $PROJECT_ID

# Enable ALL required APIs
echo "⚡ Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable dns.googleapis.com
gcloud services enable monitoring.googleapis.com
gcloud services enable logging.googleapis.com

# Create Terraform state bucket
echo "🪣 Creating Terraform state bucket..."
gsutil mb -p $PROJECT_ID gs://$PROJECT_ID-terraform-state || echo "Bucket already exists"

# Initialize Terraform
echo "🏗️ Initializing Terraform..."
cd terraform
terraform init -backend-config="bucket=$PROJECT_ID-terraform-state"

# Create terraform.tfvars
cat > terraform.tfvars <<EOF
project_id = "$PROJECT_ID"
region = "$REGION"
domain_name = "$DOMAIN_NAME"
billing_account_id = "$BILLING_ACCOUNT"
notification_email = "$NOTIFICATION_EMAIL"
github_owner = "your-username"
github_repo = "forge-pilot-ai"
azure_openai_endpoint = "https://your-openai.openai.azure.com/"
EOF

# Plan and apply infrastructure
echo "📋 Planning infrastructure..."
terraform plan

echo "🚀 Applying infrastructure..."
terraform apply -auto-approve

# Get outputs
CLOUD_RUN_URL=$(terraform output -raw cloud_run_url)
LOAD_BALANCER_IP=$(terraform output -raw load_balancer_ip)
STATIC_BUCKET_URL=$(terraform output -raw static_bucket_url)

cd ..

echo "✅ Infrastructure deployment complete!"
echo "🌐 Cloud Run URL: $CLOUD_RUN_URL"
echo "🔗 Load Balancer IP: $LOAD_BALANCER_IP"
echo "📦 Static Assets: $STATIC_BUCKET_URL"

# Setup secrets
echo "🔑 Setting up secrets..."
./scripts/setup-secrets.sh

# Setup DNS
echo "🌐 Setting up DNS..."
./scripts/setup-dns.sh $DOMAIN_NAME

echo "
🎉 DEPLOYMENT COMPLETE! 

Your ForgePilot AI is now deployed with:
✅ Cloud Run backend with auto-scaling
✅ Firestore database for data persistence  
✅ Cloud CDN for global performance
✅ SSL certificate for HTTPS
✅ Custom domain ready: https://$DOMAIN_NAME
✅ Budget alerts and monitoring
✅ CI/CD pipeline ready

Next steps:
1. Configure your DNS records (see output above)
2. Push to main branch to trigger deployment
3. Monitor at: https://console.cloud.google.com/run

🚀 You're ready to scale to millions of users!
"