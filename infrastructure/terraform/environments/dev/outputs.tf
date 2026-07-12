output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

output "alb_security_group_id" {
  value = module.security_groups.alb_security_group_id
}

output "eks_nodes_security_group_id" {
  value = module.security_groups.eks_nodes_security_group_id
}
