import type { MessageKey } from './messages.en';

/** Spanish copy — see `messages.en.ts`, the source catalog. */
export const es: Record<MessageKey, string> = {
  'common.aClub': 'un club',
  'common.theClub': 'el club',
  'common.aPlayer': 'Un jugador',

  'club.added.title': 'Te han añadido a {club}',
  'club.added.body':
    'Tu membresía del club está activa. Toca para ver el club.',
  'club.joined.title': 'Te has unido a {club}',
  'club.joined.body': 'Ya tienes acceso a los anuncios y al muro del club.',
  'club.joinRequest.title': '{name} ha pedido unirse a {club}',
  'club.joinRequest.body': 'Revisa la solicitud en Miembros.',

  'league.registered.title': 'Ya estás inscrito',
  'league.registered.body':
    '{league}. Te avisaremos cuando se abra tu primera ronda.',
  'league.waitlisted.title': 'Estás en la lista de espera',
  'league.waitlisted.body':
    '{league} está completa. Entrarás automáticamente si se libera una plaza.',
  'league.promoted.title': 'Estás dentro',
  'league.promoted.body':
    'Se ha liberado una plaza en {league}. Te hemos inscrito.',
  'league.roundOpen.title': 'La ronda {round} ya está abierta',
  'league.roundOpen.body': '{league}: consulta tu partido y acordad una hora.',
  'ladder.challenge.title': 'Desafío de escalera',
  'ladder.challenge.body':
    'Te han desafiado en {ladder}. Acepta para programar el partido.',

  'connection.request.title': '{name} quiere conectar contigo',
  'connection.request.body': 'Revisa su solicitud para aceptarla o rechazarla.',
  'connection.accepted.title': '{name} ha aceptado tu solicitud de conexión',
  'connection.accepted.body': 'Ya estáis conectados.',

  'match.challenge.title': '{name} te ha desafiado a un partido',
  'match.challenge.body': 'Revisa el desafío para aceptarlo o rechazarlo.',
  'match.partnerInvite.title': '{name} te quiere como pareja de dobles',
  'match.partnerInvite.body': 'Acepta para unirte al partido.',
  'match.everyoneIn.title': 'Ya estáis todos: acordad una hora',
  'match.everyoneIn.body': 'Propón una hora para programar el partido.',
  'match.accepted.title': '{name} ha aceptado tu desafío',
  'match.accepted.body': 'Esperando al resto de jugadores.',
  'match.declined.title': '{name} ha rechazado tu desafío',
  'match.declined.body': 'Busca otro rival cuando quieras.',
  'match.timeProposed.title': '{name} ha propuesto una hora',
  'match.timeProposed.body': 'Elige una que te venga bien o propón la tuya.',
  'match.confirmed.title': 'Tu partido está confirmado',
  'match.confirmed.body': 'Fijado para el {date}.',
  'match.courtSuggested.title': '{name} ha sugerido una pista',
  'match.reschedule.title': '{name} quiere cambiar la fecha',
  'match.reschedule.body': 'Propón una nueva hora para retomarlo.',
  'match.cancelled.title': '{name} ha cancelado el partido',
  'match.cancelled.noReason': 'Sin motivo indicado.',
  'match.withdrawn.title': '{name} ha retirado el desafío',
  'match.withdrawn.body': 'Este desafío ya no está disponible.',

  'result.submitted.title': '{name} ha enviado un resultado',
  'result.submitted.body': 'Revísalo para confirmarlo o disputarlo.',
  'result.confirmed.title': '{name} ha confirmado tu resultado',
  'result.confirmed.body': 'Tu nivel y tus estadísticas están actualizados.',
  'result.disputed.title': '{name} ha disputado el resultado',
  'result.disputed.body': 'Abre la disputa para enviar tu versión.',
  'result.resolved.title': 'Tu disputa se ha resuelto',
  'result.resolved.body':
    'Las dos versiones coinciden: los niveles están actualizados.',
  'result.revised.title': '{name} ha modificado su versión',
  'result.revised.body':
    'Sigue sin coincidir con la tuya: échale otro vistazo.',
  'result.ruled.title': 'Un administrador del club ha resuelto tu disputa',
  'result.ruled.body':
    'El resultado es definitivo y los niveles están actualizados.',

  'message.new.title': 'Nuevo mensaje de {name}',
  'message.newInCommunity.title': '{community}: {name}',

  // Communities
  'community.approved.title': 'Tu comunidad ya está activa',
  'community.approved.body':
    '{community} fue aprobada. Invita a las personas con las que juegas.',
  'community.rejected.title': 'Tu comunidad no fue aprobada',
  'community.rejected.body': '{community}: {note}',
  'community.rejectedNoNote.body':
    '{community} no cumple las normas de las comunidades.',
  'community.joinRequest.title': '{name} quiere unirse a {community}',
  'community.joinRequest.body': 'Revisa la solicitud en Gestionar comunidad.',
  'community.requestApproved.title': 'Ya formas parte de {community}',
  'community.requestApproved.body': 'Saluda en el chat de la comunidad.',
  'community.requestDeclined.title': 'Solicitud no aceptada',
  'community.requestDeclined.body':
    '{community} no aceptó tu solicitud para unirte.',
  'community.removed.title': 'Te eliminaron de {community}',
  'community.removed.body': 'Un administrador te eliminó de esta comunidad.',
  'community.suspended.title': '{community} fue suspendida',
  'community.suspended.body':
    'Su chat es de solo lectura mientras Drift Tennis la revisa.',
  'community.restored.title': '{community} ha vuelto',
  'community.restored.body': 'El chat de la comunidad vuelve a estar abierto.',
  'community.deleted.title': '{community} se cerró',
  'community.deleted.body': 'Esta comunidad ya no existe.',
  'community.madeAdmin.title': 'Ahora eres administrador de {community}',
  'community.madeAdmin.body':
    'Puedes aprobar solicitudes y gestionar miembros.',
  'community.ownershipTransferred.title':
    'Ahora eres el propietario de {community}',
  'community.ownershipTransferred.body':
    'Puedes gestionar todo en esta comunidad.',
  'community.newLeague.title': 'Nueva liga en {community}',
  'community.newLadder.title': 'Nueva escalera en {community}',
  'community.newCompetition.body':
    '{competition}. Abre la comunidad para participar.',


  'home.empty.title': 'Lo tienes todo al día',
  'home.empty.body':
    'Ahora mismo no hay nada pendiente. Busca un jugador cerca y organiza tu próximo partido.',
  'home.action.findPlayers': 'Buscar jugadores',
  'home.action.viewAll': 'Ver todo',
  'home.action.openClub': 'Abrir {club}',
  'home.action.open': 'Abrir',
  'home.action.viewChallenge': 'Ver desafío',
  'home.action.openFixture': 'Ver partido',
  'home.action.findCourts': 'Buscar pistas',
  'home.action.addPadel': 'Añadir pádel',
  'home.action.viewRequests': 'Ver solicitudes',
  'home.action.reviewDispute': 'Revisar disputa',
  'home.action.reviewScore': 'Revisar resultado',
  'home.action.openInbox': 'Abrir mensajes',
  'home.action.viewMatch': 'Ver partido',
  'home.achievements.title': '{earned} de {total} logros',
  'home.achievements.next': 'Siguiente: {title} — {criteria}',
  'home.achievements.keepPlaying': 'Sigue jugando para desbloquear el resto.',
  'home.skill.FOREHAND': 'derecha',
  'home.skill.BACKHAND': 'revés',
  'home.skill.SERVE': 'saque',
  'home.skill.RETURN': 'resto',
  'home.skill.NET_PLAY': 'juego en la red',
  'home.skill.MOVEMENT': 'desplazamiento',
  'home.skill.MATCH_PLAY': 'juego en partido',
  'home.recommendation.title': 'Trabaja tu {skill}',
  'home.recommendation.drill':
    '«{title}» es un ejercicio elegido para tu nivel.',
  'home.recommendation.lesson':
    '«{title}» es una lección elegida para tu nivel.',
  'home.challenge.title': '{name} te ha desafiado',
  'home.challenge.singles': 'Un partido individual.',
  'home.challenge.doubles': 'Un partido de dobles.',
  'home.challenge.respond': 'Acepta o rechaza para responder.',
  'home.challenge.expiresToday': 'Caduca hoy.',
  'home.challenge.expiresTomorrow': 'Caduca mañana.',
  'home.challenge.expiresInDays': 'Caduca en {days} días.',
  'home.round.title': 'La ronda {round} cierra {when}',
  'home.round.withinHour': 'en menos de una hora',
  'home.round.inHours': 'en {hours} horas',
  'home.round.tomorrow': 'mañana',
  'home.round.inDays': 'en {days} días',
  'home.round.scheduled':
    'Juega tu partido de {league} y registra el resultado antes del plazo, o se registrará como walkover.',
  'home.round.unscheduled':
    'Aún no habéis acordado hora para tu partido de {league}. Los partidos no jugados se registran como walkover.',
  'home.courts.title': 'Pistas cerca de ti',
  'home.courts.distance': '{name} está a unos {km} km.',
  'home.courts.nearby': '{name} y otras están cerca.',
  'home.padel.title': 'El pádel te espera',
  'home.padel.learn':
    'Nos dijiste que quieres aprender pádel. Haz la breve evaluación y fijaremos tu nivel inicial.',
  'home.padel.plays':
    'Nos dijiste que también juegas al pádel. Añádelo a tu perfil para tener nivel e historial de partidos.',
  'home.connections.one': '{name} quiere conectar contigo',
  'home.connections.many': '{count} personas quieren conectar contigo',
  'home.connections.oneBody':
    'Conectar desbloquea su perfil completo y os permite enviaros mensajes.',
  'home.connections.manyBody':
    'Entre ellas, {name}. Conectar desbloquea los perfiles completos y los mensajes.',
  'home.opponents.title': 'Jugadores de tu nivel',
  'home.opponents.one': 'Un jugador cercano parece un buen rival.',
  'home.opponents.many': '{count} jugadores cercanos parecen buenos rivales.',
  'home.result.yourOpponent': 'Tu rival',
  'home.result.disputedTitle': 'Hay un resultado en disputa',
  'home.result.disputedBody':
    '{name} y tú habéis registrado resultados distintos. Compara ambas versiones para resolverlo.',
  'home.result.confirmTitle': 'Confirma el resultado de tu partido',
  'home.result.confirmBody':
    '{name} ha enviado un resultado. Confírmalo para fijar el nivel de ambos.',
  'home.messages.one': 'Tienes un mensaje nuevo',
  'home.messages.many': '{count} mensajes sin leer',
  'home.messages.oneThread': 'En una conversación.',
  'home.messages.manyThreads': 'En {count} conversaciones.',
  'home.upcoming.yourOpponent': 'tu rival',
  'home.upcoming.title': 'Próximo: {name}',
  'home.upcoming.at': 'En {venue}.',
  'home.upcoming.noCourt': 'Aún no hay pista acordada.',

  'mail.signoff': '— Drift Tennis',

  'mail.code.signup.subject': 'Tu código de verificación de Drift Tennis',
  'mail.code.signup.lead':
    'Bienvenido a Drift Tennis. Tu código de verificación de correo es:',
  'mail.code.passwordReset.subject': 'Restablece tu contraseña de Drift Tennis',
  'mail.code.passwordReset.lead':
    'Usa el código de abajo para restablecer tu contraseña de Drift Tennis:',
  'mail.code.expiry':
    'El código caduca en 10 minutos y solo se puede usar una vez.',
  'mail.code.ignore':
    'Si no lo has solicitado, ignora este correo: tu cuenta está a salvo.',

  'mail.clubSetup.subject':
    'Tu club de Drift Tennis ha sido aprobado: termina de configurarlo',
  'mail.clubSetup.approved':
    'Tu solicitud para crear un club ha sido aprobada.',
  'mail.clubSetup.finish': 'Termina de configurar la cuenta de tu club:',
  'mail.ignoreIfNotRequested': 'Si no lo has solicitado, ignora este correo.',
  'mail.clubWelcome.subject': 'Te han añadido a {club} en Drift Tennis',
  'mail.clubWelcome.added': 'Te han añadido a {club} como {role}.',
  'mail.clubWelcome.open': 'Abre la app de Drift Tennis para ver tu club.',
  'mail.role.OWNER': 'propietario',
  'mail.role.ADMIN': 'administrador',
  'mail.role.COMPETITION_MANAGER': 'responsable de competiciones',
  'mail.role.COACH': 'entrenador',
  'mail.role.CONTENT_MANAGER': 'responsable de contenido',
  'mail.role.READ_ONLY': 'miembro de solo lectura',

  'mail.welcome.greetingNamed': 'Hola, {name}:',
  'mail.welcome.greeting': 'Hola:',
  'mail.welcome.subject': 'Bienvenido a Drift Tennis',
  'mail.welcome.body':
    'Bienvenido a Drift Tennis: nos alegra mucho que estés aquí.\n\nDrift te ayuda a encontrar gente con la que jugar, mejorar tu juego\ny seguir conectado con tu comunidad de tenis.\n\nCompleta tu perfil para empezar y descubre jugadores, clubes y\npartidos cerca de ti. Tanto si vienes a jugar, a entrenar o a crear la comunidad\nde un club, ya formas parte de la comunidad Drift.\n\nNos vemos en la pista,',
  'mail.welcomeClub.subject': 'Bienvenido a Drift Tennis: {club} está listo',
  'mail.welcomeClub.body':
    'Bienvenido a Drift Tennis: nos encanta que {club} se una a la comunidad.\n\nEl espacio de tu club está listo. Añade los datos que ayudan a los jugadores a encontrarte,\ninvita a tu equipo y comparte tu primer anuncio cuando quieras.\n\nNos alegra tenerte aquí y tenemos ganas de ver crecer tu comunidad.',

  'mail.waitlist.subject': 'Estás en la lista de espera de Drift Tennis',
  'mail.waitlist.greetingNamed': 'Estás en la lista de Drift Tennis, {name}.',
  'mail.waitlist.greeting': 'Estás en la lista de Drift Tennis.',
  'mail.waitlist.body':
    'Te enviaremos novedades del lanzamiento y, de vez en cuando, noticias u ofertas\nde Drift Tennis. Para dejar de recibir correos no esenciales, escribe a drift@einsbrand.com\ncon «Unsubscribe» en el asunto.\nUnirse y jugar es gratis mientras arrancamos.\nPrimero Android, después iOS.\n\nSi no te has apuntado, ignora este correo y escríbenos si quieres\nque eliminemos la dirección.',

  'mail.support.subject':
    'Re: {subject} — nueva respuesta del soporte de Drift Tennis',
  'mail.support.lead': 'El equipo de soporte ha respondido a tu solicitud:',
  'mail.support.open':
    'Abre la app de Drift Tennis para continuar la conversación.',
};
