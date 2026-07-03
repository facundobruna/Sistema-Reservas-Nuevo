import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function ErrorState({ title, description, action, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-destructive/25 bg-destructive-subtle/40 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-full bg-destructive-subtle text-destructive-subtle-foreground">
        <TriangleAlert className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="font-display text-lg text-foreground">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
