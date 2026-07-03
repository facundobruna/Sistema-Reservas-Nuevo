import { en, es } from "./dictionaries";

export type Locale = "es" | "en";

export const defaultLocale: Locale = "es";

export const dictionaries = { es, en } satisfies Record<Locale, unknown>;

export type Dictionary = typeof es;

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
