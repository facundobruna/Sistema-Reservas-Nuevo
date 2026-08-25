"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Copy, Download, ExternalLink, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/error-state";
import { cn } from "@/lib/utils";
import { useSettings, type Restaurant } from "../../_lib/resources";

const DEFAULT_ACCENT = "#9c6b4e";

export default function SharePage() {
  const settings = useSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-sm text-foreground">Compartí tu reserva</h1>
        <p className="text-sm text-muted-foreground">
          Todo lo que necesitás para llevar gente de tu Instagram o WhatsApp al link de reserva.
        </p>
      </div>

      {settings.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      ) : settings.isError ? (
        <ErrorState
          title="No se pudo cargar la información para compartir"
          action={
            <Button size="sm" variant="outline" onClick={() => settings.refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : (
        <ShareContent restaurant={settings.data.restaurant} />
      )}
    </div>
  );
}

function subscribeNoop() {
  return () => {};
}
function getOriginSnapshot() {
  return window.location.origin;
}
function getOriginServerSnapshot() {
  return "";
}

function ShareContent({ restaurant }: { restaurant: Restaurant }) {
  const origin = useSyncExternalStore(subscribeNoop, getOriginSnapshot, getOriginServerSnapshot);

  const accent = (restaurant.settings as { accentColor?: string }).accentColor?.trim() || DEFAULT_ACCENT;
  const link = origin ? `${origin}/r/${restaurant.slug}` : "";
  const whatsappText = `¡Hola! 👋 Reservá tu mesa en ${restaurant.name} acá: ${link}`;
  const waShareHref = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
  const embedSnippet = `<a href="${link}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 22px;background-color:${accent};color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">Reservar mesa</a>`;

  if (!link) {
    return <Skeleton className="h-48 w-full max-w-md rounded-lg" />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Tu link</CardTitle>
          <CardDescription>Pegalo en la bio de Instagram o donde tengas audiencia.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <CopyBlock label="Link de reserva" value={link} />
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
          >
            <ExternalLink className="size-4" />
            Abrir
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp</CardTitle>
          <CardDescription>Pegalo como respuesta automática en WhatsApp Business.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <CopyBlock label="Mensaje" value={whatsappText} multiline />
          <a
            href={waShareHref}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
          >
            <MessageCircle className="size-4" />
            Compartir por WhatsApp
          </a>
        </CardContent>
      </Card>

      <QrCodeCard url={link} />

      <Card>
        <CardHeader>
          <CardTitle>Botón para tu web</CardTitle>
          <CardDescription>Pegá este código en tu sitio, tal cual.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-center rounded-lg border border-dashed border-border p-6">
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                padding: "14px 22px",
                backgroundColor: accent,
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: 600,
                textDecoration: "none",
                borderRadius: "10px",
              }}
            >
              Reservar mesa
            </a>
          </div>
          <CopyBlock label="Código HTML" value={embedSnippet} multiline />
        </CardContent>
      </Card>
    </div>
  );
}

function CopyBlock({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  function handleCopy() {
    navigator.clipboard.writeText(value).then(
      () => toast.success("Copiado al portapapeles"),
      () => toast.error("No se pudo copiar"),
    );
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-start gap-2">
        {multiline ? (
          <Textarea readOnly value={value} rows={3} className="resize-none font-mono text-xs" />
        ) : (
          <Input readOnly value={value} className="font-mono text-xs" />
        )}
        <Button type="button" size="icon" variant="outline" onClick={handleCopy} aria-label="Copiar">
          <Copy className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function QrCodeCard({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("qrcode").then((QRCode) => {
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;
      QRCode.toCanvas(canvas, url, {
        width: 220,
        margin: 1,
        color: { dark: "#221e19", light: "#ffffff" },
      }).then(() => {
        if (!cancelled) setReady(true);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "codigo-qr-reserva.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Código QR</CardTitle>
        <CardDescription>Para imprimir en mesas, vidriera o el menú.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <canvas ref={canvasRef} className="rounded-md ring-1 ring-border" />
        <Button size="sm" variant="outline" onClick={handleDownload} disabled={!ready} className="gap-1.5">
          <Download className="size-4" />
          Descargar PNG
        </Button>
      </CardContent>
    </Card>
  );
}
