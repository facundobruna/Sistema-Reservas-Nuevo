"use client";

import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ImpersonationBanner({ slug }: { slug: string }) {
  const router = useRouter();

  async function handleExit() {
    await fetch("/api/v1/auth/staff/logout", { method: "POST" });
    router.push("/superadmin");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-warning px-6 py-2 text-sm text-warning-foreground">
      <div className="flex items-center gap-2">
        <ShieldAlert className="size-4" />
        Estás viendo el panel de <strong>{slug}</strong> como superadmin.
      </div>
      <Button size="xs" variant="outline" className="border-warning-foreground/30 bg-transparent text-warning-foreground hover:bg-warning-foreground/10" onClick={handleExit}>
        Salir de la impersonación
      </Button>
    </div>
  );
}
