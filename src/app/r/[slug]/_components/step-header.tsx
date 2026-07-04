import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

export function StepHeader({
  title,
  subtitle,
  onBack,
  backLabel,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel: string;
}) {
  return (
    <div className="mb-6">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="mb-3 -ml-2 flex min-h-11 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          {backLabel}
        </button>
      ) : null}
      <h1 className="font-display text-display-sm text-foreground">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

export function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-8 flex gap-1.5" role="presentation">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full ${i < current ? "bg-primary" : "bg-border"}`}
        />
      ))}
    </div>
  );
}

export function StepShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-md px-6 py-10">{children}</div>;
}
