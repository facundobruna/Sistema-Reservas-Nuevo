import { z } from "zod";
import { e164Phone } from "./phone";

export const staffLoginSchema = z.object({
  slug: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
});

export const magicLinkRequestSchema = z.object({
  phone: e164Phone,
});

export const superadminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
