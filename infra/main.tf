terraform {
  required_version = ">= 1.5"

  required_providers {
    neon = {
      source  = "kislerdm/neon"
      version = "0.18.0"
    }
    render = {
      source  = "render-oss/render"
      version = "1.9.1"
    }
    random = {
      source  = "hashicorp/random"
      version = "3.7.2"
    }
  }
}

# Sin credenciales acá: los providers leen NEON_API_KEY, RENDER_API_KEY
# y RENDER_OWNER_ID del entorno.
provider "neon" {}
provider "render" {}
provider "random" {}

resource "neon_project" "preprod" {
  name                      = "reservas-preprod"
  org_id                    = var.neon_org_id
  region_id                 = "aws-us-east-2"
  history_retention_seconds = 21600
}

resource "neon_role" "preprod" {
  project_id = neon_project.preprod.id
  branch_id  = neon_project.preprod.default_branch_id
  name       = "app_preprod"
}

resource "neon_database" "preprod" {
  project_id = neon_project.preprod.id
  branch_id  = neon_project.preprod.default_branch_id
  name       = "app_preprod"
  owner_name = neon_role.preprod.name
  # lifecycle {
   # prevent_destroy = true
  # }
}
