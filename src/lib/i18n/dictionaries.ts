export const es = {
  common: {
    confirm: "Confirmar",
    cancel: "Cancelar",
    save: "Guardar",
    back: "Volver",
    next: "Siguiente",
    loading: "Cargando…",
    retry: "Reintentar",
  },
  reservationStatus: {
    pending: "Pendiente",
    confirmed: "Confirmada",
    seated: "Sentados",
    completed: "Completada",
    cancelled: "Cancelada",
    no_show: "No se presentó",
  },
  emptyStates: {
    noReservations: {
      title: "Todavía no hay reservas",
      description: "Cuando alguien reserve, va a aparecer acá.",
    },
  },
  errorStates: {
    generic: {
      title: "Algo no salió bien",
      description: "Intentá de nuevo en un momento. Si sigue pasando, avisanos.",
    },
    slotUnavailable: {
      title: "Ese horario ya no está disponible",
      description: "Alguien lo tomó justo antes. Elegí otro horario para seguir.",
    },
  },
};

export const en = {
  common: {
    confirm: "Confirm",
    cancel: "Cancel",
    save: "Save",
    back: "Back",
    next: "Next",
    loading: "Loading…",
    retry: "Retry",
  },
  reservationStatus: {
    pending: "Pending",
    confirmed: "Confirmed",
    seated: "Seated",
    completed: "Completed",
    cancelled: "Cancelled",
    no_show: "No-show",
  },
  emptyStates: {
    noReservations: {
      title: "No reservations yet",
      description: "Once someone books, it'll show up here.",
    },
  },
  errorStates: {
    generic: {
      title: "Something went wrong",
      description: "Try again in a moment. Let us know if it keeps happening.",
    },
    slotUnavailable: {
      title: "That time slot is no longer available",
      description: "Someone just took it. Pick another time to continue.",
    },
  },
} satisfies typeof es;
