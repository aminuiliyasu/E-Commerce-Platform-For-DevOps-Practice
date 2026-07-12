locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

resource "random_password" "mq" {
  length  = 24
  special = false
}

resource "aws_mq_broker" "main" {
  broker_name = "${local.name_prefix}-rabbitmq"

  engine_type        = "RabbitMQ"
  engine_version     = "3.13"
  host_instance_type = var.instance_type
  deployment_mode    = "SINGLE_INSTANCE"

  publicly_accessible = false
  subnet_ids          = [var.private_subnet_ids[0]]
  security_groups     = [var.security_group_id]

  user {
    username = "ecommerce"
    password = random_password.mq.result
  }

  logs {
    general = true
  }

  tags = merge(var.tags, { Name = "${local.name_prefix}-rabbitmq" })
}

resource "aws_secretsmanager_secret" "mq" {
  name = "${local.name_prefix}-mq-credentials"

  tags = merge(var.tags, { Name = "${local.name_prefix}-mq-credentials" })
}

resource "aws_secretsmanager_secret_version" "mq" {
  secret_id = aws_secretsmanager_secret.mq.id
  secret_string = jsonencode({
    username = "ecommerce"
    password = random_password.mq.result
    host     = aws_mq_broker.main.instances[0].endpoints[0]
  })
}
