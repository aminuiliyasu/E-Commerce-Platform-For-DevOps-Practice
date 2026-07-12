output "distribution_id" {
  value = var.enable ? aws_cloudfront_distribution.main[0].id : null
}

output "distribution_arn" {
  value = var.enable ? aws_cloudfront_distribution.main[0].arn : null
}

output "distribution_domain_name" {
  value = var.enable ? aws_cloudfront_distribution.main[0].domain_name : null
}
