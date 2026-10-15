import { defineConfig } from "@playwright/test";

// Las dos suites del TP7 (integración y e2e) viven en ./e2e y comparten esta
// configuración. Cada job del pipeline corre la suya por nombre de archivo.
export default defineConfig({
  testDir: "./e2e",

  // Tope de CADA test. Generoso a propósito: QA es un servicio gratuito que se duerme a los
  // 15 minutos y tarda cerca de 1 minuto en despertar. El cold start se resuelve con
  // tiempos largos, nunca saltando el test.
  timeout: 60_000,
  // Tope de CADA aserción (el default es 5 s y no alcanza si el front recién despertó).
  expect: { timeout: 15_000 },

  // Un único reintento: absorbe una demora suelta de la red. Si un test pasa recién en el
  // reintento, Playwright lo marca "flaky" en el reporte aunque la corrida salga en verde.
  retries: 1,

  use: {
    // El FRONT. La API tiene su propia dirección (API_BASE_URL), que lee e2e/support.ts.
    // Ninguna URL está escrita en el código: se apunta a QA con variables de entorno.
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  reporter: [["html", { open: "never" }], ["list"]],
});
