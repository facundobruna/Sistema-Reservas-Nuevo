import type { ReactNode } from "react";

type SectionProps = {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
};

export function Section({ id, title, description, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border py-14 first:border-t-0 first:pt-0">
      <div className="mb-8 max-w-2xl space-y-2">
        <h2 className="font-display text-display-sm text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
