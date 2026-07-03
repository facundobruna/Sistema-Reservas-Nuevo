import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="mb-3 font-mono text-xs tracking-wide text-muted-foreground uppercase">
        En construcción
      </p>
      <h1 className="mb-4 font-display text-display-md text-foreground">Sistema de Reservas</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        El flujo de reserva del comensal y el panel del restaurante todavía no están listos.
        Mientras tanto, podés revisar el{" "}
        <Link href="/style-guide" className="text-foreground underline underline-offset-4">
          sistema de diseño
        </Link>
        .
      </p>
    </div>
  );
}
