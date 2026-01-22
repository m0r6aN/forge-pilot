# Global IP address for load balancer
resource "google_compute_global_address" "brandgenie_ip" {
  name = "brandgenie-global-ip"
}

# SSL certificate for HTTPS
resource "google_compute_managed_ssl_certificate" "brandgenie_ssl" {
  name = "brandgenie-ssl-cert"
  
  managed {
    domains = [var.domain_name, "www.${var.domain_name}"]
  }
}

# Backend service for Cloud Run
resource "google_compute_backend_service" "brandgenie_backend" {
  name        = "brandgenie-backend"
  description = "Backend service for BrandGenie AI"
  
  backend {
    group = google_compute_region_network_endpoint_group.cloudrun_neg.id
  }
  
  cdn_policy {
    cache_mode                   = "CACHE_ALL_STATIC"
    signed_url_cache_max_age_sec = 7200
    default_ttl                  = 3600
    max_ttl                      = 86400
    negative_caching             = true
    
    cache_key_policy {
      include_host         = true
      include_protocol     = true
      include_query_string = false
    }
  }
  
  log_config {
    enable      = true
    sample_rate = 1.0
  }
}

# Network endpoint group for Cloud Run
resource "google_compute_region_network_endpoint_group" "cloudrun_neg" {
  name                  = "cloudrun-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  
  cloud_run {
    service = google_cloud_run_service.brandgenie_api.name
  }
}

# URL map for routing
resource "google_compute_url_map" "brandgenie_urlmap" {
  name            = "brandgenie-urlmap"
  description     = "URL map for BrandGenie AI"
  default_service = google_compute_backend_service.brandgenie_backend.id
  
  host_rule {
    hosts        = [var.domain_name, "www.${var.domain_name}"]
    path_matcher = "allpaths"
  }
  
  path_matcher {
    name            = "allpaths"
    default_service = google_compute_backend_service.brandgenie_backend.id
    
    # Static assets from Cloud Storage
    path_rule {
      paths   = ["/static/*", "/_next/static/*"]
      service = google_compute_backend_bucket.static_backend.id
    }
    
    # API routes to Cloud Run
    path_rule {
      paths   = ["/api/*"]
      service = google_compute_backend_service.brandgenie_backend.id
    }
  }
}

# Backend bucket for static assets
resource "google_compute_backend_bucket" "static_backend" {
  name        = "brandgenie-static-backend"
  description = "Backend bucket for static assets"
  bucket_name = google_storage_bucket.static_assets.name
  enable_cdn  = true
  
  cdn_policy {
    cache_mode                   = "CACHE_ALL_STATIC"
    signed_url_cache_max_age_sec = 7200
    default_ttl                  = 86400
    max_ttl                      = 31536000  # 1 year
    negative_caching             = true
  }
}

# HTTPS proxy
resource "google_compute_target_https_proxy" "brandgenie_https_proxy" {
  name             = "brandgenie-https-proxy"
  url_map          = google_compute_url_map.brandgenie_urlmap.id
  ssl_certificates = [google_compute_managed_ssl_certificate.brandgenie_ssl.id]
}

# HTTP proxy (for redirect to HTTPS)
resource "google_compute_target_http_proxy" "brandgenie_http_proxy" {
  name    = "brandgenie-http-proxy"
  url_map = google_compute_url_map.https_redirect.id
}

# HTTPS redirect URL map
resource "google_compute_url_map" "https_redirect" {
  name = "brandgenie-https-redirect"
  
  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}

# Global forwarding rules
resource "google_compute_global_forwarding_rule" "brandgenie_https" {
  name       = "brandgenie-https-forwarding-rule"
  target     = google_compute_target_https_proxy.brandgenie_https_proxy.id
  port_range = "443"
  ip_address = google_compute_global_address.brandgenie_ip.address
}

resource "google_compute_global_forwarding_rule" "brandgenie_http" {
  name       = "brandgenie-http-forwarding-rule"
  target     = google_compute_target_http_proxy.brandgenie_http_proxy.id
  port_range = "80"
  ip_address = google_compute_global_address.brandgenie_ip.address
}

# Output the IP address for DNS configuration
output "load_balancer_ip" {
  value       = google_compute_global_address.brandgenie_ip.address
  description = "IP address of the load balancer"
}