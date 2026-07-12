variable "project_name" {
  type = string
}

variable "environment" {
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
