import { Suspense } from "react";
import { notFound } from "next/navigation";
import { apiGet } from "@/lib/api/server";
import type { PublicRestaurantInfo } from "@/lib/api/types";
import { BookingWizard } from "./_components/wizard";

export default async function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await apiGet<PublicRestaurantInfo>(`/r/${slug}`);
  if (!result.ok) notFound();

  const info = result.data;
  const settings = info.settings;
  // Los tokens derivados (--accent-subtle, --ring, etc.) se resuelven vía color-mix()
  // en el punto donde CADA custom property se declara, no en cascada al pisar solo
  // --accent — por eso hay que redeclararlos todos juntos acá, con el color literal.
  const brandStyle = settings.accentColor
    ? ({
        "--accent": settings.accentColor,
        "--accent-subtle": `color-mix(in oklab, ${settings.accentColor} 12%, var(--neutral-0))`,
        "--accent-subtle-foreground": `color-mix(in oklab, ${settings.accentColor} 65%, var(--neutral-900))`,
        "--ring": settings.accentColor,
      } as React.CSSProperties)
    : undefined;

  return (
    <div className="min-h-screen bg-background" style={brandStyle}>
      <header className="border-b border-border px-6 py-4">
        <p className="font-display text-lg text-foreground">{info.name}</p>
      </header>
      <Suspense>
        <BookingWizard
          slug={slug}
          timezone={info.timezone}
          zones={info.zones}
          services={info.services}
          maxOnlinePartySize={settings.maxOnlinePartySize ?? null}
          largeGroupPhone={settings.largeGroupPhone ?? null}
        />
      </Suspense>
    </div>
  );
}
