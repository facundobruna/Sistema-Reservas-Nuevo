import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type OptionChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
};

export function OptionChip({ selected, className, children, ...props }: OptionChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "min-h-11 rounded-full border px-5 py-2.5 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        selected
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:bg-secondary",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
