export const neutralScale = [
  { step: "0", varName: "--neutral-0", hex: "#ffffff" },
  { step: "50", varName: "--neutral-50", hex: "#faf9f7" },
  { step: "100", varName: "--neutral-100", hex: "#f3f1ec" },
  { step: "200", varName: "--neutral-200", hex: "#e6e2d9" },
  { step: "300", varName: "--neutral-300", hex: "#d2ccbf" },
  { step: "400", varName: "--neutral-400", hex: "#a89f91" },
  { step: "500", varName: "--neutral-500", hex: "#837a6d" },
  { step: "600", varName: "--neutral-600", hex: "#635b4f" },
  { step: "700", varName: "--neutral-700", hex: "#4a433a" },
  { step: "800", varName: "--neutral-800", hex: "#332e27" },
  { step: "900", varName: "--neutral-900", hex: "#221e19" },
  { step: "950", varName: "--neutral-950", hex: "#16130f" },
];

export const clayScale = [
  { step: "50", varName: "--clay-50", hex: "#faf2ec" },
  { step: "100", varName: "--clay-100", hex: "#f0ddcd" },
  { step: "200", varName: "--clay-200", hex: "#e0bfa3" },
  { step: "300", varName: "--clay-300", hex: "#cc9c78" },
  { step: "400", varName: "--clay-400", hex: "#b17f57" },
  { step: "500", varName: "--clay-500", hex: "#9c6b4e" },
  { step: "600", varName: "--clay-600", hex: "#815743" },
  { step: "700", varName: "--clay-700", hex: "#654436" },
  { step: "800", varName: "--clay-800", hex: "#4a3227" },
  { step: "900", varName: "--clay-900", hex: "#33231b" },
];

export const semanticTokens = [
  {
    name: "background / foreground",
    bgVar: "--background",
    fgVar: "--foreground",
    usage: "Base de la app. Texto principal sobre fondo.",
  },
  {
    name: "card",
    bgVar: "--card",
    fgVar: "--card-foreground",
    usage: "Superficies elevadas: tarjetas, paneles, modales.",
  },
  {
    name: "primary",
    bgVar: "--primary",
    fgVar: "--primary-foreground",
    usage: "Acción principal. Sobrio: negro en claro, blanco en oscuro.",
  },
  {
    name: "secondary",
    bgVar: "--secondary",
    fgVar: "--secondary-foreground",
    usage: "Acción o superficie secundaria, bajo énfasis.",
  },
  {
    name: "muted",
    bgVar: "--muted",
    fgVar: "--muted-foreground",
    usage: "Texto/fondos de apoyo, baja jerarquía.",
  },
  {
    name: "accent",
    bgVar: "--accent",
    fgVar: "--accent-foreground",
    usage: "El único acento de color. Uso puntual: foco, selección, CTA secundaria.",
  },
  {
    name: "success",
    bgVar: "--success",
    fgVar: "--success-foreground",
    usage: "Confirmaciones, estados completados.",
  },
  {
    name: "warning",
    bgVar: "--warning",
    fgVar: "--warning-foreground",
    usage: "Atención sin ser un error (ej. pendiente).",
  },
  {
    name: "destructive",
    bgVar: "--destructive",
    fgVar: "--destructive-foreground",
    usage: "Cancelaciones, no-shows, errores.",
  },
];
