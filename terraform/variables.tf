variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "firestore_region" {
  description = "Firestore region"
  type        = string
  default     = "us-central"
}

variable "environment" {
  description = "Environment (dev/staging/prod)"
  type        = string
  default     = "prod"
}

variable "domain_name" {
  description = "Custom domain name (e.g., brandgenie.ai)"
  type        = string
}

variable "github_owner" {
  description = "GitHub repository owner"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "brand-genie-ai"
}

variable "azure_openai_endpoint" {
  description = "Azure OpenAI endpoint URL"
  type        = string
}

variable "billing_account_id" {
  description = "GCP Billing Account ID for budget alerts"
  type        = string
}

variable "notification_email" {
  description = "Email for budget and monitoring alerts"
  type        = string
}