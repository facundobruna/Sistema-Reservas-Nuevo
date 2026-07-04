export const es = {
  common: {
    confirm: "Confirmar",
    cancel: "Cancelar",
    save: "Guardar",
    back: "Volver",
    next: "Siguiente",
    loading: "Cargando…",
    retry: "Reintentar",
    change: "Cambiar",
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
  booking: {
    partySize: {
      question: "¿Cuántos son?",
    },
    date: {
      question: "¿Qué día?",
    },
    time: {
      question: "¿A qué hora?",
      subtitle: "Para {n} el {date}",
    },
    zone: {
      question: "¿Dónde preferís sentarte?",
    },
    contact: {
      question: "Tus datos",
      subtitle: "Para confirmar la reserva",
    },
    fields: {
      name: "Nombre",
      phone: "Teléfono",
      email: "Email (opcional)",
      specialRequests: "Pedido especial (opcional)",
    },
    today: "Hoy",
    tomorrow: "Mañana",
    person: "persona",
    people: "personas",
    noSlots: {
      title: "No hay horarios disponibles",
      description: "Probá con otra fecha o menos comensales.",
    },
    zoneFull: {
      title: "Esa zona ya no tiene lugar a esa hora",
      description: "Elegí otra zona o volvé a elegir horario.",
    },
    confirmReservation: "Confirmar reserva",
    confirming: "Confirmando…",
    confirmation: {
      title: "¡Reserva confirmada!",
      subtitle: "Te esperamos el {date} a las {time}, para {n}.",
    },
  },
  me: {
    title: "Tus reservas",
    loginPrompt: "Ingresá tu teléfono para ver tus reservas",
    sendLink: "Enviarme el link",
    sending: "Enviando…",
    linkSentTitle: "Revisá tu email",
    linkSentDescription: "Te mandamos un link para entrar. Vale 15 minutos.",
    invalidLink: "Ese link ya no es válido. Pedí uno nuevo.",
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
    change: "Change",
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
  booking: {
    partySize: {
      question: "How many?",
    },
    date: {
      question: "What day?",
    },
    time: {
      question: "What time?",
      subtitle: "For {n} on {date}",
    },
    zone: {
      question: "Where would you like to sit?",
    },
    contact: {
      question: "Your details",
      subtitle: "To confirm the reservation",
    },
    fields: {
      name: "Name",
      phone: "Phone",
      email: "Email (optional)",
      specialRequests: "Special request (optional)",
    },
    today: "Today",
    tomorrow: "Tomorrow",
    person: "person",
    people: "people",
    noSlots: {
      title: "No times available",
      description: "Try another date or a smaller party.",
    },
    zoneFull: {
      title: "That area has no room at that time",
      description: "Pick another area or go back and choose a different time.",
    },
    confirmReservation: "Confirm reservation",
    confirming: "Confirming…",
    confirmation: {
      title: "Reservation confirmed!",
      subtitle: "See you on {date} at {time}, for {n}.",
    },
  },
  me: {
    title: "Your reservations",
    loginPrompt: "Enter your phone to see your reservations",
    sendLink: "Email me the link",
    sending: "Sending…",
    linkSentTitle: "Check your email",
    linkSentDescription: "We sent you a link to sign in. Valid for 15 minutes.",
    invalidLink: "That link is no longer valid. Request a new one.",
  },
} satisfies typeof es;
