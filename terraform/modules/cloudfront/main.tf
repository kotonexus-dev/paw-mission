# Provider for us-east-1 (required for CloudFront certificates)
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
      configuration_aliases = [aws.us_east_1]
    }
  }
}

# Custom SSL certificates removed - using CloudFront default domain and certificate

# CloudFront Distribution - using default CloudFront domain
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name} CDN"
  # Remove default_root_object to prevent redirect issues with Next.js
  # aliases removed - using default xxxxx.cloudfront.net domain
  price_class         = "PriceClass_100"  # Use only North America and Europe (cheapest)

  # Origin configuration (ALB)
  origin {
    domain_name              = var.alb_dns_name
    origin_id                = "${var.project_name}-alb-origin"
    connection_attempts      = 3
    connection_timeout       = 10

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default cache behavior - no caching for dynamic Next.js content
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id       = "${var.project_name}-alb-origin"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    # Disable caching for dynamic content
    cache_policy_id = data.aws_cloudfront_cache_policy.caching_disabled.id
    
    # Forward all headers for dynamic content
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.cors_s3_origin.id
  }

  # Cache behavior for static assets (images, CSS, JS)
  ordered_cache_behavior {
    path_pattern           = "/images/*"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "${var.project_name}-alb-origin"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    # Use managed cache policy for static content (long TTL)
    cache_policy_id = data.aws_cloudfront_cache_policy.caching_optimized.id

    min_ttl     = 86400   # 1 day
    default_ttl = 604800  # 7 days  
    max_ttl     = 31536000 # 1 year
  }

  # Cache behavior for Next.js static files
  ordered_cache_behavior {
    path_pattern           = "/_next/static/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "${var.project_name}-alb-origin"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    cache_policy_id = data.aws_cloudfront_cache_policy.caching_optimized.id

    min_ttl     = 31536000  # 1 year for static files
    default_ttl = 31536000  # 1 year
    max_ttl     = 31536000  # 1 year
  }

  # Geographic restrictions (optional, but can help with costs)
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Default CloudFront SSL Certificate
  viewer_certificate {
    cloudfront_default_certificate = true
  }

  # Logging (optional, disabled to avoid costs)
  # logging_config {
  #   include_cookies = false
  #   bucket          = aws_s3_bucket.logs.bucket_domain_name
  #   prefix          = "cloudfront-logs/"
  # }

  tags = {
    Name = "${var.project_name}-cloudfront"
  }
}

# Managed Cache Policy for optimized caching
data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

# Managed Cache Policy for disabled caching
data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

# Managed Origin Request Policy for CORS
data "aws_cloudfront_origin_request_policy" "cors_s3_origin" {
  name = "Managed-CORS-S3Origin"
}