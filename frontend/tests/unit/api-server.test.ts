import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cookies } from "next/headers";

// Antes de importar el módulo: la URL del backend se lee al cargarlo. Se fija acá para que
// el test no dependa de cómo esté configurado el entorno de quien lo corra.
vi.hoisted(() => {
  process.env.BACKEND_INTERNAL_URL = "http://backend.test:3000";
});

// `cookies()` de Next solo existe dentro de un request real. Se lo reemplaza por un mock.
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { apiGet } from "@/lib/api/server";

/** Hace que `cookies()` devuelva un jar cuyo contenido serializado es `contenido`. */
function conCookies(contenido: string) {
  vi.mocked(cookies).mockResolvedValue({ toString: () => contenido } as unknown as Awaited<ReturnType<typeof cookies>>);
}

describe("apiGet: la única puerta del frontend hacia el backend", () => {
  // `fetch` es la dependencia externa: se lo reemplaza por un mock, así el test no sale a la red.
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it.each([
    ["con sesión: reenvía las cookies del visitante", "session=abc", { cookie: "session=abc" }],
    ["sin sesión: no manda el header cookie", "", undefined],
  ])("%s", async (_descripcion, cookiesDelVisitante, headersEsperados) => {
    // Arrange
    conCookies(cookiesDelVisitante);
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ session: { staffId: "s1" } }) });

    // Act
    const resultado = await apiGet("/auth/staff/me");

    // Assert
    expect(resultado).toEqual({ ok: true, data: { session: { staffId: "s1" } } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url).toBe("http://backend.test:3000/api/v1/auth/staff/me");
    expect(opciones.headers).toEqual(headersEsperados);
    // Son datos por usuario: cachearlos mostraría los de un restaurante en el panel de otro.
    expect(opciones.cache).toBe("no-store");
  });

  it("si el backend responde con error, devuelve el status sin intentar leer el cuerpo", async () => {
    // Arrange
    conCookies("session=vencida");
    const json = vi.fn();
    fetchMock.mockResolvedValue({ ok: false, status: 401, json });

    // Act
    const resultado = await apiGet("/auth/staff/me");

    // Assert
    expect(resultado).toEqual({ ok: false, status: 401 });
    expect(json).not.toHaveBeenCalled();
  });
});
