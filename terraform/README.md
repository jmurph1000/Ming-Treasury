# Treasury Payment Portal — Terraform

Deploys the Treasury Payment Portal as two ECS Fargate services (Next.js frontend + Express backend) behind a shared ALB with host-header routing.

## Architecture

```
Route53 (FQDN)
  └─► ALB (HTTPS:443, shared with other apps)
        ├─► /api/*  → Backend target group  → ECS Fargate (port 3001)
        └─► /*      → Frontend target group → ECS Fargate (port 3000)
```

Both services run on an existing ECS cluster and ALB. Host-header based listener rules ensure traffic is routed only when the request matches the configured DNS name. This allows multiple applications to share the same ALB without interference.

## Prerequisites

Before deploying, ensure the following resources already exist in your AWS account:

| Resource | Description |
|----------|-------------|
| **VPC** | With private subnets (one per AZ) for ECS tasks |
| **ECS Cluster** | Fargate-compatible cluster |
| **ALB** | With an HTTPS:443 listener and valid ACM certificate |
| **Security Groups** | One for ECS tasks, one for the ALB |
| **Route53 Hosted Zone** | For the application's DNS record |
| **S3 Bucket** | For Terraform remote state storage |
| **DynamoDB Table** | For Terraform state locking (optional but recommended) |

## Deployment

### 1. Configure variables

```bash
cd terraform/
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and fill in all values for your environment (VPC ID, subnet IDs, security group IDs, DNS, etc.).

### 2. Configure remote state

Edit the `backend "s3"` block in `main.tf` with your state bucket, key, region, and DynamoDB table.

### 3. Initialize and deploy

```bash
# Set AWS credentials (if using SSO)
export AWS_PROFILE=YourProfile

terraform init
terraform plan
terraform apply
```

### 4. Push Docker images

After Terraform creates the ECR repositories, build and push images:

```bash
# Login to ECR
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-west-2.amazonaws.com

# Build and push backend
docker buildx build --platform linux/amd64 -t <ACCOUNT_ID>.dkr.ecr.us-west-2.amazonaws.com/<app_name>-backend:latest -f backend/Dockerfile .
docker push <ACCOUNT_ID>.dkr.ecr.us-west-2.amazonaws.com/<app_name>-backend:latest

# Build and push frontend
docker buildx build --platform linux/amd64 -t <ACCOUNT_ID>.dkr.ecr.us-west-2.amazonaws.com/<app_name>-frontend:latest -f frontend/Dockerfile .
docker push <ACCOUNT_ID>.dkr.ecr.us-west-2.amazonaws.com/<app_name>-frontend:latest

# Force ECS to pick up new images
aws ecs update-service --cluster <cluster_name> --service <app_name>-backend-<env> --force-new-deployment
aws ecs update-service --cluster <cluster_name> --service <app_name>-frontend-<env> --force-new-deployment
```

Docker images **must** be built with `--platform linux/amd64` for Fargate compatibility.

## Resources Created

| Resource | File |
|----------|------|
| ECR repositories (backend + frontend) | `ecr.tf` |
| ECS task definitions and services | `ecs.tf` |
| CloudWatch log groups | `ecs.tf` |
| ALB target groups and listener rules | `alb.tf` |
| IAM roles (task execution + task) | `iam.tf` |
| Route53 DNS record | `dns.tf` |
| Security group ingress rules | `security.tf` |

## Variables

### Required (no defaults — must be set in terraform.tfvars)

| Variable | Description |
|----------|-------------|
| `aws_profile` | AWS CLI profile name |
| `vpc_id` | VPC ID for target groups and tasks |
| `private_subnet_ids` | Private subnet IDs for ECS tasks (one per AZ) |
| `ecs_security_group_id` | Security group ID for ECS tasks |
| `alb_security_group_id` | ALB security group ID (used as ingress source) |
| `dns_zone_name` | Route53 hosted zone name |
| `dns_name` | FQDN for the application |

### Optional (have sensible defaults)

| Variable | Default | Description |
|----------|---------|-------------|
| `aws_region` | `us-west-2` | AWS region |
| `app_name` | `treasury-portal` | App name for resource naming |
| `environment` | `sandbox` | Deployment environment |
| `ecs_cluster_name` | `eait-sandbox-ecs` | ECS cluster name |
| `alb_name` | `eait-sandbox-ecs-alb` | ALB name |
| `backend_listener_priority` | `100` | ALB rule priority for `/api/*` |
| `frontend_listener_priority` | `200` | ALB rule priority for catch-all |
| `backend_cpu` | `512` | Backend CPU units |
| `backend_memory` | `1024` | Backend memory (MiB) |
| `backend_desired_count` | `1` | Backend replicas |
| `backend_image_tag` | `latest` | Backend image tag |
| `frontend_cpu` | `256` | Frontend CPU units |
| `frontend_memory` | `512` | Frontend memory (MiB) |
| `frontend_desired_count` | `1` | Frontend replicas |
| `frontend_image_tag` | `latest` | Frontend image tag |

## Outputs

| Output | Description |
|--------|-------------|
| `ecr_backend_repository_url` | ECR repository URL for backend images |
| `ecr_frontend_repository_url` | ECR repository URL for frontend images |
| `ecs_backend_service_name` | ECS service name for the backend |
| `ecs_frontend_service_name` | ECS service name for the frontend |
| `alb_dns_name` | ALB DNS name |
| `app_url` | Full application URL (https://...) |

## ALB Listener Rule Priorities

When sharing an ALB across multiple apps, ensure listener rule priorities do not conflict. Each app needs unique priority numbers. Lower numbers are evaluated first.

| App | Backend priority | Frontend priority |
|-----|-----------------|-------------------|
| Treasury Portal | 100 | 200 |
| FinClose AI | (check FinClose config) | (check FinClose config) |

## Notes

- The S3 backend block in `main.tf` cannot use Terraform variables. Update it manually for each environment.
- If using AWS SSO, you may need to export `AWS_PROFILE` or explicit credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`) before running `terraform init`, as the S3 backend has limited SSO support in older Terraform versions.
- `terraform.tfvars` is gitignored and must be created locally.
