import { SuperadminLoginForm } from "../_components/login-form";

export default function SuperadminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-1 text-center">
          <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">Superadmin</p>
          <h1 className="font-display text-display-sm text-foreground">Sistema de Reservas</h1>
        </div>
        <SuperadminLoginForm />
      </div>
    </div>
  );
}
