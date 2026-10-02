// Imprime la cobertura como una tabla en Markdown, lista para pegarse en el
// resumen de la corrida ($GITHUB_STEP_SUMMARY).
//
// Uso: node .github/scripts/coverage-summary.mjs "<título>" <coverage-summary.json>
//
// Lee el reporte `json-summary` que genera vitest (ver vitest.config.ts) y no
// recalcula nada: muestra lo que midió la herramienta. Sale con código 1 si el
// reporte no existe o está vacío, porque un resumen que "no encuentra nada" y
// aun así deja el job en verde sería exactamente la falla silenciosa que el
// umbral existe para evitar.
import { readFileSync } from "node:fs";

const [titulo, ruta] = process.argv.slice(2);
if (!titulo || !ruta) {
  console.error('Uso: coverage-summary.mjs "<título>" <coverage-summary.json>');
  process.exit(1);
}

let total;
try {
  total = JSON.parse(readFileSync(ruta, "utf8")).total;
} catch (error) {
  console.error(`No se pudo leer el reporte de cobertura en ${ruta}: ${error.message}`);
  console.error("Si un test falló, vitest no genera el reporte: mirá primero el paso de los tests.");
  process.exit(1);
}

if (!total || total.lines.total === 0) {
  console.error(`El reporte ${ruta} no midió ninguna línea: la cobertura está vacía.`);
  process.exit(1);
}

const fila = (nombre, m) => `| ${nombre} | ${m.pct}% | ${m.covered} / ${m.total} |`;

console.log(`### Cobertura — ${titulo}`);
console.log("");
console.log("| Métrica | Cobertura | Cubiertas / Totales |");
console.log("|---|---|---|");
console.log(fila("Líneas", total.lines));
console.log(fila("Ramas", total.branches));
console.log(fila("Funciones", total.functions));
console.log(fila("Sentencias", total.statements));
console.log("");
console.log("El reporte completo (HTML, lcov y JSON) está en los artefactos de la corrida.");
