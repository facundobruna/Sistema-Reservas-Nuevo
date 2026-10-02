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
      // En el pipeline el reporte se escribe en una carpeta montada desde afuera del
      // contenedor (COVERAGE_DIR); en tu máquina, en ./coverage.
      reportsDirectory: process.env.COVERAGE_DIR ?? "./coverage",

      // EL UMBRAL QUE ROMPE EL BUILD. Si la cobertura medida queda por debajo de
      // cualquiera de estos dos números, `vitest --coverage` termina con error y el
      // check del pipeline se pone en rojo.
      //
      // Es un PISO: la medición de hoy (60,41 % de líneas, 53,93 % de ramas) redondeada
      // hacia abajo. La regla es «nadie baja lo que ya tenemos». No es un objetivo
      // copiado de afuera: un 80 % rompería main hoy mismo. Se mide en las dos
      // métricas porque las líneas pueden mentir (una línea con un `?:` o un `??` cuenta
      // como cubierta aunque solo se recorra uno de sus dos caminos) y las ramas no.
      // Justificación completa y cuánto código sin test alcanza para frenar: decisiones.md.
      thresholds: {
        lines: 60,
        branches: 53,
      },
    },
  },
});
