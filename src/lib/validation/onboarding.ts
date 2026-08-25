import { z } from "zod";

const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Formato de hora inválido (HH:MM)");
const slugPattern = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

const shiftPreset = z.object({
  enabled: z.boolean(),
  startTime: timeString,
  endTime: timeString,
});

export const onboardingSchema = z
  .object({
    restaurantName: z.string().trim().min(1).max(120),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(2)
      .max(60)
      .regex(slugPattern, "Solo minúsculas, números y guiones (sin empezar o terminar en guión)"),
    timezone: z.string().trim().min(1).max(60),
    ownerName: z.string().trim().min(1).max(120),
    ownerEmail: z.string().trim().email(),
    password: z.string().min(8).max(200),
    shifts: z.object({
      lunch: shiftPreset,
      dinner: shiftPreset,
    }),
  })
  .refine((v) => v.shifts.lunch.enabled || v.shifts.dinner.enabled, {
    message: "Elegí al menos un turno (almuerzo o cena)",
    path: ["shifts"],
  })
  .refine(
    (v) => !v.shifts.lunch.enabled || v.shifts.lunch.endTime > v.shifts.lunch.startTime,
    { message: "El horario de almuerzo debe terminar después de empezar", path: ["shifts", "lunch"] },
  )
  .refine(
    (v) => !v.shifts.dinner.enabled || v.shifts.dinner.endTime > v.shifts.dinner.startTime,
    { message: "El horario de cena debe terminar después de empezar", path: ["shifts", "dinner"] },
  );

export type OnboardingInput = z.infer<typeof onboardingSchema>;
