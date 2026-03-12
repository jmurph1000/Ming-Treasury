data "aws_route53_zone" "main" {
  name = var.dns_zone_name
}

resource "aws_route53_record" "treasury_portal" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.dns_name
  type    = "A"

  alias {
    name                   = data.aws_lb.main.dns_name
    zone_id                = data.aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
