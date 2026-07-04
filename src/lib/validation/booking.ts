import { z } from "zod";

export const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  partySize: z.coerce.number().int().min(1),
  zoneId: z.string().uuid().optional(),
});
