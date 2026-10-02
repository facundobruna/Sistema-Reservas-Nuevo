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
      reportsDirectory: "./coverage",

      // El umbral que rompe el build se define con la medición real en la mano.
    },
  },
});
