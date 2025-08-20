variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "aws_account_id" {
  description = "AWS account ID"
  type        = string
}

variable "private_web_subnet_id" {
  description = "ID of the private web subnet for frontend"
  type        = string
}

variable "private_app_subnet_id" {
  description = "ID of the private app subnet for backend"
  type        = string
}

variable "frontend_ecs_security_group_id" {
  description = "ID of the frontend ECS security group"
  type        = string
}

variable "backend_ecs_security_group_id" {
  description = "ID of the backend ECS security group"
  type        = string
}

variable "frontend_target_group_arn" {
  description = "ARN of the frontend target group"
  type        = string
}

variable "backend_target_group_arn" {
  description = "ARN of the backend target group"
  type        = string
}

# Environment Variables for Backend
variable "database_url" {
  description = "Database connection URL"
  type        = string
  sensitive   = true
}


variable "allowed_origins" {
  description = "Allowed CORS origins"
  type        = string
}

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



# Firebase Backend JSON
variable "firebase_service_account_json" {
  description = "Firebase service account JSON"
  type        = string
  sensitive   = true
}

# Frontend Environment Variables
variable "next_public_api_url" {
  description = "Frontend API URL"
  type        = string
}

variable "next_public_s3_bucket_url" {
  description = "S3 bucket URL for static files"
  type        = string
}

variable "firebase_api_key" {
  description = "Firebase API key"
  type        = string
}

variable "firebase_auth_domain" {
  description = "Firebase auth domain"
  type        = string
}

variable "firebase_project_id" {
  description = "Firebase project ID"
  type        = string
}

variable "firebase_storage_bucket" {
  description = "Firebase storage bucket"
  type        = string
  default     = "my-paw-mission.firebasestorage.app"
}

variable "firebase_messaging_sender_id" {
  description = "Firebase messaging sender ID"
  type        = string
}

variable "firebase_app_id" {
  description = "Firebase app ID"
  type        = string
}