# SSM Parameters for Backend
resource "aws_ssm_parameter" "database_url" {
  name  = "/${var.project_name}/backend/database_url"
  type  = "SecureString"
  value = var.database_url
}


resource "aws_ssm_parameter" "allowed_origins" {
  name  = "/${var.project_name}/backend/allowed_origins"
  type  = "String"
  value = var.allowed_origins
}

resource "aws_ssm_parameter" "openai_api_key" {
  name  = "/${var.project_name}/backend/openai_api_key"
  type  = "SecureString"
  value = var.openai_api_key
}

resource "aws_ssm_parameter" "stripe_secret_key" {
  name  = "/${var.project_name}/backend/stripe_secret_key"
  type  = "SecureString"
  value = var.stripe_secret_key
}

resource "aws_ssm_parameter" "stripe_price_id" {
  name  = "/${var.project_name}/backend/stripe_price_id"
  type  = "String"
  value = var.stripe_price_id
}


# Firebase Backend Parameter - Complete Service Account JSON
resource "aws_ssm_parameter" "firebase_service_account" {
  name  = "/${var.project_name}/backend/firebase_service_account"
  type  = "SecureString"
  value = var.firebase_service_account_json
}

# Frontend SSM Parameters
resource "aws_ssm_parameter" "next_public_api_url" {
  name  = "/${var.project_name}/frontend/next_public_api_url"
  type  = "String"
  value = var.next_public_api_url
}

resource "aws_ssm_parameter" "next_public_firebase_api_key" {
  name  = "/${var.project_name}/frontend/next_public_firebase_api_key"
  type  = "String"
  value = var.firebase_api_key
}

resource "aws_ssm_parameter" "next_public_firebase_auth_domain" {
  name  = "/${var.project_name}/frontend/next_public_firebase_auth_domain"
  type  = "String"
  value = var.firebase_auth_domain
}

resource "aws_ssm_parameter" "next_public_firebase_project_id" {
  name  = "/${var.project_name}/frontend/next_public_firebase_project_id"
  type  = "String"
  value = var.firebase_project_id
}

resource "aws_ssm_parameter" "next_public_firebase_storage_bucket" {
  name  = "/${var.project_name}/frontend/next_public_firebase_storage_bucket"
  type  = "String"
  value = var.firebase_storage_bucket
}

resource "aws_ssm_parameter" "next_public_firebase_messaging_sender_id" {
  name  = "/${var.project_name}/frontend/next_public_firebase_messaging_sender_id"
  type  = "String"
  value = var.firebase_messaging_sender_id
}

resource "aws_ssm_parameter" "next_public_firebase_app_id" {
  name  = "/${var.project_name}/frontend/next_public_firebase_app_id"
  type  = "String"
  value = var.firebase_app_id
}

resource "aws_ssm_parameter" "next_public_s3_bucket_url" {
  name  = "/${var.project_name}/frontend/next_public_s3_bucket_url"
  type  = "String"
  value = var.next_public_s3_bucket_url
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${var.project_name}-cluster"
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/${var.project_name}-frontend"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-frontend-logs"
  }
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${var.project_name}-backend"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-backend-logs"
  }
}

# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.project_name}-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-ecs-task-execution-role"
  }
}

# IAM Role Policy Attachment for ECS Task Execution
resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Additional IAM Policy for SSM Parameter Store access
resource "aws_iam_role_policy" "ecs_task_execution_ssm" {
  name = "${var.project_name}-ecs-task-execution-ssm"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameters",
          "ssm:GetParameter",
          "ssm:GetParametersByPath"
        ]
        Resource = "arn:aws:ssm:${var.aws_region}:${var.aws_account_id}:parameter/${var.project_name}/*"
      }
    ]
  })
}

