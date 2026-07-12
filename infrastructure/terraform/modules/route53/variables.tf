variable "domain_name" {
  type = string
}

variable "admin_domain_name" {
  type = string
}

variable "hosted_zone_id" {
  type = string
}

variable "cloudfront_domain_name" {
  type = string
}

variable "enable" {
  type    = bool
  default = true
}
