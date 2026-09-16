import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)");

export const superadminStatsQuerySchema = z.object({
  from: dateString,
  to: dateString,
});

export const featureFlagToggleSchema = z.object({
  flag: z.string().trim().min(1).max(60),
  enabled: z.boolean(),
});
