output "web_acl_arn" {
  value = var.enable ? aws_wafv2_web_acl.cloudfront[0].arn : null
}

output "web_acl_id" {
  value = var.enable ? aws_wafv2_web_acl.cloudfront[0].id : null
}