# Frontend Task Definition
resource "aws_ecs_task_definition" "frontend" {
  family                   = "${var.project_name}-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name  = "frontend"
      image = "${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project_name}-frontend:latest"
      
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = []

      secrets = [
        {
          name      = "NEXT_PUBLIC_FIREBASE_API_KEY"
          valueFrom = "arn:aws:ssm:${var.aws_region}:${var.aws_account_id}:parameter/${var.project_name}/frontend/next_public_firebase_api_key"
        },
        {
          name      = "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
          valueFrom = "arn:aws:ssm:${var.aws_region}:${var.aws_account_id}:parameter/${var.project_name}/frontend/next_public_firebase_auth_domain"
        },
        {
          name      = "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
          valueFrom = "arn:aws:ssm:${var.aws_region}:${var.aws_account_id}:parameter/${var.project_name}/frontend/next_public_firebase_project_id"
        },
        {
          name      = "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
          valueFrom = "arn:aws:ssm:${var.aws_region}:${var.aws_account_id}:parameter/${var.project_name}/frontend/next_public_firebase_storage_bucket"
        },
        {
          name      = "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
          valueFrom = "arn:aws:ssm:${var.aws_region}:${var.aws_account_id}:parameter/${var.project_name}/frontend/next_public_firebase_messaging_sender_id"
        },
        {
          name      = "NEXT_PUBLIC_FIREBASE_APP_ID"
          valueFrom = "arn:aws:ssm:${var.aws_region}:${var.aws_account_id}:parameter/${var.project_name}/frontend/next_public_firebase_app_id"
        },
        {
          name      = "NEXT_PUBLIC_S3_BUCKET_URL"
          valueFrom = "arn:aws:ssm:${var.aws_region}:${var.aws_account_id}:parameter/${var.project_name}/frontend/next_public_s3_bucket_url"
        },
        {
          name      = "NEXT_PUBLIC_API_URL"
          valueFrom = "arn:aws:ssm:${var.aws_region}:${var.aws_account_id}:parameter/${var.project_name}/frontend/next_public_api_url"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.frontend.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/ || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      essential = true
    }
  ])

  tags = {
    Name = "${var.project_name}-frontend-task"
  }
}

# Backend Task Definition
resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project_name}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name  = "backend"
      image = "${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project_name}-backend:latest"
      
      portMappings = [
        {
          containerPort = 8000
          protocol      = "tcp"
        }
      ]

      environment = []

      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = "arn:aws:ssm:${var.aws_region}:${var.aws_account_id}:parameter/${var.project_name}/backend/database_url"
        },
        {
          name      = "ALLOWED_ORIGINS"
          valueFrom = "arn:aws:ssm:${var.aws_region}:${var.aws_account_id}:parameter/${var.project_name}/backend/allowed_origins"
        },
        {
          name      = "FIREBASE_SERVICE_ACCOUNT"
          valueFrom = "arn:aws:ssm:${var.aws_region}:${var.aws_account_id}:parameter/${var.project_name}/backend/firebase_service_account"
        },
        {
          name      = "STRIPE_SECRET_KEY"
          valueFrom = "arn:aws:ssm:${var.aws_region}:${var.aws_account_id}:parameter/${var.project_name}/backend/stripe_secret_key"
        },
        {
          name      = "STRIPE_PRICE_ID"
          valueFrom = "arn:aws:ssm:${var.aws_region}:${var.aws_account_id}:parameter/${var.project_name}/backend/stripe_price_id"
        },
        {
          name      = "OPENAI_API_KEY"
          valueFrom = "arn:aws:ssm:${var.aws_region}:${var.aws_account_id}:parameter/${var.project_name}/backend/openai_api_key"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.backend.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      essential = true
    }
  ])

  tags = {
    Name = "${var.project_name}-backend-task"
  }
}

# Frontend ECS Service
resource "aws_ecs_service" "frontend" {
  name            = "${var.project_name}-frontend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [var.private_web_subnet_id]
    security_groups  = [var.frontend_ecs_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.frontend_target_group_arn
    container_name   = "frontend"
    container_port   = 3000
  }

  depends_on = [var.frontend_target_group_arn]

  tags = {
    Name = "${var.project_name}-frontend-service"
  }
}

# Backend ECS Service
resource "aws_ecs_service" "backend" {
  name            = "${var.project_name}-backend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [var.private_app_subnet_id]
    security_groups  = [var.backend_ecs_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.backend_target_group_arn
    container_name   = "backend"
    container_port   = 8000
  }

  depends_on = [var.backend_target_group_arn]

  tags = {
    Name = "${var.project_name}-backend-service"
  }
}