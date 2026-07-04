# Fricción del flujo de reserva

Métrica norte del producto (ver `prompt-maestro-desde-cero.md`): tiempo y cantidad de toques hasta confirmar. Este número es un **presupuesto** — cualquier cambio que lo suba se discute antes de sumarlo.

## Conteo actual (`/r/{slug}`)

Medido sobre el flujo real implementado en M6, para un restaurante con **2 zonas** (el caso del demo — el peor caso en cantidad de pasos; un restaurante de 1 zona se salta el paso de zona):

| # | Paso | Interacción | Toques |
|---|------|-------------|--------|
| 1 | Comensales | Tap en un chip (1-6 o "7+") | 1 |
| 2 | Fecha | Tap en "Hoy" / "Mañana" (o abrir el date picker nativo para otra fecha) | 1 |
| 3 | Horario | Tap en un chip de horario | 1 |
| 4 | Zona | Tap en un chip de zona — **se salta entero si el restaurante tiene una sola zona** | 1 |
| 5 | Datos | Completar nombre y teléfono (obligatorios; email y pedido especial son opcionales) + tap en "Confirmar reserva" | 2 campos + 1 tap |
| 6 | Confirmación | Automática, sin acción del usuario | 0 |

**Total: 5 taps + 2 campos de texto obligatorios** (nombre, teléfono) para un restaurante con 2+ zonas.
**Total: 4 taps + 2 campos de texto obligatorios** para un restaurante con 1 sola zona (el caso más común).

No hay: login obligatorio, DNI, seña, ni instalar una app. El estado completo vive en la URL (`partySize`, `date`, `time`, `zoneId`, `reservationId`), así que atrás/refresh/compartir el link funcionan en cualquier paso sin perder el progreso.

## Decisiones que mantienen esto bajo

- **Zona se pregunta después del horario, no antes** (ver decisión de arquitectura en la conversación de M6): en el caso común, todas las zonas tienen los mismos horarios libres, así que preguntar zona primero solo agregaría un tap sin aportar información. Se pregunta recién cuando ya eligieron horario, y se salta directamente si solo hay una zona.
- **Cuenta passwordless en segundo plano**: `bookReservation` linkea/crea el `customer` por teléfono automáticamente — no hay paso de "crear cuenta" ni contraseña que inventar.
- **Login por magic link es completamente opcional** y vive fuera del flujo de reserva (en `/me`), pensado solo para volver a ver reservas desde otro dispositivo — no agrega ningún toque al flujo de reservar.
- **"Hoy" / "Mañana"** cubren el caso más común de un solo tap; el date picker nativo del navegador cubre el resto sin que tengamos que construir un calendario custom.

## Qué subiría el presupuesto (evitar sin discutirlo antes)

- Pedir confirmación de teléfono/email antes de reservar (OTP, etc.) — rompe la promesa de cero fricción.
- Forzar el paso de zona incluso con una sola zona disponible.
- Cualquier paso intermedio de "revisá tu reserva" antes de confirmar — hoy el submit del paso 5 reserva directo.
