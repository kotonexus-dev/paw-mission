output "alb_security_group_id" {
  description = "ID of the ALB security group"
  value       = aws_security_group.alb.id
}

output "frontend_ecs_security_group_id" {
  description = "ID of the frontend ECS security group"
  value       = aws_security_group.frontend_ecs.id
}

output "backend_ecs_security_group_id" {
  description = "ID of the backend ECS security group"
  value       = aws_security_group.backend_ecs.id
}

output "rds_security_group_id" {
  description = "ID of the RDS security group"
  value       = aws_security_group.rds.id
}