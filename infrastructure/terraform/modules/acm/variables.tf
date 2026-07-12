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

variable "hosted_zone_id" {
  type = string
}

variable "enable" {
  type    = bool
  default = true
}

variable "tags" {
  type    = map(string)
  default = {}
}
