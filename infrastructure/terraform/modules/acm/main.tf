locals {
  name_prefix = "${var.project_name}-${var.environment}"
  domains     = compact([var.domain_name, var.admin_domain_name])
}

resource "aws_acm_certificate" "regional" {
  count = var.enable ? 1 : 0

  domain_name               = var.domain_name
  subject_alternative_names = var.admin_domain_name != "" ? [var.admin_domain_name] : []
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(var.tags, { Name = "${local.name_prefix}-regional-cert" })
}

resource "aws_route53_record" "regional_validation" {
  for_each = var.enable ? {
    for dvo in aws_acm_certificate.regional[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  zone_id = var.hosted_zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "regional" {
  count = var.enable ? 1 : 0

  certificate_arn         = aws_acm_certificate.regional[0].arn
  validation_record_fqdns = [for record in aws_route53_record.regional_validation : record.fqdn]
}

resource "aws_acm_certificate" "cloudfront" {
  provider = aws.us_east_1
  count    = var.enable ? 1 : 0

  domain_name               = var.domain_name
  subject_alternative_names = var.admin_domain_name != "" ? [var.admin_domain_name] : []
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(var.tags, { Name = "${local.name_prefix}-cloudfront-cert" })
}

resource "aws_route53_record" "cloudfront_validation" {
  for_each = var.enable ? {
    for dvo in aws_acm_certificate.cloudfront[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  zone_id = var.hosted_zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "cloudfront" {
  provider = aws.us_east_1
  count    = var.enable ? 1 : 0

  certificate_arn         = aws_acm_certificate.cloudfront[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cloudfront_validation : record.fqdn]
}
