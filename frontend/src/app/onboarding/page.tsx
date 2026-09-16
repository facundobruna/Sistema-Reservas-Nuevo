import { OnboardingWizard } from "./_components/onboarding-wizard";

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-1 text-center">
          <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">Alta de restaurante</p>
          <h1 className="font-display text-display-sm text-foreground">Armá tu cuenta</h1>
          <p className="text-sm text-muted-foreground">Tres pasos y ya tenés tu link de reserva.</p>
        </div>
        <OnboardingWizard />
      </div>
    </div>
  );
}
