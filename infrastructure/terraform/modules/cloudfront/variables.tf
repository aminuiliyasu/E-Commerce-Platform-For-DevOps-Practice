variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "domain_name" {
  type = string
}

variable "admin_domain_name" {
  type = string
}

variable "certificate_arn" {
  type = string
}

variable "origin_domain_name" {
  type        = string
  description = "ALB or ingress hostname CloudFront forwards traffic to"
}

variable "assets_bucket_name" {
  type = string
}

variable "web_acl_arn" {
  type    = string
  default = ""
}

variable "enable" {
  type    = bool
  default = true
}

variable "tags" {
  type    = map(string)
  default = {}
}
