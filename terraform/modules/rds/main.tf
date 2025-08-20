# RDS Parameter Group
resource "aws_db_parameter_group" "main" {
  family = "postgres15"
  name   = "${var.project_name}-postgres-params"

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  tags = {
    Name = "${var.project_name}-postgres-params"
  }
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-postgres"

  # Engine settings
  engine         = "postgres"
  engine_version = "15.12"
  instance_class = "db.t3.micro"

  # Storage settings
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp2"
  storage_encrypted     = true

  # Database settings
  db_name  = var.database_name
  username = var.database_username
  password = var.database_password
  port     = 5432

  # Network settings
  db_subnet_group_name   = var.db_subnet_group_name
  vpc_security_group_ids = [var.rds_security_group_id]
  publicly_accessible    = false
  multi_az              = false  # Free Tier requirement

  # Backup settings
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"

  # Monitoring and logging
  performance_insights_enabled = false
  monitoring_interval         = 0
  enabled_cloudwatch_logs_exports = ["postgresql"]

  # Parameter group
  parameter_group_name = aws_db_parameter_group.main.name

  # Deletion settings
  skip_final_snapshot       = true
  deletion_protection       = false
  delete_automated_backups  = true

  tags = {
    Name = "${var.project_name}-postgres"
  }
}