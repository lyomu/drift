import type { Dictionary } from "./types";

/**
 * Traducción al español. Misma forma que `en.ts`; cualquier clave faltante o
 * sobrante rompe la compilación. Mismas reglas de voz: sin rayas (em dash) en
 * el texto renderizado, y ninguna promesa que el producto no cumpla.
 */
export const es: Dictionary = {
  locale: "es",
  meta: {
    title: "Drift Tennis · Encuentra jugadores de tenis y juega ligas",
    description:
      "Encuentra rivales de tenis y pádel a tu nivel, confirma el resultado entre los dos y construye una valoración fiable. Gratis. Primero en Android.",
  },
  header: {
    sectionsAria: "Secciones",
    padel: "Pádel",
    forClubs: "Para clubes",
    legal: "Legal",
    joinCta: "Únete a la lista de espera",
    backToSite: "← Volver al sitio",
  },
  hero: {
    quotePrefix: "«Debería jugar más al ",
    wordTennis: "tenis.",
    wordPadel: "pádel.",
    quoteSuffix: "»",
    strikeAria: "Debería jugar más al tenis o al pádel.",
    resolve: "Tienes partido el sábado.",
    body: "Pensado para deportes de raqueta, Drift Tennis te encuentra rivales a tu nivel, agenda el partido, registra el resultado que ambos jugadores confirman y convierte tu temporada en una valoración fiable. El tenis lidera, el pádel corre por la misma vía y ambos viven en una sola app, en lugar de una web de reservas, tres grupos de WhatsApp y una escalera en hoja de cálculo.",
    ctaPrimary: "Únete a la lista de espera",
    ctaSecondary: "Cómo funciona una temporada ↓",
    freeNote: "Gratis mientras arrancamos. Primero Android, luego iOS.",
  },
  loopStrip: {
    heading: "Un bucle, cinco etapas, y vuelves a entrar cada semana",
    stages: [
      { name: "Descubrir", line: "Encuentra tu nivel y a quién jugar." },
      { name: "Jugar", line: "Conviértelo en un partido real." },
      { name: "Competir", line: "Temporadas, clasificaciones, una valoración." },
      { name: "Mejorar", line: "Sabe qué entrenar después." },
      { name: "Conectar", line: "Permanece en tu comunidad de tenis." },
    ],
  },
  chapters: [
    {
      id: "discover",
      numeral: "1",
      title: "Descubrir",
      stages: ["Descubrir"],
      tagline: "Encuentra tu nivel. Encuentra a tu gente.",
      intro:
        "Una valoración breve y honesta te sitúa en una escala de 1.0 a 7.0. El descubrimiento sigue siendo seguro para principiantes: solo te presenta jugadores con los que de verdad puedes intercambiar pelotas.",
      items: [
        {
          title: "Valoración adaptativa",
          body: "Trece preguntas estiman tu nivel y tu perfil de golpes. ¿No estás de acuerdo con el resultado? Ajústalo. La app te recibe donde estás.",
          badge: { text: "En el registro", tone: "badge-primary" },
        },
        {
          title: "Descubrimiento de jugadores",
          body: "Filtra jugadores por nivel, distancia, formato y disponibilidad. Las ubicaciones exactas y los datos de contacto nunca salen del servidor. La distancia se muestra en bandas aproximadas, como «a unos 3 km».",
          badge: { text: "Privacidad primero", tone: "badge-success" },
        },
        {
          title: "Canchas y clubes cercanos",
          body: "Superficie, interior o exterior, iluminación, tipo de reserva, y campos honestamente vacíos donde un lugar no ha sido verificado, nunca un teléfono inventado.",
          badge: { text: "Buscador de canchas", tone: "badge-primary" },
        },
      ],
    },
    {
      id: "compete",
      numeral: "2",
      title: "Jugar & Competir",
      stages: ["Jugar", "Competir"],
      tagline: "De «¿jugamos un partido?» al encuentro agendado.",
      intro:
        "La agenda es estructurada, no un laberinto de chats. Propón horarios, contrapropón, acuerden una cancha. El partido solo sale de PROPUESTO cuando todos están dentro de verdad.",
      items: [
        {
          title: "Desafíos estructurados",
          body: "Desafía a un jugador conectado, propón horarios, sugiere una cancha, contrapropón hasta tres rondas. Luego la app te lleva a la conversación, no a otra semana de idas y vueltas.",
          badge: { text: "Propuestas de horario", tone: "badge-primary" },
        },
        {
          title: "Dobles, como debe ser",
          body: "Tú nombras a tu pareja por adelantado; tu rival nombra al suyo al aceptar. El partido es real cuando los cuatro jugadores han aceptado.",
          badge: { text: "Flujo de cuatro jugadores", tone: "badge-primary" },
        },
        {
          title: "Resultados en los que ambos confían",
          body: "Un jugador anota el resultado, el otro confirma o disputa. Ambas versiones se guardan hasta que coinciden, así las valoraciones quedan limpias y sin discusión.",
          badge: { text: "Confirmar o disputar", tone: "badge-success" },
        },
      ],
      coda: {
        name: "Competir",
        tagline: "Clasificaciones que significan algo.",
        intro:
          "Ligas de verdad: ventanas de registro, listas de espera, emparejamiento automático round-robin, encuentros e instantáneas de clasificación que recuerdan tu movimiento semana a semana.",
        items: [
          {
            title: "Ligas con temporadas de verdad",
            body: "Regístrate (o quédate en la fila), recibe tus encuentros cuando la ronda abre y júegalos con el mismo flujo de agenda y resultados que cualquier partido.",
            badge: { text: "Temporadas y rondas", tone: "badge-primary" },
          },
          {
            title: "Una valoración fiable",
            body: "Un motor tipo Elo sobre la misma escala de 1.0 a 7.0 que tu perfil, así cada número de la app es una unidad comparable. Los walkovers y los retiros se resuelven por regla, no a pulmones.",
            badge: { text: "1.0 – 7.0", tone: "badge-primary" },
          },
          {
            title: "Clasificaciones con historial",
            body: "Instantáneas de la clasificación al cerrar cada ronda, así la flecha de movimiento junto a tu nombre se gana, no decora.",
            badge: { text: "Flechas de movimiento", tone: "badge-success" },
          },
        ],
      },
    },
    {
      id: "improve",
      numeral: "3",
      title: "Mejorar & Conectar",
      stages: ["Mejorar", "Conectar"],
      tagline: "Sabe qué entrenar el martes.",
      intro:
        "Tu valoración dice cómo compites; tu perfil de golpes dice por qué. Drift guarda ambas y apunta tu entrenamiento a la más débil.",
      items: [
        {
          title: "Un perfil de golpes real",
          body: "Saque, derecha, revés, devolución, volea, desplazamiento y juego de partido, combinados a partir de tu valoración inicial y tus entrenamientos registrados, nunca una adivinanza disfrazada de porcentaje.",
          badge: { text: "Siete pilares", tone: "badge-primary" },
        },
        {
          title: "Lecciones, ejercicios, planes",
          body: "Recomendaciones a tu nivel y a tu golpe más débil, más planes de entrenamiento que los ordenan en algo que puedes seguir de verdad.",
          badge: { text: "Centro de aprendizaje", tone: "badge-primary" },
        },
        {
          title: "Objetivos con progreso honesto",
          body: "Fija una meta, recibe hitos y un estado que compara tu ritmo real con el plan: EN CAMINO o EN RETRASO, no una palmadita en la espalda.",
          badge: { text: "Hitos", tone: "badge-success" },
        },
      ],
      coda: {
        name: "Conectar",
        tagline: "Tu vida de tenis, en un solo lugar.",
        intro:
          "Conexiones, mensajes, anuncios del club y noticias de tenis, con el canal oficial separado del ruido del chat de grupo.",
        items: [
          {
            title: "Mensajería con contexto",
            body: "Cada partido tiene su propio hilo, y cada cambio de estado (propuesto, aceptado, disputado) llega como mensaje de sistema que puedes releer al subir.",
            badge: { text: "Hilos de partido", tone: "badge-primary" },
          },
          {
            title: "Clubes y anuncios",
            body: "Sigue el feed de tu club y mantén los anuncios oficiales aparte de la charla informal, para que «llueve» no apague «la ronda empieza el lunes».",
            badge: { text: "Feed del club", tone: "badge-primary" },
          },
          {
            title: "Noticias de tenis, categorizadas",
            body: "Pro, jugadores, torneos, local, África, clubes y comunidad, resumidas y atribuidas, con enlace a la historia original.",
            badge: { text: "Feed de noticias", tone: "badge-neutral" },
          },
        ],
      },
    },
  ],
  padel: {
    eyebrow: "Segundo deporte · Mis deportes",
    title: "El pádel, un segundo deporte de verdad",
    body: "Añade el pádel desde tu perfil y correrá por la misma vía que tu tenis, con su propia valoración, su propio puntaje y su propio historial de partidos, totalmente separado de tu historial de tenis. El tenis lidera aquí y conserva el nombre; el pádel no es un adorno.",
    points: [
      "Una valoración y un puntaje de pádel propios, independientes de tu nivel de tenis",
      "Ligas y escaleras de pádel, creadas por clubes igual que las de tenis",
      "Canchas, clubes, entrenadores y lecciones etiquetados por deporte, para que nada se mezcle",
      "Un perfil, dos historiales, y activas el segundo solo cuando lo quieras",
    ],
  },
  standings: {
    badge: "Tiempo cumplido",
    title: "Tu temporada, de un vistazo",
    bullets: [
      "· Encuentros automáticos round-robin por temporada",
      "· Resultados confirmados por el rival, disputas guardadas hasta resolverse",
      "· Instantáneas de clasificación con movimiento semana a semana",
    ],
    cardTitle: "Liga del sábado · Clasificación",
    cardBadge: "Tras la ronda 6",
    columns: ["#", "Jugador", "PJ", "G", "P", "Nivel", "Forma"],
    note: "Datos ilustrativos. Así luce una tabla de clasificación en vivo en la app.",
  },
  clubs: {
    badge: "Para clubes y academias",
    title: "Gestiona tu club sin la hoja de cálculo",
    body: "Los administradores de club tienen su propia consola: creen ligas y temporadas, dejen que Drift genere los encuentros, resuelvan disputas desde una cola real, mantengan miembros y anuncios en un solo lugar, y dejen sus canchas visibles para cada jugador cercano.",
    points: [
      "Gestión de ligas, temporadas, encuentros y disputas",
      "Miembros, roles, invitaciones y moderación",
      "Listado y verificación de canchas",
      "Suscripciones de club facturadas en KES vía IntaSend",
    ],
    cta: "Habla con nosotros",
  },
  final: {
    badge: "La final",
    title: "Tu temporada empieza con un partido",
    body: "Regístrate, haz la valoración y Drift hace el resto: rivales a tu nivel, el encuentro en tu calendario y una valoración que solo se mueve cuando los resultados se confirman.",
    cta: "Únete a la lista de espera",
    note: "Gratis mientras arrancamos. Primero Android, luego iOS. Las tiendas aún no están activas, así que la lista de espera es cómo te enteras primero.",
  },
  appScreens: {
    illustrative: "Pantallas ilustrativas de la app, no datos reales de jugadores.",
    fixture: {
      badge: "Siguiente · Ronda 3",
      format: "Dobles",
      rating: "Nivel",
      date: "Sáb · 16:00",
      accepted: "✓ Horario aceptado",
      footnote: "Cancha de club sugerida · 2 de 3 propuestas resueltas",
    },
    challenge: {
      badge: "Desafío entrante",
      line: "{name} te desafió",
      proposed: "Propuesto: dom 10:00 o 17:00",
      accept: "Aceptar",
      proposeTime: "Proponer horario",
    },
    skill: {
      title: "Perfil de golpes",
      ratingBadge: "Nivel 3.5",
      pillars: {
        serve: "Saque",
        forehand: "Derecha",
        backhand: "Revés",
        return: "Devolución",
        net: "Volea",
        movement: "Desplazamiento",
        matchPlay: "Juego de partido",
      },
      practiseTitle: "A entrenar después: el revés",
      practiseBody: "3 ejercicios a tu nivel",
    },
  },
  footer: {
    tagline: "Encuentra tu partido. Juega tu temporada.",
    product: "Producto",
    legal: "Legal",
    contact: "Contacto",
    theLoop: "El bucle",
    forClubs: "Para clubes",
    join: "Únete a la lista de espera",
    productAria: "Enlaces de producto del pie de página",
    legalAria: "Enlaces legales del pie de página",
    copyright: "Copyright {year} Drift Tennis.",
  },
  waitlist: {
    eyebrow: "Antes del primer saque",
    title: "Sé parte de la primera ronda",
    body: "Drift Tennis se lanza primero en Android, con iOS después, y es gratis unirse y gratis jugar mientras arrancamos. El tenis lidera, el pádel también está. Deja tu nombre y tu correo y te enviaremos noticias de lanzamiento, novedades internas del producto y alguna oferta ocasional de Drift Tennis. Puedes dejar de recibir correos no esenciales cuando quieras.",
    metaDescription: "Únete a la lista de espera de Drift Tennis y te avisaremos por correo al lanzar. Gratis, primero en Android y luego iOS. El tenis lidera, el pádel también.",
    note: "No vendemos ni compartimos tu correo para el marketing de otro negocio.",
    audiences: [
      { value: "PLAYER", label: "Un jugador", hint: "Quiero jugar más tenis o pádel" },
      { value: "CLUB", label: "Un club o entrenador", hint: "Organizo competiciones o enseño" },
    ],
    levels: [
      { value: "", label: "Prefiero no decirlo" },
      { value: "1.0-2.0", label: "Recién empezando (1.0 – 2.0)" },
      { value: "2.5-3.5", label: "Mejorando (2.5 – 3.5)" },
      { value: "4.0-5.0", label: "Jugador de club sólido (4.0 – 5.0)" },
      { value: "5.5-7.0", label: "Competitivo (5.5 – 7.0)" },
      { value: "unsure", label: "Aún no lo sé" },
    ],
    success: {
      title: "Estás en la lista.",
      personalTitle: "Estás en la lista, {name}.",
      body: "Primero enviaremos noticias de lanzamiento, luego novedades internas del producto y ofertas ocasionales. Puedes dejar de recibir correos no esenciales en cualquier momento.",
    },
    form: {
      firstName: "Nombre",
      firstNamePlaceholder: "Sarah",
      email: "Correo electrónico",
      legend: "Soy…",
      country: "País",
      optional: "(opcional)",
      selectCountry: "Selecciona un país",
      city: "Ciudad",
      cityPlaceholder: "Tu ciudad",
      level: "Nivel",
      errorFirstName: "Dinos tu nombre para saber cómo llamarte.",
      errorEmail: "Escribe un correo electrónico donde podamos contactarte.",
      errorGeneric: "Eso no salió.",
      submitting: "Añadiéndote…",
      submit: "Únete a la lista de espera",
      badge: "En la lista",
      privacyLink: "Política de privacidad",
    },
  },
};
