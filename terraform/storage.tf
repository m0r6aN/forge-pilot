# Additional storage buckets for 3D assets and site hosting
resource "google_storage_bucket" "forgepilot_3d_models" {
  name     = "${var.project_id}-3d-models"
  location = var.region
  
  uniform_bucket_level_access = true
  
  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
  
  lifecycle_rule {
    condition {
      age = 90  # Delete old 3D models after 90 days
    }
    action {
      type = "Delete"
    }
  }
}

resource "google_storage_bucket" "forgepilot_3d_animations" {
  name     = "${var.project_id}-3d-animations"
  location = var.region
  
  uniform_bucket_level_access = true
  
  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
  
  lifecycle_rule {
    condition {
      age = 90  # Delete old animations after 90 days
    }
    action {
      type = "Delete"
    }
  }
}

resource "google_storage_bucket" "forgepilot_site_templates" {
  name     = "${var.project_id}-site-templates"
  location = var.region
  
  uniform_bucket_level_access = true
  
  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD"]
    response_header = ["*"]
    max_age_seconds = 86400  # Cache templates for 24 hours
  }
}

# Make 3D assets publicly readable
resource "google_storage_bucket_iam_member" "public_read_3d_models" {
  bucket = google_storage_bucket.forgepilot_3d_models.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

resource "google_storage_bucket_iam_member" "public_read_3d_animations" {
  bucket = google_storage_bucket.forgepilot_3d_animations.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

resource "google_storage_bucket_iam_member" "public_read_templates" {
  bucket = google_storage_bucket.forgepilot_site_templates.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# Output bucket URLs
output "3d_models_bucket_url" {
  value = "https://storage.googleapis.com/${google_storage_bucket.forgepilot_3d_models.name}"
}

output "3d_animations_bucket_url" {
  value = "https://storage.googleapis.com/${google_storage_bucket.forgepilot_3d_animations.name}"
}

output "site_templates_bucket_url" {
  value = "https://storage.googleapis.com/${google_storage_bucket.forgepilot_site_templates.name}"
}