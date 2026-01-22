# Enable Firestore API
resource "google_project_service" "firestore_api" {
  project = var.project_id
  service = "firestore.googleapis.com"
  
  disable_dependent_services = true
}

# Firestore database
resource "google_firestore_database" "brandgenie_db" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.firestore_region
  type        = "FIRESTORE_NATIVE"
  
  depends_on = [google_project_service.firestore_api]
}

# Firestore indexes for performance
resource "google_firestore_index" "user_brands_index" {
  project    = var.project_id
  database   = google_firestore_database.brandgenie_db.name
  collection = "brands"
  
  fields {
    field_path = "userId"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}

resource "google_firestore_index" "brand_status_index" {
  project    = var.project_id
  database   = google_firestore_database.brandgenie_db.name
  collection = "brands"
  
  fields {
    field_path = "status"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}

# Service account for Firestore access
resource "google_service_account" "firestore_sa" {
  account_id   = "brandgenie-firestore"
  display_name = "BrandGenie Firestore Service Account"
  description  = "Service account for Firestore database access"
}

resource "google_project_iam_member" "firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.firestore_sa.email}"
}

# Generate service account key
resource "google_service_account_key" "firestore_key" {
  service_account_id = google_service_account.firestore_sa.name
}

# Store service account key in Secret Manager
resource "google_secret_manager_secret" "firestore_key" {
  secret_id = "firestore-service-account-key"
  
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "firestore_key_version" {
  secret      = google_secret_manager_secret.firestore_key.id
  secret_data = base64decode(google_service_account_key.firestore_key.private_key)
}