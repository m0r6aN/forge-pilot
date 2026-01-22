#!/bin/bash

# DNS Setup Script for Custom Domain
set -e

echo "🌐 Setting up DNS for custom domain..."

# Get the load balancer IP from Terraform
LOAD_BALANCER_IP=$(cd terraform && terraform output -raw load_balancer_ip)
DOMAIN_NAME=${1:-"forgepilot.ai"}

echo "📋 Load Balancer IP: $LOAD_BALANCER_IP"
echo "🌍 Domain: $DOMAIN_NAME"

echo "
🔧 DNS Configuration Required:

Add these DNS records to your domain registrar:

A Record:
  Name: @
  Value: $LOAD_BALANCER_IP
  TTL: 300

A Record:
  Name: www
  Value: $LOAD_BALANCER_IP
  TTL: 300

CNAME Record (optional, for subdomains):
  Name: api
  Value: $DOMAIN_NAME
  TTL: 300

📝 Instructions for popular registrars:

Cloudflare:
1. Go to DNS tab in Cloudflare dashboard
2. Add A record: @ -> $LOAD_BALANCER_IP
3. Add A record: www -> $LOAD_BALANCER_IP
4. Set Proxy status to 'DNS only' (gray cloud)

Namecheap:
1. Go to Advanced DNS tab
2. Add A Record: @ -> $LOAD_BALANCER_IP
3. Add A Record: www -> $LOAD_BALANCER_IP

GoDaddy:
1. Go to DNS Management
2. Add A record: @ -> $LOAD_BALANCER_IP
3. Add A record: www -> $LOAD_BALANCER_IP

⏰ DNS propagation can take up to 48 hours, but usually completes within 15 minutes.

🔒 SSL Certificate will be automatically provisioned by Google once DNS is configured.

✅ Test your setup:
  curl -I https://$DOMAIN_NAME
  curl -I https://www.$DOMAIN_NAME
"

# Optional: Check if domain is already pointing to the IP
echo "🔍 Checking current DNS configuration..."
CURRENT_IP=$(dig +short $DOMAIN_NAME @8.8.8.8 | tail -n1)

if [ "$CURRENT_IP" = "$LOAD_BALANCER_IP" ]; then
    echo "✅ DNS is already configured correctly!"
else
    echo "⚠️  DNS not yet configured. Current IP: ${CURRENT_IP:-'Not found'}"
    echo "   Expected IP: $LOAD_BALANCER_IP"
fi