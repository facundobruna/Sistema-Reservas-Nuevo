"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarCheck,
  CalendarOff,
  Clock3,
  CreditCard,
  GanttChartSquare,
  LayoutGrid,
  MapPinned,
  Settings,
  Share2,
  Table2,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";

const OPERATION_ITEMS = [
  { href: "", label: "Agenda", icon: CalendarCheck },
  { href: "/timeline", label: "Mapa de mesas", icon: GanttChartSquare },
  { href: "/share", label: "Compartir", icon: Share2 },
  { href: "/customers", label: "Comensales", icon: Users },
  { href: "/stats", label: "Analíticas", icon: BarChart3 },
];

const CONFIG_ITEMS = [
  { href: "/zones", label: "Zonas", icon: MapPinned },
  { href: "/mesas", label: "Mesas", icon: Table2 },
  { href: "/combos", label: "Combos", icon: LayoutGrid },
  { href: "/services", label: "Servicios", icon: UtensilsCrossed },
  { href: "/shifts", label: "Turnos", icon: Clock3 },
  { href: "/exceptions", label: "Excepciones", icon: CalendarOff },
  { href: "/billing", label: "Facturación", icon: CreditCard },
  { href: "/settings", label: "Configuración", icon: Settings },
];

export function AdminNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/admin/${slug}`;

  function renderItems(items: typeof OPERATION_ITEMS) {
    return items.map((item) => {
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
    });
  }

  return (
    <nav className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">{renderItems(OPERATION_ITEMS)}</div>
      <div>
        <p className="px-3 pb-1 font-mono text-[11px] tracking-wide text-muted-foreground/70 uppercase">
          Configuración
        </p>
        <div className="flex flex-col gap-0.5">{renderItems(CONFIG_ITEMS)}</div>
      </div>
    </nav>
  );
}
