#!/bin/bash

# Setup secrets in Google Secret Manager
set -e

echo "🔑 Setting up secrets in Google Secret Manager..."

# Check if gcloud is authenticated
gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1 > /dev/null || {
    echo "❌ Please authenticate with gcloud first: gcloud auth login"
    exit 1
}

# Function to create or update secret
create_or_update_secret() {
    local secret_name=$1
    local secret_value=$2
    
    if gcloud secrets describe $secret_name >/dev/null 2>&1; then
        echo "📝 Updating existing secret: $secret_name"
        echo -n "$secret_value" | gcloud secrets versions add $secret_name --data-file=-
    else
        echo "🆕 Creating new secret: $secret_name"
        echo -n "$secret_value" | gcloud secrets create $secret_name --data-file=-
    fi
}

# Prompt for secrets
echo "Enter your secrets (press Enter after each):"

read -p "🔑 Stripe Secret Key: " -s STRIPE_SECRET_KEY
echo
read -p "📧 Resend API Key: " -s RESEND_API_KEY
echo
read -p "🔐 JWT Secret (or press Enter to generate): " -s JWT_SECRET
echo
read -p "🤖 Azure OpenAI Key: " -s AZURE_OPENAI_KEY
echo

# Generate JWT secret if not provided
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
    echo "🔐 Generated JWT secret"
fi

# Create/update secrets
create_or_update_secret "stripe-secret-key" "$STRIPE_SECRET_KEY"
create_or_update_secret "resend-api-key" "$RESEND_API_KEY"
create_or_update_secret "jwt-secret" "$JWT_SECRET"
create_or_update_secret "azure-openai-key" "$AZURE_OPENAI_KEY"

echo "✅ All secrets configured successfully!"
echo "🚀 You can now deploy your application"