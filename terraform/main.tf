terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Provider for us-east-1 (required for CloudFront certificates)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# Random string for unique resource naming
resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

# ECR repositories
module "ecr" {
  source = "./modules/ecr"
  
  project_name = var.project_name
  aws_region   = var.aws_region
}

# Network module
module "network" {
  source = "./modules/network"
  
  project_name      = var.project_name
  aws_region        = var.aws_region
  availability_zone = var.availability_zone
}

# Security module
module "security" {
  source = "./modules/security"
  
  project_name = var.project_name
  vpc_id       = module.network.vpc_id
}

# Route 53 module - disabled for CloudFront default domain setup
# module "route53" {
#   source = "./modules/route53"
#   
#   project_name         = var.project_name
#   domain_name          = var.domain_name
#   alb_dns_name         = module.alb.alb_dns_name
#   alb_zone_id          = module.alb.alb_zone_id
#   cloudfront_dns_name  = module.cloudfront.cloudfront_domain_name
#   cloudfront_zone_id   = module.cloudfront.cloudfront_hosted_zone_id
# }

# ALB module
module "alb" {
  source = "./modules/alb"
  
  project_name              = var.project_name
  vpc_id                   = module.network.vpc_id
  public_subnet_ids        = module.network.public_subnet_ids
  alb_security_group_id    = module.security.alb_security_group_id
  # domain_name and hosted_zone_id removed for CloudFront default domain setup
}

# ECS module
module "ecs" {
  source = "./modules/ecs"
  
  project_name                    = var.project_name
  aws_region                     = var.aws_region
  aws_account_id                 = var.aws_account_id
  private_web_subnet_id          = module.network.private_web_subnet_id
  private_app_subnet_id          = module.network.private_app_subnet_id
  frontend_ecs_security_group_id = module.security.frontend_ecs_security_group_id
  backend_ecs_security_group_id  = module.security.backend_ecs_security_group_id
  frontend_target_group_arn      = module.alb.frontend_target_group_arn
  backend_target_group_arn       = module.alb.backend_target_group_arn
  
  # Container Images from ECR
  frontend_image_uri             = module.ecr.frontend_image_uri
  backend_image_uri              = module.ecr.backend_image_uri
  
  # Environment Variables
  database_url                   = "postgresql://${var.database_username}:${var.database_password}@${module.rds.db_instance_endpoint}/${var.database_name}"
  allowed_origins                = var.allowed_origins
  openai_api_key                 = var.openai_api_key
  stripe_secret_key              = var.stripe_secret_key
  stripe_price_id                = var.stripe_price_id
  your_domain                    = var.your_domain
  next_public_api_url            = "https://${module.cloudfront.cloudfront_domain_name}/api"
  next_public_s3_bucket_url      = var.next_public_s3_bucket_url
  firebase_api_key               = var.firebase_api_key
  firebase_auth_domain           = var.firebase_auth_domain
  firebase_project_id            = var.firebase_project_id
  firebase_messaging_sender_id   = var.firebase_messaging_sender_id
  firebase_app_id                = var.firebase_app_id
  
  # Firebase Backend JSON
  firebase_service_account_json  = var.firebase_service_account
}

# RDS module
module "rds" {
  source = "./modules/rds"
  
  project_name           = var.project_name
  database_name          = var.database_name
  database_username      = var.database_username
  database_password      = var.database_password
  db_subnet_group_name   = module.network.db_subnet_group_name
  rds_security_group_id  = module.security.rds_security_group_id
}

# CloudFront module
module "cloudfront" {
  source = "./modules/cloudfront"
  
  providers = {
    aws.us_east_1 = aws.us_east_1
  }
  
  project_name         = var.project_name
  alb_dns_name         = module.alb.alb_dns_name
  # domain_name, ssl_certificate_arn, and hosted_zone_id removed for default CloudFront domain
}