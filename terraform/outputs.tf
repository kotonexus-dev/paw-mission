# ALB DNS name
output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.alb.alb_dns_name
}

# Application HTTPS URL
output "application_url" {
  description = "HTTPS URL of the Application"
  value       = module.alb.alb_url
}

# Route 53 Name Servers
output "name_servers" {
  description = "Name servers for the domain"
  value       = module.route53.name_servers
}

# ALB Zone ID
output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = module.alb.alb_zone_id
}

# VPC ID
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.network.vpc_id
}

# Subnet IDs
output "public_subnet_id" {
  description = "ID of the public subnet"
  value       = module.network.public_subnet_id
}

output "private_web_subnet_id" {
  description = "ID of the private web subnet"
  value       = module.network.private_web_subnet_id
}

output "private_app_subnet_id" {
  description = "ID of the private app subnet"
  value       = module.network.private_app_subnet_id
}

output "private_db_subnet_id" {
  description = "ID of the private database subnet"
  value       = module.network.private_db_subnet_id
}

# RDS endpoint
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.db_instance_endpoint
  sensitive   = true
}

# ECS cluster name
output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.cluster_name
}

# ECS service names
output "frontend_service_name" {
  description = "Name of the frontend ECS service"
  value       = module.ecs.frontend_service_name
}

output "backend_service_name" {
  description = "Name of the backend ECS service"
  value       = module.ecs.backend_service_name
}

# Security group IDs
output "alb_security_group_id" {
  description = "ID of the ALB security group"
  value       = module.security.alb_security_group_id
}

output "frontend_ecs_security_group_id" {
  description = "ID of the frontend ECS security group"
  value       = module.security.frontend_ecs_security_group_id
}

output "backend_ecs_security_group_id" {
  description = "ID of the backend ECS security group"
  value       = module.security.backend_ecs_security_group_id
}

output "rds_security_group_id" {
  description = "ID of the RDS security group"
  value       = module.security.rds_security_group_id
}