terraform {
  backend "s3" {
    bucket         = "aminuiliyasu-terraform-state"
    key            = "ecommerce/dev/terraform.tfstate"
    region         = "eu-central-1"
    dynamodb_table = "terraform-state-lock"
    encrypt        = true
  }
}