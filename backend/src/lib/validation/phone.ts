import { z } from "zod";

export const e164Phone = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{6,14}$/, "Formato de teléfono inválido (E.164, ej. +5491122223333)");

// Los comensales suelen tipear su celular en formato local (ej. "11 2222-3333"
// o "011-2222-3333") en vez de E.164. Normalizamos asumiendo Argentina, que es
// el único mercado que atendemos hoy, para no exigirle el prefijo al usuario.
// No intentamos reconstruir el viejo marcador móvil "15" (ej. "011 15-2222-3333"):
// su posición depende de la longitud del código de área, que no podemos inferir
// de forma confiable sin una tabla de códigos.
export function normalizeArPhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  if (trimmed.startsWith("+")) {
    return "+" + trimmed.slice(1).replace(/\D/g, "");
  }

  let digits = trimmed.replace(/\D/g, "");
  digits = digits.replace(/^0/, "");
  if (digits.startsWith("54")) digits = digits.slice(2);
  if (!digits.startsWith("9")) digits = "9" + digits;

  return "+54" + digits;
}
