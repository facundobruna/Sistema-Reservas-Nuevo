"use client";

import { useState } from "react";
import {
  Bell,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Mail,
  MapPin,
  Phone,
  QrCode,
  Share2,
  Users,
  X,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { getDictionary, type Locale } from "@/lib/i18n";

import { Section } from "./_components/section";
import { RawSwatch, SemanticSwatch } from "./_components/swatch";
import { Toolbar } from "./_components/toolbar";
import { clayScale, neutralScale, semanticTokens } from "./_components/color-data";

const DISPLAY_SPECIMENS = [
  { token: "display-2xl", className: "text-display-2xl", sample: "Tu mesa te espera" },
  { token: "display-xl", className: "text-display-xl", sample: "Tu mesa te espera" },
  { token: "display-lg", className: "text-display-lg", sample: "Tu mesa te espera" },
  { token: "display-md", className: "text-display-md", sample: "Tu mesa te espera" },
  { token: "display-sm", className: "text-display-sm", sample: "Tu mesa te espera" },
];

const TEXT_SPECIMENS = [
  { token: "text-lg", className: "text-lg" },
  { token: "text-base", className: "text-base" },
  { token: "text-sm", className: "text-sm" },
  { token: "text-xs", className: "text-xs" },
];

const SPACING_STEPS = [1, 2, 3, 4, 6, 8, 12, 16, 24];
const RADIUS_STEPS = [
  { name: "sm", className: "rounded-sm" },
  { name: "md", className: "rounded-md" },
  { name: "lg", className: "rounded-lg" },
  { name: "xl", className: "rounded-xl" },
  { name: "2xl", className: "rounded-2xl" },
];
const SHADOW_STEPS = [
  { name: "xs", className: "shadow-xs" },
  { name: "sm", className: "shadow-sm" },
  { name: "md", className: "shadow-md" },
  { name: "lg", className: "shadow-lg" },
];

const ICONS = [
  { icon: Calendar, label: "Calendar" },
  { icon: Clock, label: "Clock" },
  { icon: Users, label: "Users" },
  { icon: MapPin, label: "MapPin" },
  { icon: Phone, label: "Phone" },
  { icon: Mail, label: "Mail" },
  { icon: Check, label: "Check" },
  { icon: X, label: "X" },
  { icon: ChevronRight, label: "ChevronRight" },
  { icon: QrCode, label: "QrCode" },
  { icon: Share2, label: "Share2" },
  { icon: Bell, label: "Bell" },
];

const STATUS_BADGE_VARIANT = {
  pending: "warning",
  confirmed: "accent",
  seated: "secondary",
  completed: "success",
  cancelled: "destructive",
  no_show: "destructive",
} as const;

export default function StyleGuidePage() {
  const [locale, setLocale] = useState<Locale>("es");
  const [styleGuideZone, setStyleGuideZone] = useState("salon");
  const dict = getDictionary(locale);

  return (
    <div className="min-h-screen bg-background">
      <Toolbar locale={locale} onLocaleChange={setLocale} />

      <main className="mx-auto max-w-5xl px-6 py-14">
        <div className="mb-14 max-w-2xl space-y-4">
          <Badge variant="outline">Uso interno</Badge>
          <h1 className="font-display text-display-lg text-foreground">
            El sistema de diseño detrás de cada reserva
          </h1>
          <p className="text-muted-foreground">
            Tokens, tipografía y componentes de Sistema de Reservas. Dirección: hospitalidad
            refinada y editorial — base neutra, un único acento usado con moderación. Esta
            página no es pública, es documentación de trabajo.
          </p>
        </div>

        <Section
          id="color"
          title="Color"
          description="Base neutra cálida (blanco a negro) con un acento contenido. El acento se puede reemplazar por tenant sin romper el sistema."
        >
          <div className="space-y-10">
            <div>
              <p className="mb-3 text-sm font-medium text-foreground">Neutral</p>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-12">
                {neutralScale.map((s) => (
                  <RawSwatch key={s.step} {...s} />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-medium text-foreground">Clay — el acento</p>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-10">
                {clayScale.map((s) => (
                  <RawSwatch key={s.step} {...s} />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-medium text-foreground">Tokens semánticos</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {semanticTokens.map((t) => (
                  <SemanticSwatch key={t.name} {...t} />
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section
          id="typography"
          title="Tipografía"
          description="Fraunces (display, con carácter) para títulos. Archivo (texto) para todo lo demás. Escala jerárquica real, no solo tamaños distintos."
        >
          <div className="space-y-8">
            <div className="space-y-5">
              {DISPLAY_SPECIMENS.map((s) => (
                <div key={s.token} className="flex flex-col gap-1 border-b border-border pb-5 last:border-0">
                  <p className={`font-display text-foreground ${s.className}`}>{s.sample}</p>
                  <p className="font-mono text-xs text-muted-foreground">{s.token}</p>
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-4">
              {TEXT_SPECIMENS.map((s) => (
                <p key={s.token} className={`font-text text-foreground ${s.className}`}>
                  {s.token} — Confirmá tu mesa en tres pasos, sin cuenta ni seña.
                </p>
              ))}
            </div>
          </div>
        </Section>

        <Section id="spacing" title="Espaciado, radios y sombras" description="Escalas de apoyo para layout y elevación — se usan con moderación.">
          <div className="space-y-10">
            <div>
              <p className="mb-3 text-sm font-medium text-foreground">Espaciado</p>
              <div className="flex flex-wrap items-end gap-4">
                {SPACING_STEPS.map((step) => (
                  <div key={step} className="flex flex-col items-center gap-2">
                    <div className="bg-accent" style={{ width: `${step * 4}px`, height: "8px" }} />
                    <span className="font-mono text-[11px] text-muted-foreground">{step}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-medium text-foreground">Radios</p>
              <div className="flex flex-wrap gap-4">
                {RADIUS_STEPS.map((r) => (
                  <div key={r.name} className="flex flex-col items-center gap-2">
                    <div className={`size-14 border border-border bg-muted ${r.className}`} />
                    <span className="font-mono text-[11px] text-muted-foreground">{r.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-medium text-foreground">Sombras</p>
              <div className="flex flex-wrap gap-6">
                {SHADOW_STEPS.map((s) => (
                  <div key={s.name} className="flex flex-col items-center gap-3">
                    <div className={`size-14 rounded-lg bg-card ${s.className}`} />
                    <span className="font-mono text-[11px] text-muted-foreground">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section id="components" title="Componentes" description="shadcn/ui restyleado sobre los tokens de arriba.">
          <div className="space-y-12">
            <div>
              <p className="mb-3 text-sm font-medium text-foreground">Botones</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button>{dict.common.confirm}</Button>
                <Button variant="accent">Reservar</Button>
                <Button variant="secondary">{dict.common.back}</Button>
                <Button variant="outline">{dict.common.retry}</Button>
                <Button variant="ghost">{dict.common.next}</Button>
                <Button variant="destructive">{dict.common.cancel}</Button>
                <Button variant="link">Ver detalle</Button>
                <Button disabled>Deshabilitado</Button>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-foreground">Badges — estado de reserva</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(dict.reservationStatus).map(([key, label]) => (
                  <Badge key={key} variant={STATUS_BADGE_VARIANT[key as keyof typeof STATUS_BADGE_VARIANT]}>
                    {label}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-foreground">Formulario</p>
              <Card className="max-w-md">
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-1.5">
                    <Label htmlFor="sg-name">Nombre</Label>
                    <Input id="sg-name" placeholder="Nombre y apellido" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sg-zone">Zona</Label>
                    <Select value={styleGuideZone} onValueChange={(v) => setStyleGuideZone(v ?? styleGuideZone)}>
                      <SelectTrigger id="sg-zone" className="w-full">
                        <SelectValue placeholder="Elegí una zona">
                          {styleGuideZone === "salon" ? "Salón principal" : "Terraza"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="salon">Salón principal</SelectItem>
                        <SelectItem value="terraza">Terraza</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sg-notes">Pedido especial</Label>
                    <Textarea id="sg-notes" placeholder="Alergias, silla para bebé, etc." />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sg-switch" className="text-sm font-normal text-muted-foreground">
                      Avisarme por email
                    </Label>
                    <Switch id="sg-switch" defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-foreground">Card de reserva</p>
              <Card className="max-w-md">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="font-display text-lg">Mesa para 4</CardTitle>
                    <CardDescription>Sáb. 20 de julio · 21:00</CardDescription>
                  </div>
                  <Badge variant="accent">{dict.reservationStatus.confirmed}</Badge>
                </CardHeader>
                <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Avatar className="size-8">
                    <AvatarFallback>MC</AvatarFallback>
                  </Avatar>
                  <span>María Cortez · +54 9 11 0000-0000</span>
                </CardContent>
              </Card>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-foreground">Tabs</p>
              <Tabs defaultValue="upcoming" className="max-w-md">
                <TabsList>
                  <TabsTrigger value="upcoming">Próximas</TabsTrigger>
                  <TabsTrigger value="past">Pasadas</TabsTrigger>
                </TabsList>
                <TabsContent value="upcoming" className="pt-3 text-muted-foreground">
                  4 reservas esta semana.
                </TabsContent>
                <TabsContent value="past" className="pt-3 text-muted-foreground">
                  32 reservas completadas este mes.
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </Section>

        <Section
          id="states"
          title="Estados"
          description="Carga, vacío y error — pensados para acompañar, no solo para informar."
        >
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-medium text-foreground">Carga (calca el layout real)</p>
              <div className="space-y-3 rounded-xl border border-border p-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-9 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-2/5" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-8">
              <div>
                <p className="mb-3 text-sm font-medium text-foreground">Vacío</p>
                <EmptyState
                  icon={<Calendar />}
                  title={dict.emptyStates.noReservations.title}
                  description={dict.emptyStates.noReservations.description}
                  action={<Button size="sm">Compartir mi link de reserva</Button>}
                />
              </div>
              <div>
                <p className="mb-3 text-sm font-medium text-foreground">Error</p>
                <ErrorState
                  title={dict.errorStates.slotUnavailable.title}
                  description={dict.errorStates.slotUnavailable.description}
                  action={
                    <Button size="sm" variant="outline">
                      {dict.common.retry}
                    </Button>
                  }
                />
              </div>
            </div>
          </div>
        </Section>

        <Section id="icons" title="Íconos" description="Un solo set — Lucide. Uso funcional, nunca decorativo.">
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
            {ICONS.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 rounded-lg border border-border py-4 text-muted-foreground"
              >
                <Icon className="size-5" />
                <span className="font-mono text-[11px]">{label}</span>
              </div>
            ))}
          </div>
        </Section>
      </main>
    </div>
  );
}
