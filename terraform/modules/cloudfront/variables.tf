variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the CloudFront distribution"
  type        = string
}

variable "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  type        = string
}

variable "ssl_certificate_arn" {
  description = "ARN of the SSL certificate from ACM"
  type        = string
}