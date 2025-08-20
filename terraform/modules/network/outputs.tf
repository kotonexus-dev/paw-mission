output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "ID of the public subnet"
  value       = aws_subnet.public.id
}

output "public_subnet_2_id" {
  description = "ID of the second public subnet"
  value       = aws_subnet.public_2.id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = [aws_subnet.public.id, aws_subnet.public_2.id]
}

output "private_web_subnet_id" {
  description = "ID of the private web subnet"
  value       = aws_subnet.private_web.id
}

output "private_app_subnet_id" {
  description = "ID of the private app subnet"
  value       = aws_subnet.private_app.id
}

output "private_db_subnet_id" {
  description = "ID of the private database subnet"
  value       = aws_subnet.private_db.id
}

output "db_subnet_group_name" {
  description = "Name of the DB subnet group"
  value       = aws_db_subnet_group.main.name
}