import { z } from "zod";

export const e164Phone = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{6,14}$/, "Formato de teléfono inválido (E.164, ej. +5491122223333)");
