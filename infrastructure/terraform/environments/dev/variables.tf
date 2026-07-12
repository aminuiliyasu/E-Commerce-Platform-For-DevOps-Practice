variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  type = list(string)
}

variable "private_subnet_cidrs" {
  type = list(string)
}

variable "availability_zones" {
  type = list(string)
}

variable "rds_multi_az" {
  type    = bool
  default = false
}

variable "eks_desired_size" {
  type    = number
  default = 1
}

variable "eks_min_size" {
  type    = number
  default = 1
}

variable "eks_max_size" {
  type    = number
  default = 3
}

variable "enable_edge" {
  type        = bool
  default     = false
  description = "Enable ACM, CloudFront, WAF and Route53 edge stack"
}

variable "hosted_zone_name" {
  type    = string
  default = "aminuiliyasu.com."
}

variable "domain_name" {
  type    = string
  default = "ecommerce.aminuiliyasu.com"
}

variable "admin_domain_name" {
  type    = string
  default = "admin.ecommerce.aminuiliyasu.com"
}

variable "origin_domain_name" {
  type        = string
  default     = ""
  description = "ALB hostname for CloudFront origin (set after ingress is live)"
}
