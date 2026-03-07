# Budget alert to keep costs under control
resource "google_billing_budget" "forgepilot_budget" {
  billing_account = var.billing_account_id
  display_name    = "ForgePilot AI Budget"
  
  budget_filter {
    projects = ["projects/${var.project_id}"]
  }
  
  amount {
    specified_amount {
      currency_code = "USD"
      units         = "50"  # $50/month budget
    }
  }
  
  threshold_rules {
    threshold_percent = 0.5  # Alert at 50%
  }
  
  threshold_rules {
    threshold_percent = 0.8  # Alert at 80%
  }
  
  threshold_rules {
    threshold_percent = 1.0  # Alert at 100%
  }
  
  all_updates_rule {
    monitoring_notification_channels = [
      google_monitoring_notification_channel.email.name
    ]
  }
}

# Email notification channel
resource "google_monitoring_notification_channel" "email" {
  display_name = "Email Notification"
  type         = "email"
  
  labels = {
    email_address = var.notification_email
  }
}