variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "repository_names" {
  type    = list(string)
  default = ["ecommerce-api", "customer-web", "admin-web"]
}

variable "tags" {
  type    = map(string)
  default = {}
}
