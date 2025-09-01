# Frontend ECR Repository outputs
output "frontend_repository_url" {
  description = "URL of the frontend ECR repository"
  value       = aws_ecr_repository.frontend.repository_url
}

output "frontend_repository_name" {
  description = "Name of the frontend ECR repository"
  value       = aws_ecr_repository.frontend.name
}

output "frontend_repository_arn" {
  description = "ARN of the frontend ECR repository"
  value       = aws_ecr_repository.frontend.arn
}

# Backend ECR Repository outputs
output "backend_repository_url" {
  description = "URL of the backend ECR repository"
  value       = aws_ecr_repository.backend.repository_url
}

output "backend_repository_name" {
  description = "Name of the backend ECR repository"
  value       = aws_ecr_repository.backend.name
}

output "backend_repository_arn" {
  description = "ARN of the backend ECR repository"
  value       = aws_ecr_repository.backend.arn
}

# Convenient image URI outputs for ECS task definitions
output "frontend_image_uri" {
  description = "Frontend image URI for ECS task definition"
  value       = "${aws_ecr_repository.frontend.repository_url}:latest"
}

output "backend_image_uri" {
  description = "Backend image URI for ECS task definition"
  value       = "${aws_ecr_repository.backend.repository_url}:latest"
}