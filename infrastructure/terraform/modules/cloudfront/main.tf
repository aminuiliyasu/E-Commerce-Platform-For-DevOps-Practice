locals {
  name_prefix = "${var.project_name}-${var.environment}"
  aliases     = compact([var.domain_name, var.admin_domain_name])
}

resource "aws_cloudfront_origin_access_control" "assets" {
  count = var.enable ? 1 : 0

  name                              = "${local.name_prefix}-assets-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "main" {
  count = var.enable ? 1 : 0

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${local.name_prefix} storefront CDN"
  default_root_object = "index.html"
  aliases             = local.aliases
  web_acl_id          = var.web_acl_arn != "" ? var.web_acl_arn : null

  origin {
    domain_name = var.origin_domain_name
    origin_id   = "alb"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols     = ["TLSv1.2"]
    }
  }

  origin {
    domain_name              = "${var.assets_bucket_name}.s3.${data.aws_region.current.name}.amazonaws.com"
    origin_id                = "assets"
    origin_access_control_id = aws_cloudfront_origin_access_control.assets[0].id
  }

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "alb"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Host", "Origin"]

      cookies {
        forward = "all"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  ordered_cache_behavior {
    path_pattern           = "/assets/*"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "assets"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = merge(var.tags, { Name = "${local.name_prefix}-cdn" })
}

data "aws_region" "current" {}

resource "aws_s3_bucket_policy" "assets_cdn" {
  count = var.enable ? 1 : 0

  bucket = var.assets_bucket_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowCloudFrontServicePrincipal"
      Effect = "Allow"
      Principal = {
        Service = "cloudfront.amazonaws.com"
      }
      Action   = "s3:GetObject"
      Resource = "arn:aws:s3:::${var.assets_bucket_name}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.main[0].arn
        }
      }
    }]
  })
}
