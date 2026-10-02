import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { apiGet } from "@/lib/api/server";
import { requireStaffPage } from "@/lib/auth/require-staff";
import { requireSuperadminPage } from "@/lib/auth/require-superadmin";

// Las dos dependencias de las guardas se reemplazan por mocks: la API (no hay backend
// en el test) y `redirect` de Next. El `redirect` real corta la ejecución lanzando una
// excepción; el mock hace lo mismo, así el código que viene después no corre.
vi.mock("@/lib/api/server", () => ({ apiGet: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((destino: string) => {
    throw new Error(`NEXT_REDIRECT:${destino}`);
  }),
}));

const respuesta = (valor: unknown) => vi.mocked(apiGet).mockResolvedValue(valor as never);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireStaffPage: guarda de las pantallas del panel", () => {
  it.each([
    ["el backend dice que no hay sesión", { ok: false, status: 401 }],
    // El caso que importa: un usuario logueado en OTRO restaurante no puede ver este panel.
    ["la sesión es de otro restaurante", { ok: true, data: { session: { restaurantSlug: "otro-resto" } } }],
  ])("manda al login: %s", async (_descripcion, respuestaDelBackend) => {
    // Arrange
    respuesta(respuestaDelBackend);

    // Act
    const acceso = requireStaffPage("la-parrilla");

    // Assert
    await expect(acceso).rejects.toThrow("NEXT_REDIRECT:/admin/la-parrilla/login");
    expect(redirect).toHaveBeenCalledWith("/admin/la-parrilla/login");
  });

  it("deja pasar y devuelve la sesión cuando es del restaurante correcto", async () => {
    // Arrange
    const sesion = { staffId: "s1", restaurantSlug: "la-parrilla", role: "owner" };
    respuesta({ ok: true, data: { session: sesion } });

    // Act
    const resultado = await requireStaffPage("la-parrilla");

    // Assert
    expect(resultado).toEqual(sesion);
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("requireSuperadminPage: guarda del área de superadmin", () => {
  it("manda al login de superadmin si no hay sesión", async () => {
    // Arrange
    respuesta({ ok: false, status: 401 });

    // Act
    const acceso = requireSuperadminPage();

    // Assert
    await expect(acceso).rejects.toThrow("NEXT_REDIRECT:/superadmin/login");
  });

  it("devuelve la sesión del superadmin cuando el backend la reconoce", async () => {
    // Arrange
    const sesion = { superadminId: "sa1", email: "admin@example.com" };
    respuesta({ ok: true, data: { session: sesion } });

    // Act
    const resultado = await requireSuperadminPage();

    // Assert
    expect(resultado).toEqual(sesion);
    expect(redirect).not.toHaveBeenCalled();
  });
});
