"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";

const NAV_ITEMS = [
  { id: "color", label: "Color" },
  { id: "typography", label: "Tipografía" },
  { id: "spacing", label: "Espaciado" },
  { id: "components", label: "Componentes" },
  { id: "states", label: "Estados" },
  { id: "icons", label: "Íconos" },
];

export function Toolbar({
  locale,
  onLocaleChange,
}: {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
}) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <div>
          <p className="font-display text-base text-foreground">Design System</p>
          <p className="text-xs text-muted-foreground">Sistema de Reservas — uso interno</p>
        </div>
        <nav className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
          {NAV_ITEMS.map((item) => (
            <a key={item.id} href={`#${item.id}`} className="transition-colors hover:text-foreground">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-border text-xs">
            <button
              onClick={() => onLocaleChange("es")}
              className={`px-2.5 py-1.5 transition-colors ${
                locale === "es" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              ES
            </button>
            <button
              onClick={() => onLocaleChange("en")}
              className={`px-2.5 py-1.5 transition-colors ${
                locale === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              EN
            </button>
          </div>
          <Button variant="outline" size="icon" onClick={() => setIsDark((v) => !v)} aria-label="Cambiar tema">
            {isDark ? <Sun /> : <Moon />}
          </Button>
        </div>
      </div>
    </header>
  );
}
