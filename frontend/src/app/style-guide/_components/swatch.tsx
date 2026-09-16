export function RawSwatch({ step, varName, hex }: { step: string; varName: string; hex: string }) {
  return (
    <div className="space-y-2">
      <div
        className="h-16 w-full rounded-lg border border-border/60"
        style={{ background: `var(${varName})` }}
      />
      <div className="text-xs">
        <p className="font-medium text-foreground">{step}</p>
        <p className="font-mono text-[11px] text-muted-foreground">{hex}</p>
      </div>
    </div>
  );
}

export function SemanticSwatch({
  name,
  bgVar,
  fgVar,
  usage,
}: {
  name: string;
  bgVar: string;
  fgVar: string;
  usage: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div
        className="flex h-20 items-center justify-center text-sm font-medium"
        style={{ background: `var(${bgVar})`, color: `var(${fgVar})` }}
      >
        Aa
      </div>
      <div className="space-y-1 p-3">
        <p className="font-mono text-xs text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">{usage}</p>
      </div>
    </div>
  );
}
