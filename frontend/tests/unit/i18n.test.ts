import { describe, expect, it } from "vitest";
import { interpolate } from "@/lib/i18n";

describe("interpolate: reemplaza los {tokens} de un texto de la interfaz", () => {
  it("reemplaza cada token por su valor, incluidos números y tokens repetidos", () => {
    // Arrange
    const plantilla = "Mesa para {n} en {lugar}: {n} personas";

    // Act
    const texto = interpolate(plantilla, { n: 4, lugar: "La Parrilla" });

    // Assert
    expect(texto).toBe("Mesa para 4 en La Parrilla: 4 personas");
  });

  it("deja el token a la vista si falta su valor, en vez de romper o mostrar «undefined»", () => {
    // Arrange: a la plantilla le faltan datos para {mesa}.
    const plantilla = "Hola {nombre}, tu mesa es la {mesa}";

    // Act
    const texto = interpolate(plantilla, { nombre: "Ana" });

    // Assert
    expect(texto).toBe("Hola Ana, tu mesa es la {mesa}");
  });
});
