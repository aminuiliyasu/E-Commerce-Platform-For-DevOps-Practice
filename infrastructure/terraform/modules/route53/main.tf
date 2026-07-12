resource "aws_route53_record" "storefront" {
  count = var.enable ? 1 : 0

  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = "Z2FDTNDATAQYW2"
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "admin" {
  count = var.enable && var.admin_domain_name != "" ? 1 : 0

  zone_id = var.hosted_zone_id
  name    = var.admin_domain_name
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = "Z2FDTNDATAQYW2"
    evaluate_target_health = false
  }
}
