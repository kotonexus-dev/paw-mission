# Project configuration
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "paw-mission"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "availability_zone" {
  description = "Availability zone"
  type        = string
  default     = "ap-northeast-1a"
}

# Database configuration
variable "database_name" {
  description = "Database name"
  type        = string
}

variable "database_username" {
  description = "Database username"
  type        = string
}

variable "database_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

# AWS Account ID
variable "aws_account_id" {
  description = "AWS Account ID"
  type        = string
}

# Container images
variable "frontend_image_uri" {
  description = "Frontend container image URI"
  type        = string
}

variable "backend_image_uri" {
  description = "Backend container image URI"
  type        = string
}

# External API keys
variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  sensitive   = true
}

variable "stripe_secret_key" {
  description = "Stripe secret key"
  type        = string
  sensitive   = true
}

variable "stripe_price_id" {
  description = "Stripe price ID"
  type        = string
}

# Firebase configuration
variable "firebase_api_key" {
  description = "Firebase API key"
  type        = string
  sensitive   = true
}

variable "firebase_auth_domain" {
  description = "Firebase auth domain"
  type        = string
}

variable "firebase_project_id" {
  description = "Firebase project ID"
  type        = string
}

variable "firebase_messaging_sender_id" {
  description = "Firebase messaging sender ID"
  type        = string
}

variable "firebase_app_id" {
  description = "Firebase app ID"
  type        = string
}

variable "firebase_service_account" {
  description = "Firebase service account JSON"
  type        = string
  sensitive   = true
}

# Domain configuration
variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "paw-mission.com"
}

variable "your_domain" {
  description = "Your domain URL"
  type        = string
}

variable "allowed_origins" {
  description = "Allowed CORS origins"
  type        = string
}

# Frontend configuration
variable "next_public_s3_bucket_url" {
  description = "S3 bucket URL for static files"
  type        = string
}

variable "next_public_api_url" {
  description = "API URL for frontend"
  type        = string
}