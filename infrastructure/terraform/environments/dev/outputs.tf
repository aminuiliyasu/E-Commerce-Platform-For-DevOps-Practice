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

output "ecr_repository_urls" {
  value = module.ecr.repository_urls
}

output "db_endpoint" {
  value = module.rds.db_endpoint
}

output "redis_endpoint" {
  value = module.elasticache.redis_endpoint
}

output "mq_endpoint" {
  value = module.amazon_mq.mq_endpoint
}

output "assets_bucket_name" {
  value = module.s3.assets_bucket_name
}

output "eks_cluster_role_arn" {
  value = module.iam.eks_cluster_role_arn
}

output "eks_nodes_role_arn" {
  value = module.iam.eks_nodes_role_arn
}
