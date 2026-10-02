import { describe, expect, it } from "vitest";
import { e164Phone, normalizeArPhone } from "@/lib/validation/phone";

describe("normalizeArPhone: del formato que tipea el comensal al E.164", () => {
  it.each([
    ["celular local con espacio y guion", "11 2222-3333", "+5491122223333"],
    ["con el cero de larga distancia", "011-2222-3333", "+5491122223333"],
    ["con el código de país pero sin el +", "54 9 11 2222 3333", "+5491122223333"],
    ["ya internacional con +: se respeta el país", "+1 (415) 555-2671", "+14155552671"],
    ["solo espacios: queda vacío, sin inventar un número", "   ", ""],
  ])("%s", (_descripcion, ingresado, esperado) => {
    // Act
    const normalizado = normalizeArPhone(ingresado);

    // Assert
    expect(normalizado).toBe(esperado);
  });
});

describe("e164Phone: el esquema que valida el teléfono", () => {
  it.each([
    ["un celular argentino", "+5491122223333"],
    ["con espacios alrededor (se recortan)", "  +5491122223333  "],
    // Los bordes del largo: E.164 admite de 7 a 15 dígitos.
    ["el mínimo: 7 dígitos", "+1234567"],
    ["el máximo: 15 dígitos", "+123456789012345"],
  ])("acepta %s", (_descripcion, valor) => {
    // Act
    const resultado = e164Phone.safeParse(valor);

    // Assert
    expect(resultado.success).toBe(true);
  });

  it.each([
    ["sin el +", "5491122223333"],
    ["con el formato local que tipea la gente", "11 2222-3333"],
    ["empieza con 0 después del +", "+0123456789"],
    ["un dígito menos que el mínimo: 6 dígitos", "+123456"],
    ["un dígito más que el máximo: 16 dígitos", "+1234567890123456"],
    ["con letras", "+54911abc2222"],
    ["vacío", ""],
  ])("rechaza %s y explica el formato esperado", (_descripcion, valor) => {
    // Act
    const resultado = e164Phone.safeParse(valor);

    // Assert
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toContain("E.164");
  });
});
