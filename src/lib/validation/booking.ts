import { z } from "zod";
import { e164Phone } from "./phone";

export const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  partySize: z.coerce.number().int().min(1),
  zoneId: z.string().uuid().optional(),
});

export const createReservationSchema = z.object({
  startsAt: z.string().datetime({ message: "startsAt debe ser un instante ISO válido" }),
  partySize: z.number().int().min(1),
  zoneId: z.string().uuid().optional(),
  specialRequests: z.string().trim().max(500).optional(),
  customer: z.object({
    phone: e164Phone,
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().optional(),
  }),
});

export const updateReservationSchema = z.object({
  specialRequests: z.string().trim().max(500).optional(),
  status: z.literal("cancelled").optional(),
});
