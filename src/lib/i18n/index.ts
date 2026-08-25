import { en, es } from "./dictionaries";

export type Locale = "es" | "en";

export const defaultLocale: Locale = "es";

export const dictionaries = { es, en } satisfies Record<Locale, unknown>;

export type Dictionary = typeof es;

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** Reemplaza tokens `{clave}` en un string de diccionario por los valores dados. */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = vars[key];
    return value === undefined ? match : String(value);
  });
}
