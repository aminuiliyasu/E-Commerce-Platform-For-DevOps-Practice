output "storefront_fqdn" {
  value = var.enable ? aws_route53_record.storefront[0].fqdn : null
}

output "admin_fqdn" {
  value = var.enable && var.admin_domain_name != "" ? aws_route53_record.admin[0].fqdn : null
}
