#!/bin/bash

# ForgePilot AI Deployment Script
set -e

echo "🚀 Deploying ForgePilot AI to GCP..."

# Check if required tools are installed
command -v terraform >/dev/null 2>&1 || { echo "❌ Terraform is required but not installed. Aborting." >&2; exit 1; }
command -v gcloud >/dev/null 2>&1 || { echo "❌ Google Cloud SDK is required but not installed. Aborting." >&2; exit 1; }

# Set variables
PROJECT_ID=${1:-"forgepilot-ai-prod"}
REGION=${2:-"us-central1"}

echo "📋 Project: $PROJECT_ID"
echo "🌍 Region: $REGION"

# Authenticate with GCP
echo "🔐 Authenticating with Google Cloud..."
gcloud auth login
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "⚡ Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Create Terraform state bucket
echo "🪣 Creating Terraform state bucket..."
gsutil mb -p $PROJECT_ID gs://$PROJECT_ID-terraform-state || echo "Bucket already exists"

# Initialize Terraform
echo "🏗️ Initializing Terraform..."
cd terraform
terraform init -backend-config="bucket=$PROJECT_ID-terraform-state"

# Plan and apply infrastructure
echo "📋 Planning infrastructure..."
terraform plan -var="project_id=$PROJECT_ID" -var="region=$REGION"

echo "🚀 Applying infrastructure..."
terraform apply -var="project_id=$PROJECT_ID" -var="region=$REGION" -auto-approve

# Get Cloud Run URL
CLOUD_RUN_URL=$(terraform output -raw cloud_run_url)
echo "✅ Deployment complete!"
echo "🌐 Your app is live at: $CLOUD_RUN_URL"

# Set up secrets (you'll need to add the actual values)
echo "🔑 Don't forget to set your secrets:"
echo "gcloud secrets versions add stripe-secret-key --data-file=- <<< 'your-stripe-key'"
echo "gcloud secrets versions add resend-api-key --data-file=- <<< 'your-resend-key'"
echo "gcloud secrets versions add jwt-secret --data-file=- <<< 'your-jwt-secret'"
echo "gcloud secrets versions add azure-openai-key --data-file=- <<< 'your-openai-key'"