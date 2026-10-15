import { expect, test, type Page } from "@playwright/test";
import { SLUG, proximoDiaAbierto, proximoLunes, telefonoLocalUnico } from "./support";

// SUITE E2E (TP7). Un navegador de verdad usa el front de QA como lo haría un comensal.
// Sin mocks: el navegador le pega al front, el front a la API y la API a la base.

// Los pasos del asistente, hasta ver la lista de horarios del día elegido.
async function hastaLosHorarios(page: Page, fecha: string) {
  await page.goto(`/r/${SLUG}`);
  await page.getByRole("button", { name: "2", exact: true }).click(); // ¿Cuántos son?
  await page.getByLabel("Elegir otra fecha").fill(fecha); //             ¿Qué día?
  await expect(page.getByText("¿A qué hora?")).toBeVisible();
}

const horarios = (page: Page) => page.getByRole("button", { name: /^\d{2}:\d{2}$/ });

// Elige el primer horario y la zona, y deja el formulario de datos delante.
async function hastaElFormulario(page: Page, fecha: string) {
  await hastaLosHorarios(page, fecha);
  await horarios(page).first().click();
  await page.getByRole("button", { name: "Salón principal" }).click(); // ¿Dónde preferís sentarte?
  await expect(page.getByText("Tus datos")).toBeVisible();
}

test("reservar por el asistente, verla en Mis reservas y cancelarla", async ({ page }) => {
  await hastaElFormulario(page, proximoDiaAbierto());
  await page.getByLabel("Nombre").fill(`e2e ${Date.now()}`);
  await page.getByLabel("Teléfono").fill(telefonoLocalUnico()); // comensal único: /me lista solo SU reserva
  await page.getByRole("button", { name: "Confirmar reserva" }).click();
  await expect(page.getByText("¡Reserva confirmada!")).toBeVisible();

  // La reserva existe de verdad: aparece en "Tus reservas" (la sesión de comensal viaja en la cookie).
  await page.goto("/me");
  await expect(page.getByText("Fuego Norte")).toBeVisible();
  await expect(page.getByText("Confirmada", { exact: true })).toBeVisible();

  // Limpieza, comprobada: se cancela y pasa a "Cancelada", sin botón para seguir gestionándola.
  await page.getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByText("Cancelada", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancelar" })).toHaveCount(0);
});

test("un teléfono inválido muestra el error y no crea ninguna reserva", async ({ page }) => {
  await hastaElFormulario(page, proximoDiaAbierto());
  await page.getByLabel("Nombre").fill(`e2e invalido ${Date.now()}`);
  await page.getByLabel("Teléfono").fill("123"); // demasiado corto: la API lo rechaza con 400
  await page.getByRole("button", { name: "Confirmar reserva" }).click();

  // El usuario ve el error (Next también mete un role="alert" vacío para anunciar rutas: se filtra por texto)…
  await expect(page.getByRole("alert").filter({ hasText: "Algo no salió bien" })).toBeVisible();
  await expect(page.getByText("¡Reserva confirmada!")).toHaveCount(0);

  // …y no se creó nada: ni reserva ni sesión de comensal, así que "Tus reservas" pide ingresar.
  await page.goto("/me");
  await expect(page.getByText("Ingresá tu teléfono para ver tus reservas")).toBeVisible();
});

test("elegir día y horario: el asistente recuerda lo elegido, y un lunes no hay horarios", async ({ page }) => {
  await hastaLosHorarios(page, proximoDiaAbierto());
  await expect(horarios(page).first()).toBeVisible();
  const hora = (await horarios(page).first().innerText()).trim();

  await horarios(page).first().click();
  await page.getByRole("button", { name: "Salón principal" }).click();
  await expect(page.getByText(`Para confirmar la reserva — ${hora}`)).toBeVisible(); // la hora que ELIGIÓ el test

  // El restaurante demo cierra los lunes.
  await hastaLosHorarios(page, proximoLunes());
  await expect(page.getByText("No hay horarios disponibles")).toBeVisible();
  await expect(horarios(page)).toHaveCount(0);
});
