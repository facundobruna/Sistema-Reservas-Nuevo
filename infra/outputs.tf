output "db_host" {
  value = neon_project.preprod.database_host
}

output "db_name" {
  value = neon_database.preprod.name
}

output "db_role" {
  value = neon_role.preprod.name
}

output "api_url" {
  value = render_web_service.api.url
}

output "front_url" {
  value = render_web_service.front.url
}
