terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # ⬇ Update these values for your environment before running terraform init.
  backend "s3" {
    bucket         = "gusto-it-sandbox-terraform-state" # S3 bucket for Terraform state
    key            = "treasury-portal/terraform.tfstate" # State file path within the bucket
    region         = "us-west-2"                         # Region of the state bucket
    dynamodb_table = "terraform_locks"                   # DynamoDB table for state locking
  }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile

  default_tags {
    tags = {
      Project     = var.app_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

data "aws_ecs_cluster" "main" {
  cluster_name = var.ecs_cluster_name
}

data "aws_lb" "main" {
  name = var.alb_name
}

data "aws_lb_listener" "https" {
  load_balancer_arn = data.aws_lb.main.arn
  port              = 443
}

data "aws_caller_identity" "current" {}
