variable "neon_org_id" {
  description = "ID de la organizacion de Neon donde se crea el proyecto"
  type        = string
}

variable "backend_image_repo" {
  description = "Repositorio de la imagen del backend, SIN tag"
  type        = string
  default     = "ghcr.io/facundobruna/sistema-reservas-backend"
}

variable "frontend_image_repo" {
  description = "Repositorio de la imagen del frontend, SIN tag"
  type        = string
  default     = "ghcr.io/facundobruna/sistema-reservas-frontend"
}

variable "image_tag" {
  description = "Tag de las imagenes: el sha del commit de v7.0.0"
  type        = string
  default     = "sha-15502799f391c60d33bd4b03358ebc53f0af43ff"
}

variable "render_region" {
  description = "Region de Render, cerca de la base de Neon (us-east-2 es Ohio)"
  type        = string
  default     = "ohio"
}
