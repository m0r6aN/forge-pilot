terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  backend "gcs" {
    bucket = "forgepilot-terraform-state"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Variables
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment (dev/staging/prod)"
  type        = string
  default     = "prod"
}

# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "cloudbuild.googleapis.com",
    "run.googleapis.com",
    "storage.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com"
  ])
  
  project = var.project_id
  service = each.value
  
  disable_dependent_services = true
}

# Storage bucket for static assets
resource "google_storage_bucket" "static_assets" {
  name     = "${var.project_id}-static-assets"
  location = var.region
  
  uniform_bucket_level_access = true
  
  website {
    main_page_suffix = "index.html"
    not_found_page   = "404.html"
  }
  
  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}

# Make bucket publicly readable
resource "google_storage_bucket_iam_member" "public_read" {
  bucket = google_storage_bucket.static_assets.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# Cloud Run service for API
resource "google_cloud_run_service" "forgepilot_api" {
  name     = "forgepilot-api"
  location = var.region
  
  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/forgepilot-ai:latest"
        
        ports {
          container_port = 3000
        }
        
        env {
          name  = "NODE_ENV"
          value = "production"
        }
        
        env {
          name  = "GOOGLE_CLOUD_PROJECT"
          value = var.project_id
        }
        
        env {
          name  = "FIRESTORE_PROJECT_ID"
          value = var.project_id
        }
        
        env {
          name = "FIRESTORE_SERVICE_ACCOUNT_KEY"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.firestore_key.secret_id
              key  = "latest"
            }
          }
        }
        
        env {
          name = "STRIPE_SECRET_KEY"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.stripe_secret.secret_id
              key  = "latest"
            }
          }
        }
        
        env {
          name = "RESEND_API_KEY"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.resend_api_key.secret_id
              key  = "latest"
            }
          }
        }
        
        env {
          name = "JWT_SECRET"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.jwt_secret.secret_id
              key  = "latest"
            }
          }
        }
        
        env {
          name = "AZURE_OPENAI_KEY"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.azure_openai_key.secret_id
              key  = "latest"
            }
          }
        }
        
        env {
          name  = "AZURE_OPENAI_ENDPOINT"
          value = var.azure_openai_endpoint
        }
        
        env {
          name  = "NEXT_PUBLIC_DOMAIN"
          value = var.domain_name
        }
        
        resources {
          limits = {
            cpu    = "2000m"  # Increased for database operations
            memory = "1Gi"    # Increased for better performance
          }
        }
      }
      
      container_concurrency = 100
      timeout_seconds      = 300
    }
    
    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = "1"    # Keep 1 instance warm
        "autoscaling.knative.dev/maxScale" = "20"   # Increased max scale
        "run.googleapis.com/cpu-throttling" = "false"  # Better performance
      }
    }
  }
  
  traffic {
    percent         = 100
    latest_revision = true
  }
  
  depends_on = [
    google_project_service.required_apis,
    google_firestore_database.forgepilot_db
  ]
}

# Allow unauthenticated access to Cloud Run
resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_service.forgepilot_api.name
  location = google_cloud_run_service.forgepilot_api.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Secret Manager secrets
resource "google_secret_manager_secret" "stripe_secret" {
  secret_id = "stripe-secret-key"
  
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret" "resend_api_key" {
  secret_id = "resend-api-key"
  
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "jwt-secret"
  
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret" "azure_openai_key" {
  secret_id = "azure-openai-key"
  
  replication {
    automatic = true
  }
}

# Cloud Build trigger for CI/CD
resource "google_cloudbuild_trigger" "deploy_trigger" {
  name        = "forgepilot-deploy"
  description = "Deploy ForgePilot AI on push to main"
  
  github {
    owner = var.github_owner
    name  = var.github_repo
    push {
      branch = "^main$"
    }
  }
  
  filename = "cloudbuild.yaml"
  
  depends_on = [google_project_service.required_apis]
}

# Outputs
output "cloud_run_url" {
  value = google_cloud_run_service.forgepilot_api.status[0].url
}

output "static_bucket_url" {
  value = "https://storage.googleapis.com/${google_storage_bucket.static_assets.name}"
}

