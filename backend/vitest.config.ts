import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["dotenv/config"],

    coverage: {
      provider: "v8",

      // QUÉ ENTRA EN LA CUENTA: la lógica de negocio de src/lib. No se mide src/db
      // (esquema, migraciones generadas y consultas contra Postgres) ni src/app
      // (route handlers: reciben el pedido, delegan y responden).
      include: ["src/lib/**/*.ts"],

      // QUÉ QUEDA AFUERA, y por qué. Cada línea de esta lista es una decisión que
      // se defiende en decisiones.md: excluir algo porque no lo testeé sería hacer
      // trampa; excluirlo porque el gate corre sin base de datos ni framework, no.
      exclude: [
        // Adaptadores a servicios de afuera (Resend, consola) y la fábrica que
        // elige uno según una variable de entorno. Son el borde, no la regla.
        "src/lib/email/**",
        "src/lib/billing/mercadopago.ts",

        // Dependen de cookies(), NextResponse y redirect() de Next: solo
        // existen dentro de un request real del framework.
        "src/lib/auth/session.ts",
        "src/lib/auth/diner-session.ts",
        "src/lib/auth/superadmin-session.ts",
        "src/lib/auth/require-staff.ts",
        "src/lib/auth/require-superadmin.ts",

        // Hablan con Postgres. Tienen lógica de verdad (best-fit, reintentos por
        // deadlock) y la cubre el test de integración, pero ese necesita una base
        // y el gate de cobertura corre sin ella. Se excluyen por eso, NO porque
        // no tengan reglas.
        "src/lib/availability/load-availability-input.ts",
        "src/lib/reservation/book-reservation.ts",
      ],

      reporter: [
        "text", // la tabla en el log del job
        "html", // el reporte navegable, para descargar
        "lcov", // formato estándar que leen otras herramientas
        "json-summary", // el total en JSON, para armar el resumen de la corrida
      ],
      reportsDirectory: "./coverage",

      // El umbral que rompe el build se define en el paso 5, con la medición en
      // la mano: un número elegido antes de medir es un número copiado.
    },
  },
});
