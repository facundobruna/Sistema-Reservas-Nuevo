# Clave para firmar tokens: la genera Terraform, no la escribe nadie.
resource "random_password" "auth_secret" {
  length  = 48
  special = false
}

locals {
  # Cadena de conexión DERIVADA de los recursos de Neon, no copiada.
  database_url = "postgresql://${neon_role.preprod.name}:${urlencode(neon_role.preprod.password)}@${neon_project.preprod.database_host}/${neon_database.preprod.name}?sslmode=require"
}

resource "render_web_service" "api" {
  name   = "reservas-api-preprod"
  plan   = "free"
  region = var.render_region

  runtime_source = {
    image = {
      image_url = var.backend_image_repo
      tag       = var.image_tag
    }
  }

  env_vars = {
    DATABASE_URL = { value = local.database_url }
    AUTH_SECRET  = { value = random_password.auth_secret.result }
  }
}

resource "render_web_service" "front" {
  name   = "reservas-front-preprod"
  plan   = "free"
  region = var.render_region

  runtime_source = {
    image = {
      image_url = var.frontend_image_repo
      tag       = var.image_tag
    }
  }

  env_vars = {
    # URL del backend DERIVADA de la API recién creada, sin barra final.
    BACKEND_INTERNAL_URL = { value = trimsuffix(render_web_service.api.url, "/") }
  }
}
