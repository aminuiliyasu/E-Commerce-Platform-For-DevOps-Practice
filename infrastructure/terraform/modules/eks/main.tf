locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

resource "aws_eks_cluster" "main" {
  name     = "${local.name_prefix}-cluster"
  role_arn = var.cluster_role_arn
  version  = var.cluster_version

  vpc_config {
    subnet_ids              = var.private_subnet_ids
    endpoint_private_access = true
    endpoint_public_access  = true
  }

  tags = merge(var.tags, { Name = "${local.name_prefix}-cluster" })
}

resource "aws_launch_template" "nodes" {
  name_prefix   = "${local.name_prefix}-nodes-"
  image_id      = data.aws_ssm_parameter.eks_ami.value
  instance_type = var.node_instance_types[0]

  vpc_security_group_ids = [var.node_security_group_id]

  tag_specifications {
    resource_type = "instance"
    tags          = merge(var.tags, { Name = "${local.name_prefix}-node" })
  }
}

data "aws_ssm_parameter" "eks_ami" {
  name = "/aws/service/eks/optimized-ami/${var.cluster_version}/amazon-linux-2/recommended/image_id"
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${local.name_prefix}-nodes"
  node_role_arn   = var.node_role_arn
  subnet_ids      = var.private_subnet_ids

  scaling_config {
    desired_size = var.desired_size
    min_size     = var.min_size
    max_size     = var.max_size
  }

  launch_template {
    id      = aws_launch_template.nodes.id
    version = aws_launch_template.nodes.latest_version
  }

  capacity_type = "ON_DEMAND"

  tags = merge(var.tags, { Name = "${local.name_prefix}-nodes" })

  depends_on = [aws_eks_cluster.main]
}

data "tls_certificate" "eks" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer

  tags = merge(var.tags, { Name = "${local.name_prefix}-oidc" })
}
