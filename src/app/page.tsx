import Link from "next/link";

/**
 * Portada pública. Es la puerta de entrada al sistema: quien llega sin conocerlo
 * tiene que poder encontrar desde acá las dos caras de la aplicación —la del
 * comensal que reserva y la del restaurante que gestiona— sin adivinar una URL.
 */
export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <p className="mb-3 font-mono text-xs tracking-wide text-muted-foreground uppercase">
        Demo · Fuego Norte
      </p>

      <h1 className="mb-4 font-display text-display-md text-foreground">Sistema de Reservas</h1>

      <p className="mb-10 max-w-md text-sm text-muted-foreground">
        Gestión de reservas para restaurantes. Elegí por dónde entrar: el flujo del comensal o
        el panel del restaurante.
      </p>

      <div className="grid w-full max-w-lg gap-3 sm:grid-cols-2">
        <Link
          href="/r/demo"
          className="rounded-lg border border-border bg-card p-5 text-left transition-colors hover:border-foreground/30"
        >
          <span className="mb-1 block text-sm font-medium text-foreground">Reservar una mesa</span>
          <span className="block text-xs text-muted-foreground">
            El flujo del comensal, paso a paso: fecha, personas, zona y horario.
          </span>
        </Link>

        <Link
          href="/admin/demo/login"
          className="rounded-lg border border-border bg-card p-5 text-left transition-colors hover:border-foreground/30"
        >
          <span className="mb-1 block text-sm font-medium text-foreground">Panel del restaurante</span>
          <span className="block text-xs text-muted-foreground">
            Agenda, mesas, turnos y estadísticas. Requiere iniciar sesión.
          </span>
        </Link>
      </div>

      <p className="mt-8 font-mono text-xs text-muted-foreground">
        Acceso de demostración: owner@fuegonorte.demo · demo1234
      </p>

      <p className="mt-10 text-xs text-muted-foreground">
        <Link href="/style-guide" className="underline underline-offset-4 hover:text-foreground">
          Sistema de diseño
        </Link>
        {" · "}
        <Link href="/api/v1/health" className="underline underline-offset-4 hover:text-foreground">
          Estado del sistema
        </Link>
      </p>
    </div>
  );
}
