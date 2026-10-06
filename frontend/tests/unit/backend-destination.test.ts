import { afterEach, describe, expect, it, vi } from "vitest";
import { destinoEnElBackend } from "@/lib/api/backend-destination";

describe("destinoEnElBackend: a dónde se reenvía un pedido a /api", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ["con la variable definida: usa esa dirección", "http://backend.test:3000", "/api/v1/health", "", "http://backend.test:3000/api/v1/health"],
    ["conserva el query string", "https://api-qa.example.com", "/api/v1/admin/stats", "?from=a&to=b", "https://api-qa.example.com/api/v1/admin/stats?from=a&to=b"],
  ])("%s", (_descripcion, variable, pathname, search, esperado) => {
    // Arrange
    vi.stubEnv("BACKEND_INTERNAL_URL", variable);

    // Act
    const destino = destinoEnElBackend(pathname, search);

    // Assert
    expect(destino.toString()).toBe(esperado);
  });

  it("sin la variable: cae a localhost:3000 (desarrollo a mano)", () => {
    // Arrange
    vi.stubEnv("BACKEND_INTERNAL_URL", undefined);

    // Act
    const destino = destinoEnElBackend("/api/v1/health", "");

    // Assert
    expect(destino.toString()).toBe("http://localhost:3000/api/v1/health");
  });

  it("lee la variable en cada llamada: si cambia, cambia el destino", () => {
    // Arrange
    vi.stubEnv("BACKEND_INTERNAL_URL", "http://uno.test");
    const antes = destinoEnElBackend("/api/x", "");

    // Act
    vi.stubEnv("BACKEND_INTERNAL_URL", "http://dos.test");
    const despues = destinoEnElBackend("/api/x", "");

    // Assert
    expect([antes.host, despues.host]).toEqual(["uno.test", "dos.test"]);
  });
});
