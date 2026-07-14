import { notFound } from "next/navigation";
import { getRestaurantBySlug } from "@/db/restaurant";

const MESSAGES: Record<string, { title: string; description: string }> = {
  confirmed: { title: "¡Gracias por confirmar!", description: "Te esperamos." },
  already: { title: "Ya estaba resuelto", description: "Esta reserva ya no estaba pendiente de confirmar." },
  error: { title: "Ese link ya no es válido", description: "Puede que haya vencido o que ya se haya usado." },
};

export default async function ActionResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { slug } = await params;
  const { type } = await searchParams;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  const message = MESSAGES[type ?? ""] ?? MESSAGES.error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-2 text-center">
        <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">{restaurant.name}</p>
        <h1 className="font-display text-display-sm text-foreground">{message.title}</h1>
        <p className="text-sm text-muted-foreground">{message.description}</p>
      </div>
    </div>
  );
}
