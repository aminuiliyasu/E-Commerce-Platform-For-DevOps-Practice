variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "cluster_version" {
  type    = string
  default = "1.29"
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "cluster_role_arn" {
  type = string
}

variable "node_role_arn" {
  type = string
}

variable "node_security_group_id" {
  type = string
}

variable "node_instance_types" {
  type    = list(string)
  default = ["t3.medium"]
}

variable "desired_size" {
  type    = number
  default = 2
}

variable "min_size" {
  type    = number
  default = 1
}

variable "max_size" {
  type    = number
  default = 4
}

variable "tags" {
  type    = map(string)
  default = {}
}
