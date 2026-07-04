"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarOff, Clock3, LayoutGrid, MapPinned, Settings, Table2, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "", label: "Zonas", icon: MapPinned },
  { href: "/mesas", label: "Mesas", icon: Table2 },
  { href: "/combos", label: "Combos", icon: LayoutGrid },
  { href: "/services", label: "Servicios", icon: UtensilsCrossed },
  { href: "/shifts", label: "Turnos", icon: Clock3 },
  { href: "/exceptions", label: "Excepciones", icon: CalendarOff },
  { href: "/settings", label: "Configuración", icon: Settings },
];

export function AdminNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/admin/${slug}`;

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV_ITEMS.map((item) => {
        const href = `${base}${item.href}`;
        const active = item.href === "" ? pathname === base : pathname.startsWith(href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-secondary text-foreground font-medium"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
