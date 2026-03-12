resource "aws_vpc_security_group_ingress_rule" "ecs_backend_from_alb" {
  security_group_id            = var.ecs_security_group_id
  description                  = "${var.app_name} backend (port 3001) from ALB"
  from_port                    = 3001
  to_port                      = 3001
  ip_protocol                  = "tcp"
  referenced_security_group_id = var.alb_security_group_id
}

resource "aws_vpc_security_group_ingress_rule" "ecs_frontend_from_alb" {
  security_group_id            = var.ecs_security_group_id
  description                  = "${var.app_name} frontend (port 3000) from ALB"
  from_port                    = 3000
  to_port                      = 3000
  ip_protocol                  = "tcp"
  referenced_security_group_id = var.alb_security_group_id
}
