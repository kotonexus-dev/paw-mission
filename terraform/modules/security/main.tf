# ALB Security Group
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = var.vpc_id

  # HTTP inbound from anywhere
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP from anywhere"
  }

  # HTTPS inbound from anywhere
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from anywhere"
  }

  # All outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = {
    Name = "${var.project_name}-alb-sg"
  }
}

# Frontend ECS Security Group
resource "aws_security_group" "frontend_ecs" {
  name        = "${var.project_name}-frontend-ecs-sg"
  description = "Security group for Frontend ECS"
  vpc_id      = var.vpc_id

  # HTTP from ALB
  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "HTTP from ALB"
  }

  # All outbound traffic (for package downloads, API calls)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = {
    Name = "${var.project_name}-frontend-ecs-sg"
  }
}

# Backend ECS Security Group
resource "aws_security_group" "backend_ecs" {
  name        = "${var.project_name}-backend-ecs-sg"
  description = "Security group for Backend ECS"
  vpc_id      = var.vpc_id

  # HTTP from Frontend ECS
  ingress {
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.frontend_ecs.id]
    description     = "HTTP from Frontend ECS"
  }

  # HTTP from ALB (direct API access)
  ingress {
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "HTTP from ALB for direct API access"
  }

  # All outbound traffic (for external API calls, package downloads)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = {
    Name = "${var.project_name}-backend-ecs-sg"
  }
}

# RDS Security Group
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = var.vpc_id

  # PostgreSQL from Backend ECS only
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.backend_ecs.id]
    description     = "PostgreSQL from Backend ECS"
  }

  # No outbound rules needed (RDS doesn't initiate connections)

  tags = {
    Name = "${var.project_name}-rds-sg"
  }
}