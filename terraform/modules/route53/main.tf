# Route 53 Hosted Zone
resource "aws_route53_zone" "main" {
  name = var.domain_name

  tags = {
    Name = "${var.project_name}-hosted-zone"
  }
}

# A record pointing to CloudFront (if provided), otherwise ALB
resource "aws_route53_record" "main" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.cloudfront_dns_name != "" ? var.cloudfront_dns_name : var.alb_dns_name
    zone_id                = var.cloudfront_dns_name != "" ? var.cloudfront_zone_id : var.alb_zone_id
    evaluate_target_health = false  # CloudFront doesn't support health checks
  }
}

# WWW subdomain pointing to CloudFront (if provided), otherwise ALB
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.cloudfront_dns_name != "" ? var.cloudfront_dns_name : var.alb_dns_name
    zone_id                = var.cloudfront_dns_name != "" ? var.cloudfront_zone_id : var.alb_zone_id
    evaluate_target_health = false  # CloudFront doesn't support health checks
  }
}