"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const STEP_LABELS = ["Restaurante", "Tu cuenta", "Turnos"];

type ShiftConfig = { enabled: boolean; startTime: string; endTime: string };

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [restaurantName, setRestaurantName] = useState("");
  const [slug, setSlug] = useState("");
  const [timezone, setTimezone] = useState("America/Argentina/Buenos_Aires");

  const [ownerFirstName, setOwnerFirstName] = useState("");
  const [ownerLastName, setOwnerLastName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [lunch, setLunch] = useState<ShiftConfig>({ enabled: true, startTime: "12:00", endTime: "15:30" });
  const [dinner, setDinner] = useState<ShiftConfig>({ enabled: true, startTime: "20:00", endTime: "23:30" });

  function handleNameChange(value: string) {
    setRestaurantName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function goNext() {
    setError(null);
    setStep((s) => Math.min(3, s + 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  async function submitOnboarding() {
    if (!lunch.enabled && !dinner.enabled) {
      setError("Elegí al menos un turno (almuerzo o cena).");
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/v1/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantName,
        slug,
        timezone,
        ownerName: `${ownerFirstName.trim()} ${ownerLastName.trim()}`.trim(),
        ownerEmail,
        password,
        shifts: { lunch, dinner },
      }),
    });

    if (!res.ok) {
      setSubmitting(false);
      const body = await res.json().catch(() => ({}));
      if (body.error === "slug_taken") {
        setError(`El link "${slug}" ya está en uso. Probá con otro.`);
        setStep(1);
        return;
      }
      setError("Algo no salió bien. Revisá los datos e intentá de nuevo.");
      return;
    }

    const body = (await res.json()) as { slug: string };
    router.push(`/admin/${body.slug}/share`);
    router.refresh();
  }

  function handleFormSubmit(event: FormEvent) {
    event.preventDefault();
    if (step === 2 && password !== passwordConfirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (step < 3) {
      goNext();
    } else {
      void submitOnboarding();
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardContent className="pt-6">
        <div className="mb-6 flex items-center gap-2">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                  step > i + 1
                    ? "bg-accent text-accent-foreground"
                    : step === i + 1
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground",
                )}
              >
                {step > i + 1 ? <Check className="size-3.5" /> : i + 1}
              </div>
              {i < STEP_LABELS.length - 1 ? <div className="h-px flex-1 bg-border" /> : null}
            </div>
          ))}
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-5">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ob-name">Nombre del restaurante</Label>
                <Input
                  id="ob-name"
                  value={restaurantName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ob-slug">Link de reserva</Label>
                <div className="flex items-center gap-1 rounded-lg border border-input px-2.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
                  <span className="text-sm text-muted-foreground">/r/</span>
                  <input
                    id="ob-slug"
                    value={slug}
                    onChange={(e) => {
                      setSlug(slugify(e.target.value));
                      setSlugTouched(true);
                    }}
                    className="w-full bg-transparent py-1.5 text-sm outline-none"
                    required
                    minLength={2}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ob-tz">Zona horaria</Label>
                <Input
                  id="ob-tz"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="America/Argentina/Buenos_Aires"
                  required
                />
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ob-owner-first-name">Nombre</Label>
                  <Input
                    id="ob-owner-first-name"
                    value={ownerFirstName}
                    onChange={(e) => setOwnerFirstName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ob-owner-last-name">Apellido</Label>
                  <Input
                    id="ob-owner-last-name"
                    value={ownerLastName}
                    onChange={(e) => setOwnerLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ob-owner-email">Email</Label>
                <Input
                  id="ob-owner-email"
                  type="email"
                  autoComplete="username"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ob-password">Contraseña</Label>
                <Input
                  id="ob-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ob-password-confirm">Confirmar contraseña</Label>
                <Input
                  id="ob-password-confirm"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                />
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <ShiftFields label="Almuerzo" value={lunch} onChange={setLunch} />
              <ShiftFields label="Cena" value={dinner} onChange={setDinner} />
              <p className="text-xs text-muted-foreground">
                Podés ajustar días y horarios más en detalle después, desde Turnos en el panel.
              </p>
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex items-center justify-between pt-2">
            {step > 1 ? (
              <Button type="button" variant="ghost" onClick={goBack}>
                Atrás
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={submitting}>
              {step < 3 ? "Continuar" : submitting ? "Creando…" : "Crear restaurante"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ShiftFields({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ShiftConfig;
  onChange: (v: ShiftConfig) => void;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        <Checkbox
          id={`shift-${label}`}
          checked={value.enabled}
          onCheckedChange={(checked) => onChange({ ...value, enabled: checked === true })}
        />
        <Label htmlFor={`shift-${label}`} className="font-medium text-foreground">
          {label}
        </Label>
      </div>
      {value.enabled ? (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Desde</Label>
            <Input
              type="time"
              value={value.startTime}
              onChange={(e) => onChange({ ...value, startTime: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hasta</Label>
            <Input
              type="time"
              value={value.endTime}
              onChange={(e) => onChange({ ...value, endTime: e.target.value })}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
