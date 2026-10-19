import * as Sentry from "@sentry/nextjs";

// El DSN es público a propósito: solo permite ENVIAR eventos, no leerlos. Va escrito acá porque la imagen del
// front es la misma para QA y PROD, y no se puede inyectar por entorno. environment las distingue en Sentry.
Sentry.init({
  dsn: "https://51caa9bb36774da5c33421d85ec63f7a@o4512283182104576.ingest.us.sentry.io/4512283275165696",
  environment: window.location.hostname,
  tracesSampleRate: 1.0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
