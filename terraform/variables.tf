# ===========================================================================
# General
# ===========================================================================

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-west-2"
}

variable "aws_profile" {
  description = "AWS CLI profile name (must be configured with credentials/SSO)"
  type        = string
}

variable "app_name" {
  description = "Application name used for resource naming (e.g. ECR repos, ECS services, IAM roles)"
  type        = string
  default     = "treasury-portal"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "sandbox"
}

# ===========================================================================
# Networking
# ===========================================================================

variable "vpc_id" {
  description = "VPC ID where ECS tasks and target groups are deployed"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for ECS task networking (one per AZ)"
  type        = list(string)
}

variable "ecs_cluster_name" {
  description = "Name of the existing ECS cluster to deploy into"
  type        = string
  default     = "eait-sandbox-ecs"
}

variable "alb_name" {
  description = "Name of the existing ALB to attach listener rules to"
  type        = string
  default     = "eait-sandbox-ecs-alb"
}

variable "ecs_security_group_id" {
  description = "Existing security group ID for ECS tasks"
  type        = string
}

variable "alb_security_group_id" {
  description = "Security group ID of the ALB (used as source for ECS ingress rules)"
  type        = string
}

# ===========================================================================
# DNS
# ===========================================================================

variable "dns_zone_name" {
  description = "Route53 hosted zone name (e.g. sandbox.it-services.gustocorp.com)"
  type        = string
}

variable "dns_name" {
  description = "FQDN for the treasury portal (e.g. treasury-portal.sandbox.it-services.gustocorp.com)"
  type        = string
}

# ===========================================================================
# ALB listener rules
# ===========================================================================

variable "backend_listener_priority" {
  description = "ALB listener rule priority for the backend (/api/* path)"
  type        = number
  default     = 100
}

variable "frontend_listener_priority" {
  description = "ALB listener rule priority for the frontend (catch-all)"
  type        = number
  default     = 200
}

# ===========================================================================
# Container config — Backend
# ===========================================================================

variable "backend_cpu" {
  description = "CPU units for the backend task (1 vCPU = 1024)"
  type        = number
  default     = 512
}

variable "backend_memory" {
  description = "Memory (MiB) for the backend task"
  type        = number
  default     = 1024
}

variable "backend_desired_count" {
  description = "Number of backend task replicas"
  type        = number
  default     = 1
}

variable "backend_image_tag" {
  description = "Docker image tag for the backend container"
  type        = string
  default     = "latest"
}

# ===========================================================================
# Container config — Frontend
# ===========================================================================

variable "frontend_cpu" {
  description = "CPU units for the frontend task (1 vCPU = 1024)"
  type        = number
  default     = 256
}

variable "frontend_memory" {
  description = "Memory (MiB) for the frontend task"
  type        = number
  default     = 512
}

variable "frontend_desired_count" {
  description = "Number of frontend task replicas"
  type        = number
  default     = 1
}

variable "frontend_image_tag" {
  description = "Docker image tag for the frontend container"
  type        = string
  default     = "latest"
}
