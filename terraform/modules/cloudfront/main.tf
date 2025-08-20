# We don't need OAC for ALB origins (only for S3)
# OAC is used for S3 origins, not for custom origins like ALB

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name} CDN"
  default_root_object = "index.html"
  aliases             = [var.domain_name, "www.${var.domain_name}"]
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
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }

    # Add custom headers to identify CloudFront requests
    custom_header {
      name  = "X-CloudFront-Origin"
      value = var.project_name
    }
  }

  # Default cache behavior
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id       = "${var.project_name}-alb-origin"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    # Cache settings
    cache_policy_id = data.aws_cloudfront_cache_policy.caching_optimized.id
    
    # Forward all headers for dynamic content, but cache static assets
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

  # SSL Certificate from ACM
  viewer_certificate {
    acm_certificate_arn      = var.ssl_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
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

  # Ensure certificate is validated before creating distribution
  depends_on = [
    var.ssl_certificate_arn
  ]
}

# Managed Cache Policy for optimized caching
data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

# Managed Origin Request Policy for CORS
data "aws_cloudfront_origin_request_policy" "cors_s3_origin" {
  name = "Managed-CORS-S3Origin"
}