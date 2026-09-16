"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SuperadminLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/v1/auth/superadmin/logout", { method: "POST" });
    router.push("/superadmin/login");
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-muted-foreground">
      <LogOut className="size-4" />
      Salir
    </Button>
  );
}
