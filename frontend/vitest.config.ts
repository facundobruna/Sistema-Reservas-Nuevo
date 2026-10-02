import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // Sin DOM: se prueba lógica, no pantallas. Es lo que pide el enunciado y, además,
    // lo que corre rápido y sin depender de un navegador.
    environment: "node",
    include: ["tests/**/*.test.ts"],

    coverage: {
      provider: "v8",

      // QUÉ ENTRA EN LA CUENTA: la lógica de src/lib (cliente de la API, guardas de
      // sesión, validación de teléfono, interpolación de textos). NO se mide src/app
      // ni src/components: son pantallas y componentes de React, y probarlos exige un
      // DOM, que este práctico deja afuera. El número del frontend dice cuánta de la
      // LÓGICA está verificada, no cuánta de la interfaz.
      include: ["src/lib/**/*.ts"],

      // QUÉ QUEDA AFUERA, y por qué:
      exclude: [
        // Solo tipos de TypeScript: se borran al compilar, no hay código que ejecutar.
        "src/lib/api/types.ts",
        // Los textos de la interfaz en español e inglés: datos, sin ninguna decisión.
        "src/lib/i18n/dictionaries.ts",
        // El helper `cn` que genera shadcn: una línea que delega en dos librerías.
        "src/lib/utils.ts",
      ],

      reporter: ["text", "html", "lcov", "json-summary"],
      // En el pipeline el reporte se escribe en una carpeta montada desde afuera del
      // contenedor (COVERAGE_DIR); en tu máquina, en ./coverage.
      reportsDirectory: process.env.COVERAGE_DIR ?? "./coverage",

      // EL UMBRAL QUE ROMPE EL BUILD. Mismo criterio que el backend: un PISO igual a la
      // medición de hoy (96,55 % de líneas, 95,45 % de ramas) redondeada hacia abajo.
      // Ojo con la escala: son solo 29 líneas, así que UNA línea nueva sin test ya
      // baja el número por debajo del piso. Es a propósito: la lógica de src/lib es
      // chica y hoy está toda verificada. Justificación: decisiones.md.
      thresholds: {
        lines: 96,
        branches: 95,
      },
    },
  },
});
