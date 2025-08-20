variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "availability_zone" {
  description = "Primary availability zone"
  type        = string
}

variable "availability_zone_2" {
  description = "Secondary availability zone for ALB"
  type        = string
  default     = "ap-northeast-1c"
}