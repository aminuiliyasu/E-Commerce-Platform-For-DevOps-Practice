output "regional_certificate_arn" {
  value = var.enable ? aws_acm_certificate_validation.regional[0].certificate_arn : null
}

output "cloudfront_certificate_arn" {
  value = var.enable ? aws_acm_certificate_validation.cloudfront[0].certificate_arn : null
}
