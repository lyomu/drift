// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Spanish Castilian (`es`).
class AppLocalizationsEs extends AppLocalizations {
  AppLocalizationsEs([String locale = 'es']) : super(locale);

  @override
  String get achievementsCriteria => 'Requisitos';

  @override
  String get achievementsEarned => 'Conseguido';

  @override
  String get achievementsLoadFailed => 'No se han podido cargar los logros.';

  @override
  String get achievementsLocked => 'Bloqueado';

  @override
  String get achievementsYourBadges => 'Tus insignias';

  @override
  String get assessmentGoodProgress => 'Buen progreso';

  @override
  String get assessmentHalfway =>
      'Vas por la mitad. Las siguientes preguntas afinan tu nivel para que Drift te sugiera mejores partidos.';

  @override
  String get assessmentHistory => 'Historial de evaluaciones';

  @override
  String get assessmentLoadFailed => 'No se ha podido cargar la evaluación.';

  @override
  String get assessmentOnlyOne => 'Solo una evaluación hasta ahora';

  @override
  String assessmentQuestionOf(int current, int total) {
    return 'Pregunta $current de $total';
  }

  @override
  String get assessmentTitle => 'Evaluación de tenis';

  @override
  String get authAgePolicy =>
      'Confirmo que tengo 18 años o más y acepto los Términos y condiciones y la Política de privacidad.';

  @override
  String authAppleFailed(String details) {
    return 'No se ha podido completar el inicio de sesión con Apple. $details';
  }

  @override
  String get authAppleNoToken =>
      'Apple no ha devuelto ningún token de identidad. Inténtalo de nuevo.';

  @override
  String get authAppleUnavailable =>
      'El inicio de sesión con Apple aún no está disponible en este dispositivo.';

  @override
  String get authBackToLogin => 'Volver a iniciar sesión';

  @override
  String get authCode => 'Código';

  @override
  String get authConfirmNewPassword => 'Confirma la nueva contraseña';

  @override
  String get authContinueApple => 'Continuar con Apple';

  @override
  String get authContinueGoogle => 'Continuar con Google';

  @override
  String get authCreateAccount => 'Crear cuenta';

  @override
  String get authEmail => 'Correo electrónico';

  @override
  String get authFirstName => 'Nombre';

  @override
  String get authForgotPasswordIntro =>
      'Introduce el correo de tu cuenta y te enviaremos un código de seis dígitos para crear una contraseña nueva.';

  @override
  String get authForgotPasswordLink => '¿Has olvidado la contraseña?';

  @override
  String get authForgotPasswordTitle => 'Contraseña olvidada';

  @override
  String get authGoogleFailed =>
      'No se ha podido completar el inicio de sesión con Google.';

  @override
  String get authGoogleNoToken =>
      'Google no ha devuelto ningún token de identidad. Falta el ID de cliente de servidor de la app.';

  @override
  String get authHaveAccount => '¿Ya tienes cuenta? ';

  @override
  String get authLastName => 'Apellidos';

  @override
  String get authLink => 'Vincular';

  @override
  String authLinkBody(String email) {
    return '$email ya tiene una cuenta de Drift Tennis. Introduce su contraseña una vez y quedarán vinculadas; después podrás usar cualquiera de las dos para iniciar sesión.';
  }

  @override
  String get authLinkTitle => 'Vincula tu cuenta';

  @override
  String get authLogIn => 'Inicia sesión';

  @override
  String get authLogin => 'Iniciar sesión';

  @override
  String get authNeedAccount => '¿No tienes cuenta? ';

  @override
  String get authNewPassword => 'Nueva contraseña';

  @override
  String get authOnWhatsApp => 'Este número tiene WhatsApp';

  @override
  String get authPassword => 'Contraseña';

  @override
  String get authPasswordRule => 'Usa entre 8 y 72 caracteres.';

  @override
  String get authPasswordUpdated =>
      'Contraseña actualizada. Inicia sesión con la nueva contraseña.';

  @override
  String get authPasswordsDontMatch => 'Las contraseñas no coinciden.';

  @override
  String get authPhone => 'Número de teléfono';

  @override
  String get authPhoneOptional => 'Número de teléfono (opcional)';

  @override
  String get authResendCode => 'Reenviar código';

  @override
  String authResendCodeIn(int seconds) {
    return 'Reenviar código en $seconds s';
  }

  @override
  String authResendIn(int seconds) {
    return 'Reenviar en $seconds s';
  }

  @override
  String authResetPasswordIntro(String email) {
    return 'Si existe una cuenta para $email, te hemos enviado un código de seis dígitos. Introdúcelo abajo junto con tu nueva contraseña.';
  }

  @override
  String get authResetPasswordTitle => 'Restablecer contraseña';

  @override
  String get authSearchCountries => 'Buscar país';

  @override
  String authSelectCountry(String country, String code) {
    return 'Seleccionar país, actualmente $country, más $code';
  }

  @override
  String get authSendCode => 'Enviar código';

  @override
  String get authSetNewPassword => 'Guardar contraseña';

  @override
  String get authSignUp => 'Regístrate';

  @override
  String get authSixDigitCode => 'Código de seis dígitos';

  @override
  String get authVerify => 'Verificar';

  @override
  String authVerifyIntro(String email) {
    return 'Introduce el código de 6 dígitos que hemos enviado a $email.';
  }

  @override
  String get authVerifying => 'Verificando…';

  @override
  String get availBookOnline => 'Reserva online';

  @override
  String get availComingSoon => 'Reservas próximamente';

  @override
  String get availContactToBook => 'Contactar para reservar';

  @override
  String get availUnknown => 'Reservas desconocidas';

  @override
  String get blockedLoadFailed =>
      'No se han podido cargar los usuarios bloqueados.';

  @override
  String get blockedNone => 'No has bloqueado a nadie.';

  @override
  String get blockedUnblock => 'Desbloquear';

  @override
  String get blockedUnblocking => 'Desbloqueando…';

  @override
  String get clubAnnouncements => 'Anuncios';

  @override
  String get clubFeed => 'Muro del club';

  @override
  String get clubFormerMember => 'Antiguo miembro';

  @override
  String get clubInvited => 'Te han invitado a este club.';

  @override
  String get clubJoin => 'Unirse';

  @override
  String get clubJoinRequestSent => 'Solicitud enviada.';

  @override
  String get clubJoinToSeeAnnouncements =>
      'Únete a este club para ver sus anuncios.';

  @override
  String get clubJoinToSeeFeed =>
      'Únete a este club para ver su muro y publicar.';

  @override
  String get clubLeave => 'Salir del club';

  @override
  String get clubLoadFailed =>
      'No se han podido cargar los clubes. Desliza para reintentar.';

  @override
  String get clubNoAnnouncements => 'Aún no hay anuncios';

  @override
  String get clubNoCourtsListed => 'No hay pistas registradas';

  @override
  String get clubNoPosts => 'Aún no hay publicaciones';

  @override
  String get clubNoneNearby => 'Aún no hay clubes cerca';

  @override
  String get clubRequestPending =>
      'Tu solicitud está pendiente de un administrador del club.';

  @override
  String get clubRequestToJoin => 'Solicitar unirse';

  @override
  String get clubRequested => 'Solicitado';

  @override
  String get clubRequesting => 'Solicitando…';

  @override
  String get clubShareHint => 'Comparte algo con el club';

  @override
  String get clubSuspended => 'Tu membresía en este club está suspendida.';

  @override
  String get clubTitle => 'Club';

  @override
  String get clubUnavailable => 'Club no disponible.';

  @override
  String get clubViewCoaches => 'Ver entrenadores';

  @override
  String get clubWithdrawRequest => 'Retirar solicitud';

  @override
  String get coachContactBook => 'Contactar / Reservar';

  @override
  String get coachContactFailed =>
      'No se ha podido abrir ese método de contacto.';

  @override
  String coachContactName(String name) {
    return 'Contactar con $name';
  }

  @override
  String get coachEmail => 'Enviar correo al entrenador';

  @override
  String get coachFallbackName => 'Entrenador';

  @override
  String get coachFilters => 'Filtros de entrenadores';

  @override
  String get coachLoadFailed =>
      'No se han podido cargar los entrenadores. Desliza para reintentar.';

  @override
  String get coachNoneNearby => 'Aún no hay entrenadores cerca de ti';

  @override
  String get coachOpenBooking => 'Abrir página de reservas';

  @override
  String get coachPlayersCoached => 'Jugadores que entrena';

  @override
  String get coachQualifications => 'Titulaciones';

  @override
  String get coachSearchClub => 'Buscar por nombre de club';

  @override
  String get coachSelectedClub => 'Club seleccionado';

  @override
  String get coachSpecialisation => 'Especialidad';

  @override
  String get coachSpecialisationHint =>
      'p. ej., saque, juveniles, juego en partido';

  @override
  String get coachSpecialisations => 'Especialidades';

  @override
  String get coachTitle => 'Entrenador';

  @override
  String get coachUnavailable => 'El perfil del entrenador no está disponible.';

  @override
  String get comingSoon => 'Próximamente';

  @override
  String get comingSoonApple =>
      'El inicio de sesión con Apple aún no está listo; lo estamos configurando. De momento, usa Google o el correo.';

  @override
  String get commonAccept => 'Aceptar';

  @override
  String get commonAvailability => 'Disponibilidad';

  @override
  String get commonBack => 'Atrás';

  @override
  String commonCallNumber(String phone) {
    return 'Llamar al $phone';
  }

  @override
  String get commonCancel => 'Cancelar';

  @override
  String get commonCancelling => 'Cancelando…';

  @override
  String get commonClose => 'Cerrar';

  @override
  String get commonCompleted => 'Finalizado';

  @override
  String get commonConfirm => 'Confirmar';

  @override
  String get commonContact => 'Contactar';

  @override
  String get commonContinue => 'Continuar';

  @override
  String commonCourtCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count pistas',
      one: '1 pista',
    );
    return '$_temp0';
  }

  @override
  String get commonDecline => 'Rechazar';

  @override
  String get commonDelete => 'Eliminar';

  @override
  String get commonDistanceUnknown => 'Distancia desconocida';

  @override
  String get commonDone => 'Hecho';

  @override
  String get commonErrorGeneric => 'Algo ha fallado. Inténtalo de nuevo.';

  @override
  String get commonGoBack => 'Volver';

  @override
  String get commonGotIt => 'Entendido';

  @override
  String get commonInProgress => 'En curso';

  @override
  String commonKmAway(String km) {
    return 'a $km km';
  }

  @override
  String commonLevel(String level) {
    return 'Nivel $level';
  }

  @override
  String get commonLoading => 'Cargando…';

  @override
  String get commonNotAvailable => 'No disponible.';

  @override
  String get commonNotSet => 'Sin definir';

  @override
  String get commonNotesOptional => 'Notas (opcional)';

  @override
  String get commonOpen => 'Abierto';

  @override
  String get commonOpenAction => 'Abrir';

  @override
  String get commonOptionalSuffix => ' (opcional)';

  @override
  String get commonPlayer => 'Jugador';

  @override
  String commonPlayerCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count jugadores',
      one: '1 jugador',
    );
    return '$_temp0';
  }

  @override
  String get commonRetry => 'Reintentar';

  @override
  String get commonSave => 'Guardar';

  @override
  String get commonSaving => 'Guardando…';

  @override
  String get commonSearch => 'Buscar';

  @override
  String get commonSeeAll => 'Ver todo';

  @override
  String get commonSending => 'Enviando…';

  @override
  String get commonSkip => 'Omitir';

  @override
  String get commonSubmit => 'Enviar';

  @override
  String get commonSubmitting => 'Enviando…';

  @override
  String get commonThem => 'Rival';

  @override
  String get commonToday => 'Hoy';

  @override
  String get commonTryAgain => 'Intentar de nuevo';

  @override
  String get commonUnknown => 'Desconocido';

  @override
  String get commonUnknownDate => 'Fecha desconocida';

  @override
  String get commonUnrated => 'Sin nivel';

  @override
  String get commonUpdating => 'Actualizando…';

  @override
  String get commonVerified => 'Verificado';

  @override
  String get commonView => 'Ver';

  @override
  String get commonViewAll => 'Ver todo';

  @override
  String get commonViewDetails => 'Ver detalles';

  @override
  String get commonViewProfile => 'Ver perfil';

  @override
  String get commonVs => 'vs';

  @override
  String get commonWorking => 'Procesando…';

  @override
  String get commonYesterday => 'Ayer';

  @override
  String get commonYou => 'Tú';

  @override
  String get communityAboutHint => 'Para quién es, nivel, dónde soléis jugar…';

  @override
  String get communityAboutOptional => 'Acerca de · Opcional';

  @override
  String get communityAddPhoto => 'Añadir una foto';

  @override
  String get communityAddPhotoOptional => 'Añadir una foto (opcional)';

  @override
  String get communityApprove => 'Aprobar';

  @override
  String communityChallengeRange(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Se puede retar hasta $count puestos por encima',
      one: 'Se puede retar 1 puesto por encima',
    );
    return '$_temp0';
  }

  @override
  String get communityChallengeRangeHint =>
      'Hasta cuántos puestos por encima del suyo puede retar un jugador.';

  @override
  String get communityChangePhoto => 'Cambiar foto';

  @override
  String communityChatPreview(String name, String message) {
    return '$name: $message';
  }

  @override
  String get communityChatReadOnly =>
      'Esta comunidad está suspendida, así que su chat es de solo lectura.';

  @override
  String get communityChatUnavailable =>
      'El chat se abre cuando se aprueba la comunidad.';

  @override
  String get communityCity => 'Ciudad';

  @override
  String get communityCityHint => 'Nairobi';

  @override
  String get communityCreate => 'Crear';

  @override
  String get communityDecline => 'Rechazar';

  @override
  String get communityDelete => 'Eliminar comunidad';

  @override
  String get communityDeleteBody =>
      'El chat, las escaleras y las ligas se eliminan también, y se avisa a cada miembro del cierre. No se puede deshacer.';

  @override
  String get communityDeleted => 'Comunidad eliminada';

  @override
  String communityDeleteTitle(String name) {
    return '¿Eliminar $name?';
  }

  @override
  String get communityDetails => 'Detalles';

  @override
  String get communityDisputeHint =>
      'Los jugadores no coinciden en el resultado. Tu decisión lo resuelve.';

  @override
  String get communityDisputeKeep => 'Mantener el resultado enviado';

  @override
  String get communityDisputeResolved => 'Disputa resuelta';

  @override
  String communityDisputes(int count) {
    return 'Resultados disputados ($count)';
  }

  @override
  String get communityDisputeUseDisputed => 'Usar el resultado disputado';

  @override
  String communityDisputeVs(String a, String b) {
    return '$a contra $b';
  }

  @override
  String get communityEmptyBody =>
      'Una comunidad es una sesión habitual con sus propios miembros y chat. Crea una e invita a las personas con las que juegas.';

  @override
  String get communityEmptyTitle => 'Aún no hay comunidades';

  @override
  String get communityFilterAnyCity => 'Cualquier ciudad';

  @override
  String get communityFilterCity => 'Ciudad';

  @override
  String get communityFilterCityTitle => 'Comunidades en…';

  @override
  String get communityFilterNearMe => 'Cerca de mí';

  @override
  String get communityFrequencyBiweekly => 'Cada 2 semanas';

  @override
  String get communityFrequencyMonthly => 'Mensual';

  @override
  String get communityFrequencyOther => 'Otra';

  @override
  String get communityFrequencyWeekly => 'Semanal';

  @override
  String get communityHowOften => 'Frecuencia';

  @override
  String get communityJoin => 'Unirse';

  @override
  String get communityJoinAnyone => 'Cualquiera';

  @override
  String get communityJoinAnyoneHint =>
      'Cualquiera en Drift Tennis puede unirse al momento';

  @override
  String get communityJoinByRequest => 'Por solicitud';

  @override
  String get communityJoinByRequestHint => 'Tú apruebas cada solicitud';

  @override
  String get communityJoined => 'Miembro';

  @override
  String communityJoinedToast(String name) {
    return 'Te has unido a $name';
  }

  @override
  String communityJoinRequests(int count) {
    return 'Solicitudes para unirse ($count)';
  }

  @override
  String get communityLadderCreated =>
      'Escalera creada. Se ha avisado a los miembros.';

  @override
  String get communityLadderName => 'Nombre de la escalera';

  @override
  String communityLadderPlayers(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count jugadores',
      one: '1 jugador',
      zero: 'Aún no hay jugadores',
    );
    return '$_temp0';
  }

  @override
  String get communityLadders => 'Escaleras';

  @override
  String communityLadderYourRung(int position, int total) {
    return 'Vas n.º $position de $total';
  }

  @override
  String get communityLeagueCapacity => 'Límite de jugadores (opcional)';

  @override
  String get communityLeagueCapacityHint =>
      'Las inscripciones de más pasan a una lista de espera.';

  @override
  String get communityLeagueCloseBeforeStart =>
      'Las inscripciones deben cerrarse como muy tarde el día de inicio.';

  @override
  String get communityLeagueCreate => 'Crear liga';

  @override
  String get communityLeagueCreated =>
      'Liga creada. Se ha avisado a los miembros.';

  @override
  String get communityLeagueDaysBetweenRounds => 'Días por ronda';

  @override
  String get communityLeagueDescription => 'Descripción (opcional)';

  @override
  String get communityLeagueName => 'Nombre de la liga';

  @override
  String get communityLeagueOpenBeforeClose =>
      'Las inscripciones deben abrirse antes de cerrarse.';

  @override
  String get communityLeagueRegistrationCloses => 'Cierre de inscripciones';

  @override
  String get communityLeagueRegistrationOpens => 'Apertura de inscripciones';

  @override
  String get communityLeagueRounds => 'Rondas';

  @override
  String get communityLeagues => 'Ligas';

  @override
  String get communityLeagueStarts => 'Inicio de la liga';

  @override
  String get communityLeave => 'Salir de la comunidad';

  @override
  String get communityLeaveBody =>
      'Saldrás de su chat y dejarás de recibir sus notificaciones. Podrás volver a solicitar unirte más adelante.';

  @override
  String get communityLeaveLastOwner =>
      'Eres el único miembro, así que salir cierra la comunidad para siempre.';

  @override
  String communityLeaveTitle(String name) {
    return '¿Salir de $name?';
  }

  @override
  String get communityLeft => 'Has salido de la comunidad.';

  @override
  String get communityLoadCompetitionsFailed =>
      'No se pudieron cargar las competiciones.';

  @override
  String get communityLoadFailed => 'No se pudieron cargar las comunidades.';

  @override
  String get communityLoadMembersFailed =>
      'No se pudieron cargar los miembros.';

  @override
  String get communityLoadOneFailed => 'No se pudo cargar esta comunidad.';

  @override
  String get communityMakeAdmin => 'Hacer admin';

  @override
  String get communityMakeOwner => 'Hacer propietario';

  @override
  String get communityManage => 'Gestionar comunidad';

  @override
  String communityMemberCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count miembros',
      one: '1 miembro',
    );
    return '$_temp0';
  }

  @override
  String communityMembersCount(int count) {
    return 'Miembros ($count)';
  }

  @override
  String get communityMute => 'Silenciar notificaciones del chat';

  @override
  String get communityMuteHint =>
      'Las aprobaciones y nuevas competiciones te seguirán llegando.';

  @override
  String get communityName => 'Nombre';

  @override
  String get communityNameHint => 'Dobles de los martes';

  @override
  String get communityNearYou => 'Comunidades cerca de ti';

  @override
  String get communityNewLadder => 'Nueva escalera';

  @override
  String get communityNewLeague => 'Nueva liga';

  @override
  String get communityNoAbout => 'Aún no hay descripción.';

  @override
  String get communityNoCompetitions => 'Aún no hay escaleras ni ligas.';

  @override
  String get communityNoCompetitionsManager =>
      'Aún no hay escaleras ni ligas. Crea una para tus miembros.';

  @override
  String get communityNoneMatch =>
      'Ninguna comunidad coincide. Prueba otro filtro o crea una.';

  @override
  String get communityNoneNearby =>
      'Aún no hay comunidades cerca de ti. Crea una e invita a las personas con las que juegas.';

  @override
  String get communityNotApprovedBody =>
      'Drift no aprobó esta comunidad. Contacta con soporte si crees que es un error.';

  @override
  String get communityOwnerZone => 'Propietario';

  @override
  String get communityPhotoChosen => 'Foto añadida';

  @override
  String get communityRemove => 'Eliminar de la comunidad';

  @override
  String get communityRemoveAdmin => 'Quitar como admin';

  @override
  String get communityRemoveBody =>
      'Saldrá del chat y se le avisará de que fue eliminada. Podrá volver a solicitar unirse.';

  @override
  String communityRemoveTitle(String name) {
    return '¿Eliminar a $name?';
  }

  @override
  String get communityReport => 'Denunciar comunidad';

  @override
  String get communityReportAlsoLeave => 'Salir también de esta comunidad';

  @override
  String get communityReportBody =>
      'El equipo de Drift la revisará. La comunidad no sabrá quién la denunció.';

  @override
  String get communityReported => 'Gracias — Drift revisará esta comunidad.';

  @override
  String get communityReportedAndLeft =>
      'Denunciada, y has salido de la comunidad.';

  @override
  String communityReportTitle(String name) {
    return 'Denunciar $name';
  }

  @override
  String get communityRequested => 'Solicitada';

  @override
  String get communityRequestedCancel => 'Solicitada · Cancelar solicitud';

  @override
  String get communityRequestSent =>
      'Solicitud enviada. Recibirás una notificación cuando la respondan.';

  @override
  String get communityRequestToJoin => 'Solicitar unirse';

  @override
  String get communityResults => 'Resultados';

  @override
  String get communityReviewNote =>
      'Drift revisa cada comunidad nueva antes de que otros puedan encontrarla. Te avisaremos cuando esté activa.';

  @override
  String get communityRoleAdmin => 'Admin';

  @override
  String get communityRoleMember => 'Miembro';

  @override
  String get communityRoleOwner => 'Propietario';

  @override
  String communityRunBy(String club) {
    return 'Gestionada por $club';
  }

  @override
  String get communitySave => 'Guardar cambios';

  @override
  String get communitySaved => 'Guardado';

  @override
  String get communitySearchHint => 'Buscar comunidades';

  @override
  String get communityStart => 'Crear una comunidad';

  @override
  String get communityStatusNotApproved => 'No aprobada';

  @override
  String get communityStatusSuspended => 'Suspendida';

  @override
  String get communityStatusUnderReview => 'En revisión';

  @override
  String get communitySubmitted => 'Enviada a revisión';

  @override
  String get communitySuspendedBody =>
      'Drift suspendió esta comunidad. El chat es de solo lectura y nadie puede unirse mientras se revisa.';

  @override
  String get communityTabAbout => 'Acerca de';

  @override
  String get communityTabChat => 'Chat';

  @override
  String get communityTabCompetitions => 'Competiciones';

  @override
  String get communityTabMembers => 'Miembros';

  @override
  String get communityTransfer => 'Transferir';

  @override
  String get communityTransferBody =>
      'Podrá gestionarlo todo, incluso eliminar la comunidad. Tú sigues como administrador.';

  @override
  String communityTransferred(String name) {
    return '$name es ahora el propietario de la comunidad';
  }

  @override
  String communityTransferTitle(String name) {
    return '¿Hacer a $name propietario?';
  }

  @override
  String get communityTypeClub => 'Club';

  @override
  String get communityTypeClubHint => 'Los miembros de un club';

  @override
  String get communityTypeLadder => 'Escalera';

  @override
  String get communityTypeLadderHint =>
      'Una competición clasificatoria permanente';

  @override
  String get communityTypeSocial => 'Social';

  @override
  String get communityTypeSocialHint => 'Sesiones amistosas habituales';

  @override
  String get communityTypeTraining => 'Entrenamiento';

  @override
  String get communityTypeTrainingHint =>
      'Ejercicios y prácticas con entrenador';

  @override
  String get communityUnderReviewBody =>
      'Drift está revisando tu comunidad. Nadie más puede encontrarla ni unirse hasta que se apruebe; te enviaremos una notificación.';

  @override
  String get communityUnmute => 'Activar notificaciones del chat';

  @override
  String get communityWhatItIs => 'Qué es';

  @override
  String get communityWhoCanJoin => 'Quién puede unirse';

  @override
  String get communityYourCommunities => 'Tus comunidades';

  @override
  String get competeBye => 'Descanso';

  @override
  String competeByeFixture(String name) {
    return '$name — descansa';
  }

  @override
  String get competeByeThisRound => 'Descansa esta ronda';

  @override
  String get competeCurrentRound => 'Ronda actual';

  @override
  String competeDeadline(String date) {
    return 'Fecha límite: $date';
  }

  @override
  String get competeEnter => 'Participar';

  @override
  String get competeEvents => 'Eventos';

  @override
  String get competeFinal => 'Final';

  @override
  String get competeFull => 'Completo';

  @override
  String get competeJoinTournament => 'Unirse al torneo';

  @override
  String get competeJoinWaitlist => 'Unirse a la lista de espera';

  @override
  String get competeJoinWaitlistBody =>
      'Te añadiremos a la lista de espera y te inscribiremos automáticamente si se libera una plaza.';

  @override
  String get competeJoinWaitlistQ => '¿Unirte a la lista de espera?';

  @override
  String get competeLadder => 'Escalera';

  @override
  String get competeLadderUnavailable => 'Escalera no disponible.';

  @override
  String get competeLadders => 'Escaleras';

  @override
  String get competeLeague => 'Liga';

  @override
  String get competeLeagueUnavailable => 'Liga no disponible.';

  @override
  String get competeLeagues => 'Ligas';

  @override
  String get competeLeaveWaitlist => 'Salir de la lista de espera';

  @override
  String get competeLoadLaddersFailed =>
      'No se han podido cargar las escaleras.';

  @override
  String get competeLoadLeaguesFailed =>
      'No se han podido cargar las ligas. Inténtalo de nuevo.';

  @override
  String get competeLoadMyLeaguesFailed => 'No se han podido cargar tus ligas.';

  @override
  String get competeLoadPlayersFailed =>
      'No se han podido cargar los jugadores.';

  @override
  String get competeLoadStandingsFailed =>
      'No se ha podido cargar la clasificación.';

  @override
  String get competeLoadTournamentsFailed =>
      'No se han podido cargar los torneos.';

  @override
  String get competeMyLeagues => 'Mis ligas';

  @override
  String get competeNoLadders =>
      'Aún no hay escaleras. Pide a tu club que cree una.';

  @override
  String get competeNoLeagues =>
      'Aún no hay ligas cerca: prueba a ampliar la búsqueda';

  @override
  String get competeNoMyLeagues => 'Aún no te has unido a ninguna liga';

  @override
  String get competeNoRegistrations => 'Aún no se ha inscrito nadie.';

  @override
  String get competeNoRules => 'Esta liga aún no ha publicado reglas.';

  @override
  String get competeNoTournaments =>
      'Aún no hay torneos. Pide a tu club que organice uno.';

  @override
  String get competeOnWaitlist => 'En lista de espera';

  @override
  String get competeRegister => 'Inscribirse';

  @override
  String get competeRegisterBody =>
      'Te emparejaremos con otros inscritos cuando empiece la liga.';

  @override
  String get competeRegisterQ => '¿Inscribirte en esta liga?';

  @override
  String get competeRegisteredPlayers => 'Jugadores inscritos';

  @override
  String get competeRegistrationClosed =>
      'La inscripción de esta liga está cerrada.';

  @override
  String get competeRegistrationOpensSoon => 'La inscripción abre pronto.';

  @override
  String get competeRound => 'Ronda';

  @override
  String competeRoundNumber(int number) {
    return 'Ronda $number';
  }

  @override
  String get competeRoundUnavailable => 'Ronda no disponible.';

  @override
  String get competeRules => 'Reglas';

  @override
  String get competeRulesUnavailable => 'Reglas no disponibles.';

  @override
  String get competeScoringFormat => 'Formato de puntuación';

  @override
  String get competeSemiFinals => 'Semifinales';

  @override
  String competeSpotsLeft(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Quedan $count plazas',
      one: 'Queda 1 plaza',
    );
    return '$_temp0';
  }

  @override
  String get competeStandings => 'Clasificación';

  @override
  String get competeStandingsEmpty =>
      'La clasificación aparecerá tras la primera ronda.';

  @override
  String get competeTournament => 'Torneo';

  @override
  String get competeTournamentUnavailable => 'Torneo no disponible.';

  @override
  String get competeTournaments => 'Torneos';

  @override
  String get competeUnfinishedMatches => 'Partidos sin terminar';

  @override
  String competeVsFixture(String a, String b) {
    return '$a vs $b';
  }

  @override
  String get competeWaitlist => 'Lista de espera';

  @override
  String get competeWaitlistBody =>
      'Te inscribiremos automáticamente si se libera una plaza.';

  @override
  String get competeWalkovers => 'Walkovers';

  @override
  String get competeWithdraw => 'Retirarse';

  @override
  String get competeWithdrawBody =>
      'Podrás volver a inscribirte más tarde mientras la inscripción siga abierta.';

  @override
  String get competeWithdrawQ => '¿Retirarte de esta liga?';

  @override
  String get competeYoureRegistered => 'Estás inscrito';

  @override
  String get connectionsCancelRequest => 'Cancelar solicitud';

  @override
  String get connectionsEmpty =>
      'Conecta con jugadores para crear tu red de tenis';

  @override
  String get connectionsIncoming => 'Recibidas';

  @override
  String get connectionsLoadRequestsFailed =>
      'No se han podido cargar tus solicitudes.';

  @override
  String get connectionsNoPending => 'No hay solicitudes pendientes';

  @override
  String get connectionsPending => 'Solicitudes pendientes';

  @override
  String get connectionsRequests => 'Solicitudes';

  @override
  String get connectionsSent => 'Enviadas';

  @override
  String get connectionsTitle => 'Conexiones';

  @override
  String get courtAccess => 'Acceso';

  @override
  String get courtAddress => 'Dirección';

  @override
  String get courtAmenities => 'Servicios';

  @override
  String get courtBookOnline => 'Reservar online';

  @override
  String get courtBookingOptions => 'Opciones de reserva';

  @override
  String get courtBookingOptionsLower => 'Opciones de reserva';

  @override
  String get courtDetails => 'Detalles';

  @override
  String get courtGetDirections => 'Cómo llegar';

  @override
  String get courtHours => 'Horario';

  @override
  String get courtIndoor => 'Cubierta';

  @override
  String get courtIndoorSuffix => ' (cubierta)';

  @override
  String get courtList => 'Lista';

  @override
  String get courtLitSuffix => ' · iluminada';

  @override
  String get courtLoadFailed =>
      'No se han podido cargar las pistas. Desliza para reintentar.';

  @override
  String get courtLocationUnknown => 'Ubicación desconocida';

  @override
  String get courtMap => 'Mapa';

  @override
  String get courtMapUnavailable =>
      'Mapa no disponible: cambia a Lista para ver los resultados.';

  @override
  String get courtNativeBookingUnavailable =>
      'La reserva en la app aún no está disponible para esta pista.';

  @override
  String get courtNoBookingInfo =>
      'No hay información de reservas: prueba a contactar directamente';

  @override
  String get courtNoPhotos => 'Aún no hay fotos';

  @override
  String get courtNoneFound => 'No se han encontrado pistas';

  @override
  String get courtNoneInArea => 'No hay pistas en esta zona';

  @override
  String get courtOutdoor => 'Exterior';

  @override
  String get courtPhone => 'Teléfono';

  @override
  String get courtPhotos => 'Fotos';

  @override
  String get courtPrivate => 'Privada';

  @override
  String get courtPublic => 'Pública';

  @override
  String get courtAddFavorite => 'Añadir a favoritos';

  @override
  String get courtBookACourt => 'Reservar pista';

  @override
  String get courtBookingEyebrow => 'Reserva';

  @override
  String get courtClosedNow => 'Cerrado ahora';

  @override
  String courtCourtCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count pistas',
      one: '1 pista',
    );
    return '$_temp0';
  }

  @override
  String courtCourtsOfSurface(int count, String surface) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count pistas de $surface',
      one: '1 pista de $surface',
    );
    return '$_temp0';
  }

  @override
  String get courtFavoriteFailed =>
      'No se pudieron actualizar los favoritos. Inténtalo de nuevo.';

  @override
  String get courtFindTheCourt => 'Encuentra la pista';

  @override
  String get courtGoodToKnow => 'Conviene saber';

  @override
  String get courtInfoVerifiedFooter =>
      'Información de la sede verificada por Drift';

  @override
  String get courtLocationEyebrow => 'Ubicación';

  @override
  String get courtOpenNow => 'Abierto ahora';

  @override
  String courtPhotoCount(int index, int total) {
    return '$index / $total';
  }

  @override
  String get courtRemoveFavorite => 'Quitar de favoritos';

  @override
  String get courtReportIssue => 'Reportar o actualizar la información';

  @override
  String get courtShare => 'Compartir pista';

  @override
  String courtShareText(String name, String address) {
    return '$name — $address';
  }

  @override
  String get courtSurface => 'Superficie';

  @override
  String get courtVerifiedVenue => 'Sede verificada';

  @override
  String get courtUnavailable => 'Pista no disponible.';

  @override
  String get courtUnverified => 'Sin verificar';

  @override
  String get courtVerificationPending => 'Verificación pendiente';

  @override
  String get courtViewPhotos => 'Ver fotos';

  @override
  String get courtVisitWebsite => 'Visitar la web';

  @override
  String get courtWebsite => 'Sitio web';

  @override
  String get courtWhatsApp => 'Escribir por WhatsApp';

  @override
  String get deleteBody =>
      'Se cerrará tu sesión en todos los dispositivos de inmediato y otros jugadores ya no podrán encontrarte ni contactarte.\n\nTus datos personales se borrarán definitivamente al cabo de 30 días. Hasta entonces, contacta con soporte si cambias de opinión; después no se podrá deshacer.\n\nLos partidos que jugaste seguirán registrados para los demás jugadores, pero ya no estarán vinculados a ti.';

  @override
  String get deleteButton => 'Eliminar mi cuenta';

  @override
  String get deleteConfirm => 'Lo entiendo, eliminar mi cuenta';

  @override
  String get deleteDeleting => 'Eliminando…';

  @override
  String get deleteTitle => 'Se eliminará tu cuenta';

  @override
  String get discoverClubs => 'Clubes';

  @override
  String get discoverCoaches => 'Entrenadores';

  @override
  String get discoverCourts => 'Pistas';

  @override
  String get discoverFindPlayers => 'Buscar jugadores';

  @override
  String get drawerSigningOut => 'Cerrando sesión…';

  @override
  String get drawerViewProfile => 'Ver tu perfil';

  @override
  String get eventsComingSoon => 'Eventos próximamente';

  @override
  String get eventsComingSoonBody =>
      'Las quedadas, clínics y eventos sociales de tu club aparecerán aquí cuando empiece a organizarlos.';

  @override
  String get exp1to2y => '1–2 años';

  @override
  String get exp1to2ySub => 'Construyendo una base sólida';

  @override
  String get exp2to5y => '2–5 años';

  @override
  String get exp2to5ySub => 'Desarrollando verdadera visión de juego';

  @override
  String get exp5plus => 'Más de 5 años';

  @override
  String get exp5plusSub => 'Con experiencia y regularidad';

  @override
  String get exp6to12m => '6–12 meses';

  @override
  String get exp6to12mSub => 'Me siento cada vez más cómodo en pista';

  @override
  String get expAdvanced => 'Competitivo / Avanzado';

  @override
  String get expAdvancedSub => 'Nivel de torneo';

  @override
  String get expNew => 'Soy totalmente nuevo';

  @override
  String get expNewSub => 'Nunca he cogido una raqueta';

  @override
  String get expUnder6m => 'Menos de 6 meses';

  @override
  String get expUnder6mSub => 'Aún aprendo lo básico';

  @override
  String get filterAny => 'Cualquiera';

  @override
  String get filterApply => 'Aplicar filtros';

  @override
  String filterApplyCount(int count) {
    return 'Aplicar filtros ($count)';
  }

  @override
  String get filterDistance => 'Distancia';

  @override
  String get filterFeatures => 'Características';

  @override
  String get filterFloodlit => 'Con iluminación';

  @override
  String get filterHasBooking => 'Con información de reservas';

  @override
  String get filterIndoorOutdoor => 'Cubierta / Exterior';

  @override
  String get filterLevel => 'Nivel';

  @override
  String get filterSurface => 'Superficie';

  @override
  String get filterTitle => 'Filtros';

  @override
  String get formLoss => 'D';

  @override
  String get formNoMatches => 'Aún no has jugado partidos';

  @override
  String get formWin => 'V';

  @override
  String get goalAchieved => 'Conseguido';

  @override
  String get goalBaseline => 'Punto de partida';

  @override
  String get goalBehind => 'Con retraso';

  @override
  String get goalCoaching => 'Encontrar un entrenador';

  @override
  String get goalCompete => 'Competir en ligas/torneos';

  @override
  String get goalDeadline => 'Fecha límite';

  @override
  String get goalDeleteQ => '¿Eliminar este objetivo?';

  @override
  String get goalEmpty => 'Fija tu primer objetivo de mejora';

  @override
  String get goalGetFit => 'Ponerme en forma';

  @override
  String get goalHaveFun => 'Simplemente divertirme';

  @override
  String get goalImproveSkills => 'Mejorar mi juego';

  @override
  String get goalLoadFailed => 'No se han podido cargar los objetivos.';

  @override
  String get goalMeetPeople => 'Conocer a nuevos jugadores';

  @override
  String get goalMilestones => 'Hitos';

  @override
  String get goalOnTrack => 'En buen camino';

  @override
  String get goalPlayMore => 'Jugar más a menudo';

  @override
  String get goalTarget => 'Meta';

  @override
  String goalTargetOutOf6(String value) {
    return 'Meta $value/6';
  }

  @override
  String get goalTitle => 'Objetivo';

  @override
  String get goalTrackProgress => 'Seguir mi progreso';

  @override
  String get goalCreateAddCustomMilestone => 'Añadir hito personalizado';

  @override
  String get goalCreateAddDeadline => 'Añadir fecha límite';

  @override
  String get goalCreateChange => 'Cambiar';

  @override
  String get goalCreateChooseDate => 'Elige una fecha';

  @override
  String get goalCreateCurrentRating => 'Nivel actual';

  @override
  String get goalCreateCustomDate => 'Fecha personalizada';

  @override
  String get goalCreateEdit => 'Editar';

  @override
  String get goalCreateErrorCustomDate =>
      'Elige una fecha o selecciona «Sin fecha límite».';

  @override
  String get goalCreateErrorTargetHigher =>
      'Elige una meta superior a tu nivel actual.';

  @override
  String get goalCreateFocusHeading => '¿Qué quieres mejorar?';

  @override
  String get goalCreateFocusSub => 'Elige un enfoque o mantenlo general.';

  @override
  String goalCreateFocusValue(String focus) {
    return 'Enfoque: $focus';
  }

  @override
  String goalCreateImprovement(String value) {
    return '+$value de mejora';
  }

  @override
  String get goalCreateMilestoneHint =>
      'p. ej. Practicar la colocación cruzada';

  @override
  String goalCreateMilestonesAdded(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count hitos añadidos',
      one: '1 hito añadido',
      zero: 'Ningún hito añadido',
    );
    return '$_temp0';
  }

  @override
  String get goalCreateMilestonesHeading => 'Divídelo en hitos';

  @override
  String get goalCreateMilestonesSub =>
      'Opcional · Los pequeños logros te ayudan a mantener el rumbo.';

  @override
  String get goalCreateNoDeadline => 'Sin fecha límite';

  @override
  String get goalCreateNone => 'Ninguna';

  @override
  String get goalCreateOptionalLater => 'Opcional · Puedes cambiarlo luego.';

  @override
  String get goalCreateRatingInfoBody =>
      'Los niveles de Drift van de 0 a 6. Tu nivel actual parte de tu última evaluación y tus entrenamientos. Ajústalo si no te parece correcto.';

  @override
  String get goalCreateRatingInfoTitle => 'Sobre los niveles de Drift';

  @override
  String get goalCreateRemoveMilestone => 'Eliminar hito';

  @override
  String get goalCreateSelectedSkill => 'Habilidad elegida';

  @override
  String get goalCreateSetTarget => 'Elige tu meta';

  @override
  String get goalCreateSkillHeading => 'Elige una habilidad';

  @override
  String get goalCreateSkillSub => 'Selecciona una habilidad para desarrollar.';

  @override
  String get goalCreateStep1Subtitle =>
      '¿Qué parte de tu juego quieres mejorar?';

  @override
  String get goalCreateStep1Title => 'Crear un objetivo';

  @override
  String get goalCreateStep2Subtitle =>
      'Elige el resultado que quieres conseguir.';

  @override
  String get goalCreateStep2Title => 'Elige tu enfoque';

  @override
  String get goalCreateStep3Subtitle =>
      'Fija una meta con sentido y un plan para alcanzarla.';

  @override
  String get goalCreateStep3Title => 'Construye tu objetivo';

  @override
  String goalCreateStepOf(int step, int total) {
    return 'Paso $step de $total';
  }

  @override
  String get goalCreateSubmit => 'Crear objetivo';

  @override
  String get goalCreateSummaryFocus => 'Enfoque';

  @override
  String get goalCreateSummaryHeading => 'Resumen del objetivo';

  @override
  String get goalCreateSummaryRating => 'Nivel';

  @override
  String get goalCreateSummarySub => 'Revisa tu plan antes de crearlo.';

  @override
  String get goalCreateTargetDate => 'Fecha objetivo';

  @override
  String get goalCreateTargetDisclaimer =>
      'Tu meta es el nivel que buscas alcanzar, no una medición automática de tu rendimiento.';

  @override
  String get goalCreateTargetHeading => 'Fija tu meta de mejora';

  @override
  String get goalCreateTargetMustBeHigher => 'La meta debe ser mayor';

  @override
  String get goalCreateTargetRating => 'Nivel objetivo';

  @override
  String get goalCreateTargetSub => 'Mueve los controles en pasos de 0,5.';

  @override
  String get goalCreateTimeline => 'Plazo';

  @override
  String get goalCreateTimelineHeading => '¿Cuándo quieres lograrlo?';

  @override
  String goalCreateWeeks(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count semanas',
      one: '1 semana',
    );
    return '$_temp0';
  }

  @override
  String get goalCreateYourGoal => 'Tu objetivo';

  @override
  String get goalCreatedAnother => 'Crear otro objetivo';

  @override
  String goalCreatedBody(String skill) {
    return 'Tu objetivo de $skill está listo. Cada sesión enfocada te acerca más.';
  }

  @override
  String get goalCreatedEyebrow => 'Objetivo creado';

  @override
  String get goalCreatedOpen => 'Abierta';

  @override
  String get goalCreatedStart => 'Inicio';

  @override
  String get goalCreatedTitle => 'Listo para mejorar.';

  @override
  String get goalCreatedView => 'Ver objetivo';

  @override
  String get goalFocusAccuracy => 'Precisión';

  @override
  String get goalFocusAgility => 'Agilidad';

  @override
  String get goalFocusApproach => 'Aproximación';

  @override
  String get goalFocusBalance => 'Equilibrio';

  @override
  String get goalFocusClosing => 'Cerrar';

  @override
  String get goalFocusComposure => 'Serenidad';

  @override
  String get goalFocusConsistency => 'Consistencia';

  @override
  String get goalFocusDepth => 'Profundidad';

  @override
  String get goalFocusDescBackhandAccuracy => 'Dirigir la bola con control';

  @override
  String get goalFocusDescBackhandConsistency => 'Construir un revés fiable';

  @override
  String get goalFocusDescBackhandPower => 'Añadir velocidad y profundidad';

  @override
  String get goalFocusDescBackhandTechnique => 'Mejorar la mecánica del golpe';

  @override
  String get goalFocusDescFootworkAgility =>
      'Cambiar de dirección con eficacia';

  @override
  String get goalFocusDescFootworkBalance =>
      'Mantener el control en movimiento';

  @override
  String get goalFocusDescFootworkPreparation =>
      'Prepararte antes para cada golpe';

  @override
  String get goalFocusDescFootworkRecovery => 'Recolocarte tras cada golpe';

  @override
  String get goalFocusDescForehandAccuracy =>
      'Mejorar la colocación de tus golpes';

  @override
  String get goalFocusDescForehandConsistency => 'Mantener más bolas en juego';

  @override
  String get goalFocusDescForehandPower => 'Desarrollar golpes más potentes';

  @override
  String get goalFocusDescForehandTechnique => 'Pulir la mecánica del golpe';

  @override
  String get goalFocusDescGeneral => 'Trabajar la habilidad en general';

  @override
  String get goalFocusDescMatchPlayClosing => 'Cerrar los sets con confianza';

  @override
  String get goalFocusDescMatchPlayComposure =>
      'Mantener la calma bajo presión';

  @override
  String get goalFocusDescMatchPlayConsistency =>
      'Reducir los errores no forzados';

  @override
  String get goalFocusDescMatchPlayStrategy =>
      'Construir puntos más inteligentes';

  @override
  String get goalFocusDescMovementBalance =>
      'Mantener la estabilidad en cada golpe';

  @override
  String get goalFocusDescMovementEndurance =>
      'Moverte bien durante más tiempo';

  @override
  String get goalFocusDescMovementRecovery => 'Volver a la posición más rápido';

  @override
  String get goalFocusDescMovementSpeed => 'Llegar antes a la bola';

  @override
  String get goalFocusDescNetPlayApproach => 'Subir a la red con eficacia';

  @override
  String get goalFocusDescNetPlayPositioning => 'Ocupar el espacio correcto';

  @override
  String get goalFocusDescNetPlayTouch => 'Mejorar el tacto y el control';

  @override
  String get goalFocusDescNetPlayVolleys => 'Ganar confianza en la volea';

  @override
  String get goalFocusDescReturnConsistency => 'Meter más restos en juego';

  @override
  String get goalFocusDescReturnDepth => 'Restar con profundidad';

  @override
  String get goalFocusDescReturnPositioning =>
      'Encontrar una mejor posición de resto';

  @override
  String get goalFocusDescReturnReaction => 'Leer y reaccionar antes';

  @override
  String get goalFocusDescServeConsistency =>
      'Subir tu porcentaje de primeros saques';

  @override
  String get goalFocusDescServePlacement => 'Acertar tus zonas de saque';

  @override
  String get goalFocusDescServePower => 'Generar más velocidad de raqueta';

  @override
  String get goalFocusDescServeTechnique => 'Mejorar el movimiento y el ritmo';

  @override
  String get goalFocusEndurance => 'Resistencia';

  @override
  String get goalFocusGeneral => 'Mejora general';

  @override
  String get goalFocusPlacement => 'Colocación';

  @override
  String get goalFocusPositioning => 'Posicionamiento';

  @override
  String get goalFocusPower => 'Potencia';

  @override
  String get goalFocusPreparation => 'Preparación';

  @override
  String get goalFocusReaction => 'Reacción';

  @override
  String get goalFocusRecovery => 'Recuperación';

  @override
  String get goalFocusSpeed => 'Velocidad';

  @override
  String get goalFocusStrategy => 'Estrategia';

  @override
  String get goalFocusTechnique => 'Técnica';

  @override
  String get goalFocusTouch => 'Toque';

  @override
  String get goalFocusVolleys => 'Voleas';

  @override
  String get goalMilestoneDrillBackhand => 'Mantener un peloteo de 10 reveses';

  @override
  String get goalMilestoneDrillFootwork =>
      'Completar un circuito completo de juego de pies en sombra';

  @override
  String get goalMilestoneDrillForehand => 'Mantener un peloteo de 10 derechas';

  @override
  String get goalMilestoneDrillMatchPlay =>
      'Aplicar tu enfoque en un partido completo';

  @override
  String get goalMilestoneDrillMovement =>
      'Completar un ejercicio de movimiento por toda la pista con control';

  @override
  String get goalMilestoneDrillNetPlay =>
      'Completar un intercambio de 10 voleas en la red';

  @override
  String get goalMilestoneDrillReturn => 'Restar 8 de 10 saques de práctica';

  @override
  String get goalMilestoneDrillServe =>
      'Meter 7 de 10 primeros saques en la zona objetivo';

  @override
  String goalMilestoneReachTarget(String skill) {
    return 'Alcanzar tu nivel objetivo en $skill';
  }

  @override
  String get goalMilestoneSessionsBackhand =>
      'Completar tres sesiones centradas en el revés';

  @override
  String get goalMilestoneSessionsFootwork =>
      'Completar tres sesiones centradas en el juego de pies';

  @override
  String get goalMilestoneSessionsForehand =>
      'Completar tres sesiones centradas en la derecha';

  @override
  String get goalMilestoneSessionsMatchPlay =>
      'Jugar tres sets de práctica enfocados';

  @override
  String get goalMilestoneSessionsMovement =>
      'Completar tres sesiones centradas en el movimiento';

  @override
  String get goalMilestoneSessionsNetPlay =>
      'Completar tres sesiones de juego en la red';

  @override
  String get goalMilestoneSessionsReturn =>
      'Completar tres sesiones centradas en el resto';

  @override
  String get goalMilestoneSessionsServe =>
      'Completar tres sesiones centradas en el saque';

  @override
  String get goalUnavailable => 'Objetivo no disponible.';

  @override
  String get handLeftHanded => 'Zurdo';

  @override
  String get handRightHanded => 'Diestro';

  @override
  String get helpBody =>
      'Lee las preguntas frecuentes de Drift Tennis. Se abren las mismas respuestas publicadas en nuestra web.';

  @override
  String get helpOpenFailed =>
      'No se pueden abrir las preguntas frecuentes ahora mismo.';

  @override
  String get helpOpenFaqs => 'Abrir preguntas frecuentes';

  @override
  String get helpTitle => 'Tus preguntas, respondidas.';

  @override
  String get homeBook => 'Reservar';

  @override
  String get homeBrowse => 'Explorar';

  @override
  String get homeCourtsNearYou => 'Pistas cerca de ti';

  @override
  String get homeFindAMatch => 'Buscar un partido';

  @override
  String get homeFindMore => 'Buscar más';

  @override
  String homeGreeting(String name) {
    return 'Hola, $name';
  }

  @override
  String get homeLoadFailed =>
      'No se ha podido cargar tu inicio. Inténtalo de nuevo.';

  @override
  String get homeMapView => 'Ver mapa';

  @override
  String get homeNeedsYou => 'Te necesita';

  @override
  String get homeNextMatch => 'Próximo partido';

  @override
  String get homeNextPrefix => 'Siguiente: ';

  @override
  String get homeNoCourts => 'Aún no hay pistas cerca.';

  @override
  String get homeNoMatches => 'Aún no hay partidos programados.';

  @override
  String get homeNoPlayers => 'Aún no hay jugadores cerca.';

  @override
  String get homePlayersNearYou => 'Jugadores cerca de ti';

  @override
  String get homeProgressEmpty =>
      'Juega partidos y registra entrenamientos para conseguir logros.';

  @override
  String homeProgressTo(String level) {
    return 'Progreso hacia $level';
  }

  @override
  String get homeQuickActions => 'Acciones rápidas';

  @override
  String get homeRating => 'Puntuación';

  @override
  String get homeReview => 'Revisar';

  @override
  String get homeStatDoubles => 'DOBLES';

  @override
  String get homeStatLevel => 'NIVEL';

  @override
  String get homeStatSingles => 'INDIVIDUAL';

  @override
  String get homeTennisNews => 'Noticias de tenis';

  @override
  String get homeWelcomeBack => 'Hola de nuevo';

  @override
  String get homeYourProgress => 'Tu progreso';

  @override
  String get introGetStarted => 'Empezar';

  @override
  String get introSlide1Body =>
      'Sigue cada partido, resultado y torneo mientras tu comunidad de tenis no para.';

  @override
  String get introSlide1Title => 'El juego\nnunca para';

  @override
  String get introSlide2Body =>
      'Sigue tu progreso, perfecciona tu técnica y crea mejores hábitos con datos pensados para tu camino en el tenis.';

  @override
  String get introSlide2Title => 'Mejora\ntu juego';

  @override
  String get introSlide3Body =>
      'Descubre jugadores, clubes y competiciones cerca de ti y sal a la pista con confianza.';

  @override
  String get introSlide3Title => 'Empieza tu\naventura en el tenis';

  @override
  String get leagueJoined => 'Inscrito';

  @override
  String leagueMemberCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count miembros',
      one: '1 miembro',
    );
    return '$_temp0';
  }

  @override
  String leagueMembersOfCapacity(int count, int capacity) {
    return '$count/$capacity miembros';
  }

  @override
  String get leagueWaitlisted => 'En espera';

  @override
  String get learnBrowseBySkill => 'Explorar por habilidad';

  @override
  String get learnContentLoadFailed => 'No se ha podido cargar el contenido.';

  @override
  String get learnContentUnavailable => 'Contenido no disponible.';

  @override
  String get learnFeaturedLessons => 'Lecciones destacadas';

  @override
  String get learnGoals => 'Objetivos';

  @override
  String get learnGoalsSub => 'Fija y sigue tus metas';

  @override
  String get learnLessonsFailed =>
      'No se han podido cargar las lecciones. Desliza hacia abajo para reintentar.';

  @override
  String get learnLessonsComingSoon => 'Lecciones próximamente';

  @override
  String get learnLessonsComingSoonBody =>
      'Estamos preparando lecciones y ejercicios. Vuelve pronto.';

  @override
  String get learnLogDrill => 'Registrar este ejercicio en Entrenamiento';

  @override
  String get learnMarkComplete => 'Marcar como completado';

  @override
  String get learnMarkedComplete => 'Marcado como completado.';

  @override
  String get learnMarking => 'Marcando…';

  @override
  String get learnNoContentFilter => 'Aún no hay contenido para este filtro';

  @override
  String get learnNoData => 'Aún no hay datos';

  @override
  String get learnPlanUnavailable => 'Plan no disponible.';

  @override
  String get learnPracticeLog => 'Registro de entrenamiento';

  @override
  String get learnPracticeLogSub => 'Revisa tus sesiones';

  @override
  String get learnProgressReport => 'Informe de progreso';

  @override
  String get learnProgressReportSub => 'Mira cuánto has avanzado';

  @override
  String get learnSkillProfile => 'Perfil técnico';

  @override
  String get learnSkillProfileSub => 'Sigue tus puntos fuertes';

  @override
  String get learnSteps => 'Pasos';

  @override
  String get learnTrainingPlan => 'Plan de entrenamiento';

  @override
  String get learnWatchVideo => 'Ver vídeo';

  @override
  String get legalBody =>
      'Aquí se publican los documentos legales vigentes de la app y la web de Drift Tennis. Siempre se abre la última versión aprobada. La versión en inglés es la que prevalece.';

  @override
  String get legalDataPrivacy => 'Aviso de protección de datos';

  @override
  String get legalHeading => 'Términos y privacidad';

  @override
  String get legalOpenFailed =>
      'No se puede abrir el documento legal ahora mismo.';

  @override
  String get legalPrivacy => 'Política de privacidad';

  @override
  String get legalTerms => 'Términos y condiciones';

  @override
  String get legalTitle => 'Legal';

  @override
  String get levelAdvanced => 'Avanzado';

  @override
  String get levelAll => 'Todos los niveles';

  @override
  String get levelBeginner => 'Principiante';

  @override
  String get levelFoundational => 'Iniciado';

  @override
  String get levelIntermediate => 'Intermedio';

  @override
  String get locationDenied => 'Se ha denegado el permiso de ubicación.';

  @override
  String get locationServicesOff =>
      'Los servicios de ubicación están desactivados.';

  @override
  String get matchAcceptTheirVersion => 'Aceptar su versión';

  @override
  String get matchAddNote => 'Añadir una nota (opcional)';

  @override
  String get matchAddSet => 'Añadir un set';

  @override
  String get matchCancelMatch => 'Cancelar partido';

  @override
  String get matchChallenge => 'Desafío';

  @override
  String get matchChoosePartner => 'Elige tu pareja de dobles.';

  @override
  String get matchChooseYourPartner => 'Elige tu pareja';

  @override
  String get matchConfidence => 'Confianza';

  @override
  String get matchConnectFirst =>
      'Conecta primero con un jugador para hacer pareja.';

  @override
  String get matchCourt => 'Pista';

  @override
  String get matchCourtName => 'Nombre de la pista';

  @override
  String get matchDifferentResults =>
      'Tu rival y tú habéis enviado resultados distintos.';

  @override
  String get matchDispute => 'Disputar';

  @override
  String get matchDisputeIntro =>
      'Tu rival y tú habéis enviado resultados distintos. Acepta su versión si es correcta o corrige la tuya.';

  @override
  String get matchEnterResult => 'Introducir resultado';

  @override
  String get matchHowDidItFeel => '¿Cómo te sentiste?';

  @override
  String get matchLoadConnectionsFailed =>
      'No se han podido cargar tus conexiones.';

  @override
  String get matchLoadFailed => 'No se ha podido cargar este partido.';

  @override
  String get matchLoadMatchesFailed => 'No se han podido cargar tus partidos.';

  @override
  String matchOpponentPicksPartner(String name) {
    return '$name elegirá su pareja al aceptar.';
  }

  @override
  String get matchParticipantDeclined => 'Rechazado';

  @override
  String get matchParticipantIn => 'Dentro';

  @override
  String get matchParticipantInvited => 'Invitado';

  @override
  String get matchPickATime => 'Elige una hora';

  @override
  String get matchPlayers => 'Jugadores';

  @override
  String get matchProposeTimes => 'Proponer horas';

  @override
  String get matchRematch => 'Revancha';

  @override
  String get matchReschedule => 'Cambiar fecha';

  @override
  String get matchResult => 'Resultado';

  @override
  String get matchResultDisputed => 'Resultado en disputa';

  @override
  String get matchRetirement => 'Retirada';

  @override
  String get matchReviseVersion => 'Corregir tu versión';

  @override
  String matchRoundBanner(int round, String league) {
    return 'Ronda $round · $league';
  }

  @override
  String get matchRoundsUsed =>
      'Has usado todas tus rondas de propuestas: acordad el resto por chat.';

  @override
  String get matchScore => 'Resultado';

  @override
  String get matchSendChallenge => 'Enviar desafío';

  @override
  String matchSetNumber(int number) {
    return 'Set $number';
  }

  @override
  String get matchSport => 'Deporte';

  @override
  String get matchStateCancelled => 'Cancelado';

  @override
  String get matchStateCompleted => 'Jugado';

  @override
  String get matchStateDisputed => 'En disputa';

  @override
  String get matchStateExpired => 'Caducado';

  @override
  String get matchStateProposed => 'Esperando respuesta';

  @override
  String get matchStateRescheduled => 'Reprogramando';

  @override
  String get matchStateRetired => 'Retirada';

  @override
  String get matchStateScheduled => 'Programado';

  @override
  String get matchStateScheduling => 'Acordando hora';

  @override
  String get matchStateWalkover => 'Walkover';

  @override
  String get matchSuggest => 'Sugerir';

  @override
  String get matchSuggestACourt => 'Sugerir una pista';

  @override
  String get matchSuggestCourt => 'Sugerir pista';

  @override
  String get matchSuggestDifferentTimes => 'Proponer otras horas';

  @override
  String get matchTapToConfirm => 'Toca una hora para confirmar el partido.';

  @override
  String get matchTheirVersion => 'Su versión';

  @override
  String get matchTiebreakShort => 'TB';

  @override
  String get matchTimeTbc => 'Hora por confirmar';

  @override
  String get matchTitle => 'Partido';

  @override
  String get matchUndoChallenge => 'Deshacer desafío';

  @override
  String get matchUnplayedWalkover => 'No jugado: walkover';

  @override
  String get matchUnplayedWalkoverBody =>
      'El plazo de la ronda terminó antes de jugar este partido. Se registra como walkover sin ganador.';

  @override
  String get matchViewDispute => 'Ver disputa';

  @override
  String get matchWaitingChoose => 'Esperando a que elija.';

  @override
  String get matchWaitingConfirm => 'Esperando su confirmación.';

  @override
  String get matchWalkoverNeither =>
      'Un walkover no se registra a favor de ningún jugador.';

  @override
  String get matchWalkoverRetirement => 'Walkover / Retirada';

  @override
  String get matchWhatHappened => '¿Qué ocurrió?';

  @override
  String get matchWhoWon => '¿Quién ganó?';

  @override
  String get matchYouSuffix => ' (tú)';

  @override
  String get matchYourOpponent => 'Tu rival';

  @override
  String get matchYourPartner => 'Tu pareja';

  @override
  String get matchYourProposedTimes => 'Tus horas propuestas';

  @override
  String get matchYourVersion => 'Tu versión';

  @override
  String get messagingChat => 'Chat';

  @override
  String messagingConnectFirst(String name) {
    return 'Conecta con $name o desafíale antes de escribirle.';
  }

  @override
  String get messagingConversation => 'Conversación';

  @override
  String get messagingEmpty =>
      'Aún no hay conversaciones: conecta con un jugador para empezar una';

  @override
  String get messagingLoadConversationFailed =>
      'No se ha podido cargar esta conversación.';

  @override
  String get messagingLoadFailed => 'No se han podido cargar tus mensajes.';

  @override
  String get messagingMinChars => 'Escribe al menos dos letras de un nombre.';

  @override
  String get messagingNewMessage => 'Nuevo mensaje';

  @override
  String get messagingNoSearchResults =>
      'Ninguna conversación coincide con tu búsqueda';

  @override
  String get messagingSayHello => 'Saluda';

  @override
  String get messagingSearch => 'Buscar mensajes';

  @override
  String get messagingSearchPlayers => 'Buscar jugadores por nombre';

  @override
  String get messagingSearchPlayersFailed =>
      'No se pueden buscar jugadores ahora mismo.';

  @override
  String get messagingSystemMessage => 'Mensaje del sistema';

  @override
  String get messagingUnread => 'No leídos';

  @override
  String messagingViewNamed(String name) {
    return 'Ver $name';
  }

  @override
  String get messagingViewRelatedLeague => 'Ver liga relacionada';

  @override
  String get messagingViewRelatedMatch => 'Ver partido relacionado';

  @override
  String get navAchievements => 'Logros';

  @override
  String get navCommunity => 'Comunidad';

  @override
  String get navDiscover => 'Descubrir';

  @override
  String get navHome => 'Inicio';

  @override
  String get navLearn => 'Aprender';

  @override
  String get navMessages => 'Mensajes';

  @override
  String get navMyProfile => 'Mi perfil';

  @override
  String get navMySportsHub => 'Mi espacio deportivo';

  @override
  String get navNews => 'Noticias';

  @override
  String get navNotifications => 'Notificaciones';

  @override
  String get navPlay => 'Jugar';

  @override
  String get navSettings => 'Ajustes';

  @override
  String get newsArtwork => 'Ilustración de noticia de tenis';

  @override
  String get newsBrokenLink => 'El enlace a la fuente parece roto.';

  @override
  String get newsCurated => 'Seleccionado para ti';

  @override
  String newsDaysAgo(int days) {
    return 'hace $days d';
  }

  @override
  String get newsFreshOffCourt => 'RECIÉN SALIDO DE LA PISTA';

  @override
  String get newsLatest => 'Lo último';

  @override
  String get newsLatestStories => 'Últimas noticias';

  @override
  String get newsLoadFailed =>
      'No se han podido cargar las noticias. Desliza para reintentar.';

  @override
  String get newsLoadMore => 'Cargar más noticias';

  @override
  String get newsLoadMoreFailed =>
      'No se han podido cargar más noticias. Inténtalo de nuevo.';

  @override
  String get newsLoadSavedFailed =>
      'No se han podido cargar las noticias guardadas.';

  @override
  String get newsNoStories => 'Aún no hay noticias en esta categoría';

  @override
  String newsOfflineSaved(String date) {
    return 'Noticias sin conexión guardadas el $date';
  }

  @override
  String get newsOpenInBrowser => 'Abrir en el navegador';

  @override
  String get newsOpenSource => 'Abrir la fuente original';

  @override
  String get newsRead => 'Leer';

  @override
  String get newsReadStory => 'Leer noticia';

  @override
  String get newsRecently => 'Recientemente';

  @override
  String get newsRemoveFromSaved => 'Quitar de guardadas';

  @override
  String get newsRemoveFromSavedTitle => 'Quitar de guardadas';

  @override
  String get newsSaveForLater => 'Guarda noticias para leerlas más tarde';

  @override
  String get newsSaveStory => 'Guardar noticia';

  @override
  String get newsSavedStories => 'Noticias guardadas';

  @override
  String get newsSavedStoriesTitle => 'Noticias guardadas';

  @override
  String get newsStories => 'Noticias';

  @override
  String get newsStory => 'Noticia';

  @override
  String get newsStoryUnavailable => 'Noticia no disponible.';

  @override
  String get notifCaughtUp => 'Lo tienes todo al día.';

  @override
  String get notifClearAll => 'Borrar todo';

  @override
  String get notifClearAllBody =>
      'Se eliminarán todas las notificaciones de esta lista. Seguirás recibiendo las nuevas.';

  @override
  String get notifClearAllQ => '¿Borrar todas las notificaciones?';

  @override
  String get notifDeleteBody => 'Esta notificación se quitará de la lista.';

  @override
  String get notifDeleteQ => '¿Eliminar la notificación?';

  @override
  String get notifLoadFailed => 'No se han podido cargar las notificaciones.';

  @override
  String get notifMarkAllRead => 'Marcar todo como leído';

  @override
  String get notifNothingToOpen =>
      'No hay nada más que abrir en esta notificación.';

  @override
  String get notifPrefAnnouncements => 'Novedades del equipo de Drift';

  @override
  String get notifPrefClubs =>
      'Anuncios y novedades de membresía de tus clubes';

  @override
  String get notifPrefCommunities =>
      'Aprobaciones, solicitudes para unirse y nuevas competiciones en tus comunidades';

  @override
  String get notifPrefCompetitions => 'Nuevas rondas y resultados de tus ligas';

  @override
  String get notifPrefConnections =>
      'Solicitudes de conexión y conexiones aceptadas';

  @override
  String get notifPrefLearning =>
      'Objetivos, planes y recordatorios de entrenamiento';

  @override
  String get notifPrefLearningTitle => 'Aprendizaje';

  @override
  String get notifPrefLoadFailed => 'No se han podido cargar tus preferencias.';

  @override
  String get notifPrefMatches => 'Nuevos desafíos y novedades de partidos';

  @override
  String get notifPrefMatchesTitle => 'Partidos';

  @override
  String get notifPrefMessages => 'Mensajes nuevos en tus chats';

  @override
  String get notifPrefNews => 'Noticias y reportajes de tenis';

  @override
  String get onbAdjustLevel => 'Ajustar nivel';

  @override
  String get onbAdjustLevelTitle => 'Ajustar nivel';

  @override
  String get onbAllSet => '¡Todo listo!';

  @override
  String get onbAllSetBody =>
      'Tu perfil de tenis está listo. Explora jugadores, pistas y partidos cerca de ti.';

  @override
  String get onbAvailabilityHighlight => 'jugar?';

  @override
  String get onbAvailabilitySubtitle =>
      'Toca las franjas en las que sueles estar libre. Puedes cambiarlas cuando quieras.';

  @override
  String get onbAvailabilityTitle => '¿Cuándo puedes jugar?';

  @override
  String get onbBasicHighlight => 'ti';

  @override
  String get onbBasicSubtitle =>
      'Solo lo básico. Puedes cambiarlo todo más tarde.';

  @override
  String get onbBasicTitle => 'Cuéntanos sobre ti';

  @override
  String get onbChooseEachSection =>
      'Elige una opción en cada sección para continuar.';

  @override
  String get onbChooseHand => 'Elige tu mano dominante para continuar.';

  @override
  String get onbChooseOption => 'Elige una opción para continuar.';

  @override
  String get onbClubHighlight => 'juegas?';

  @override
  String get onbClubName => 'Nombre del club (opcional)';

  @override
  String get onbClubSubtitle => '¿Aún sin club? Omite este paso.';

  @override
  String get onbClubTitle => '¿Dónde juegas?';

  @override
  String get onbConfirmLevel => 'Confirmar nivel';

  @override
  String get onbEnterLocation =>
      'Indica tu ubicación aproximada para continuar.';

  @override
  String get onbExperienceHighlight => 'tenis?';

  @override
  String get onbExperienceSubtitle =>
      'Adaptaremos tu entrenamiento a tu nivel.';

  @override
  String get onbExperienceTitle => '¿Cuál es tu experiencia en el tenis?';

  @override
  String get onbFormat => 'Formato';

  @override
  String get onbGeneralLocation => 'Ubicación / ciudad';

  @override
  String get onbGoHome => 'Ir al inicio';

  @override
  String get onbGoalsHighlight => 'Drift?';

  @override
  String get onbGoalsSubtitle =>
      'Elige todas las que quieras. Solo influye en lo que te sugerimos.';

  @override
  String get onbGoalsTitle => '¿Qué te trae a Drift?';

  @override
  String get onbHandAmbidextrous => 'Ambidiestro';

  @override
  String get onbHandLeft => 'Izquierda';

  @override
  String get onbHandRight => 'Derecha';

  @override
  String get onbLoadDetailsFailed =>
      'No se han podido cargar tus datos. Inténtalo de nuevo.';

  @override
  String get onbLocateFailed =>
      'No se ha podido determinar tu ubicación. Introdúcela abajo.';

  @override
  String get onbLocating => 'Localizando…';

  @override
  String get onbLocationHighlight => 'vives?';

  @override
  String get onbLocationSubtitle =>
      'Lo usamos para encontrar jugadores y pistas cerca de ti.';

  @override
  String get onbLocationTitle => '¿Dónde vives?';

  @override
  String get onbPadelHighlight => 'pádel?';

  @override
  String get onbPadelLearn => 'Me gustaría aprender';

  @override
  String get onbPadelLearnSub => 'Dispuesto a probarlo';

  @override
  String get onbPadelNo => 'No, solo tenis';

  @override
  String get onbPadelNoSub => 'Fiel a lo clásico';

  @override
  String get onbPadelSubtitle =>
      'El pádel llega pronto a Drift: dinos si juegas o quieres aprender.';

  @override
  String get onbPadelTitle => '¿También juegas al pádel?';

  @override
  String get onbPadelYes => 'Sí, juego al pádel';

  @override
  String get onbPadelYesSub => 'Ya estoy en la pista';

  @override
  String get onbPlayingHand => 'Mano dominante';

  @override
  String get onbPreferredCourt => 'Pista preferida (opcional)';

  @override
  String get onbPreferredTimes => 'Horarios preferidos';

  @override
  String get onbPrefsHighlight => 'jugar?';

  @override
  String get onbPrefsSubtitle => 'Esto define con quién te emparejamos.';

  @override
  String get onbPrefsTitle => '¿Cómo te gusta jugar?';

  @override
  String get onbSelectAll => 'elige todas las que correspondan';

  @override
  String onbStepOf(int step, int total) {
    return 'PASO $step DE $total';
  }

  @override
  String get onbStyle => 'Estilo';

  @override
  String get onbSuggestedHighlight => 'nivel';

  @override
  String onbSuggestedLevel(String level) {
    return 'Sugerido: $level';
  }

  @override
  String get onbSuggestedSubtitle =>
      'Según tus respuestas, este es el nivel que creemos que te corresponde. Puedes ajustarlo cuando quieras desde tu perfil.';

  @override
  String get onbSuggestedTitle => 'Tu nivel sugerido';

  @override
  String get onbTimeBlockAm => 'Mañana';

  @override
  String get onbTimeBlockMid => 'Mediodía';

  @override
  String get onbTimeBlockPm => 'Tarde';

  @override
  String get onbUseCurrentLocation => 'Usar mi ubicación actual';

  @override
  String get optCompetitive => 'Competitivo';

  @override
  String get optDoubles => 'Dobles';

  @override
  String get optEither => 'Cualquiera';

  @override
  String get optSingles => 'Individuales';

  @override
  String get optSocial => 'Social';

  @override
  String get padelAdd => 'Añadir pádel';

  @override
  String get padelAddBody =>
      'Harás una breve evaluación adaptativa centrada en el pádel: regularidad, juego en la red, golpes con pared y más. Genera un perfil de pádel totalmente independiente de tu perfil de tenis.';

  @override
  String get padelAddHeading => 'Añade el pádel a tu perfil';

  @override
  String get padelAdding => 'Añadiendo…';

  @override
  String get padelAssessment => 'Evaluación de pádel';

  @override
  String get padelCompleteAssessment =>
      'Completa la evaluación para obtener tu nivel';

  @override
  String get padelGoalsHint =>
      'Separados por comas, p. ej., Mejorar mi bandeja, Jugar cada semana';

  @override
  String get padelHistoryEmpty =>
      'Juega tu primer partido de pádel para empezar tu historial';

  @override
  String get padelHistoryFailed =>
      'No se ha podido cargar tu historial de pádel.';

  @override
  String get padelMatchHistory => 'Historial de partidos de pádel';

  @override
  String get padelNotAdded => 'Aún no has añadido el pádel.';

  @override
  String get padelPartnerHint => 'p. ej., Busco pareja fija';

  @override
  String get padelPartnerPreference => 'Preferencia de pareja';

  @override
  String padelPartnerPreferenceValue(String value) {
    return 'Preferencia de pareja: $value';
  }

  @override
  String get padelPillarBandeja => 'Bandeja';

  @override
  String get padelPillarNetControl => 'Control de la red';

  @override
  String get padelPillarOverhead => 'Golpe por encima de la cabeza';

  @override
  String get padelPillarPartnerCommunication => 'Comunicación con la pareja';

  @override
  String get padelPillarPositioning => 'Posicionamiento';

  @override
  String get padelPillarRallyConsistency => 'Regularidad';

  @override
  String get padelPillarSmash => 'Remate';

  @override
  String get padelPillarTacticalAwareness => 'Visión táctica';

  @override
  String get padelPillarTransition => 'Transición';

  @override
  String get padelPillarVibora => 'Víbora';

  @override
  String get padelPillarWallUsage => 'Uso de la pared';

  @override
  String get padelPreferences => 'Preferencias';

  @override
  String get padelPreferredSide => 'Lado preferido';

  @override
  String padelPreferredSideValue(String side) {
    return 'Lado preferido: $side';
  }

  @override
  String get padelPrefsGoals => 'Preferencias y objetivos';

  @override
  String get padelProfile => 'Perfil de pádel';

  @override
  String get padelProfileFailed => 'No se ha podido cargar tu perfil de pádel.';

  @override
  String get padelSkillProfile => 'Perfil técnico';

  @override
  String get padelStartAssessment => 'Empezar evaluación de pádel';

  @override
  String get padelYourStats => 'Tus estadísticas de pádel';

  @override
  String get payActive => 'Activo';

  @override
  String get payAddMethod => 'Añadir método';

  @override
  String get payAddPaymentMethod => 'Añadir método de pago';

  @override
  String get payAmount => 'Importe';

  @override
  String get payBillingHistory => 'Historial de facturación';

  @override
  String get payBillingHistoryFailed =>
      'No se ha podido cargar tu historial de facturación.';

  @override
  String get payCard => 'Tarjeta';

  @override
  String get payCardBrand => 'Marca de la tarjeta';

  @override
  String get payCardBrandHint => 'p. ej., Visa';

  @override
  String get payCardLast4 => 'Tarjeta tokenizada: últimos cuatro dígitos';

  @override
  String get payChangePlan => 'Cambiar plan';

  @override
  String get payChargesReceipts => 'Cargos y recibos';

  @override
  String get payChooseFree => 'Elegir Gratis';

  @override
  String get payChoosePlan => 'Elige un plan';

  @override
  String get payCreated => 'Creado';

  @override
  String get payCurrent => 'Actual';

  @override
  String get payCurrentPlan => 'Plan actual';

  @override
  String get payDate => 'Fecha';

  @override
  String get payDefault => 'Predeterminado';

  @override
  String get payDownloadReceipt => 'Descargar recibo';

  @override
  String get payFailed => 'Fallido';

  @override
  String get payFailureReason => 'Motivo del fallo';

  @override
  String get payFourDigits => 'Introduce exactamente cuatro dígitos.';

  @override
  String get payFree => 'Gratis';

  @override
  String get payFreeBeta => 'Gratis durante la beta';

  @override
  String get payIncluded => 'Incluido';

  @override
  String get payInvoice => 'Factura';

  @override
  String get payManageMethods => 'Gestionar métodos de pago';

  @override
  String get payMethodsFailed => 'No se han podido cargar tus métodos de pago.';

  @override
  String get payMobileLast4 =>
      'Número móvil tokenizado: últimos cuatro dígitos';

  @override
  String get payMobileMoney => 'Dinero móvil';

  @override
  String get payNoBillingHistory => 'Aún no hay historial de facturación';

  @override
  String get payNoChargesBeta => 'Sin cargos durante la beta.';

  @override
  String get payNoMethod => 'No hay ningún método de pago guardado';

  @override
  String get payNoMethodBody =>
      'Añade una tarjeta o dinero móvil tokenizado para elegir un plan de pago.';

  @override
  String get payNotAvailable => 'No disponible';

  @override
  String get payPaid => 'Pagado';

  @override
  String get payPastDue => 'Vencido';

  @override
  String get payPaymentMethod => 'Método de pago';

  @override
  String get payPaymentMethods => 'Métodos de pago';

  @override
  String payPerMonth(String amount) {
    return '$amount / mes';
  }

  @override
  String payPerYear(String amount) {
    return '$amount / año';
  }

  @override
  String get payPeriod => 'Periodo';

  @override
  String payPeriodEnds(String date) {
    return 'El periodo actual termina el $date';
  }

  @override
  String payPeriodRange(String start, String end) {
    return 'del $start al $end';
  }

  @override
  String get payPlan => 'Plan';

  @override
  String get payPlansFailed =>
      'No se han podido cargar los planes disponibles.';

  @override
  String get payProcessing => 'Procesando…';

  @override
  String get payProviderReference => 'Referencia del proveedor';

  @override
  String get payReceipt => 'Recibo';

  @override
  String get payReceiptHeading => 'Recibo de Drift Tennis';

  @override
  String get payReceiptSaveFailed =>
      'No se ha podido guardar el recibo. Inténtalo de nuevo.';

  @override
  String payReceiptSaved(String path) {
    return 'Recibo guardado en $path';
  }

  @override
  String get payReceiptsAppear =>
      'Los recibos aparecerán aquí tras tu primer cambio a un plan de pago.';

  @override
  String get payRemove => 'Eliminar';

  @override
  String get payRemoveMethodQ => '¿Eliminar el método de pago?';

  @override
  String payRemoveNamed(String name) {
    return 'Eliminar $name';
  }

  @override
  String get payRetryPayment => 'Reintentar pago';

  @override
  String get paySaveMethod => 'Guardar método';

  @override
  String get paySelectAndPay => 'Elegir y pagar';

  @override
  String get payStatus => 'Estado';

  @override
  String get paySubscriptionFailed => 'No se ha podido cargar tu suscripción.';

  @override
  String get payTokenNote =>
      'Drift solo guarda el token del proveedor y estos dígitos. Tus datos de pago completos nunca llegan a Drift.';

  @override
  String get payUpgradePlan => 'Mejorar plan';

  @override
  String get payVoid => 'Anulado';

  @override
  String get pillarBackhand => 'Revés';

  @override
  String get pillarCompetitionExperience => 'Experiencia competitiva';

  @override
  String get pillarFitness => 'Forma física';

  @override
  String get pillarFootwork => 'Juego de pies';

  @override
  String get pillarForehand => 'Derecha';

  @override
  String get pillarMatchPlay => 'Juego en partido';

  @override
  String get pillarMental => 'Mental';

  @override
  String get pillarMovement => 'Desplazamiento';

  @override
  String get pillarNetPlay => 'Juego en la red';

  @override
  String get pillarReturn => 'Resto';

  @override
  String get pillarServe => 'Saque';

  @override
  String get pillarTactics => 'Táctica';

  @override
  String get pillarVolley => 'Volea';

  @override
  String get playActiveEmpty =>
      'No hay partidos próximos: desafía a alguien para empezar.';

  @override
  String get playChallengeWithdrawn => 'Desafío retirado.';

  @override
  String get playChallengesEmpty =>
      'No hay desafíos abiertos: busca un jugador y envía uno.';

  @override
  String playCompetitionRound(String name, int round) {
    return '$name · Ronda $round';
  }

  @override
  String get playFindOpponent => 'Buscar rival';

  @override
  String get playHistoryEmpty =>
      'Juega tu primer partido para empezar tu historial.';

  @override
  String get playLoadPlayersFailed =>
      'No se han podido cargar los jugadores. Desliza para reintentar.';

  @override
  String get playNoPlayersFound => 'No se han encontrado jugadores.';

  @override
  String get playRespond => 'Responder';

  @override
  String get playSegmentMatches => 'Partidos';

  @override
  String get playTabActive => 'Activos';

  @override
  String get playTabChallenges => 'Desafíos';

  @override
  String get playTabHistory => 'Historial';

  @override
  String get playYourStats => 'Tus estadísticas';

  @override
  String get playerAtAGlance => 'DE UN VISTAZO';

  @override
  String get playerCancelRequest => 'Cancelar solicitud';

  @override
  String get playerChallengeToMatch => 'Desafiar a un partido';

  @override
  String get playerConnect => 'Conectar';

  @override
  String get playerConnectToSeeAvailability =>
      'Conecta para ver cuándo suele estar libre este jugador.';

  @override
  String get playerConnectToSeeSkills =>
      'Conecta con este jugador para ver el desglose de su juego.';

  @override
  String get playerConnected => 'Conectados';

  @override
  String get playerDevelopmentAreas => 'Áreas de mejora';

  @override
  String get playerLoadFailed =>
      'No se ha podido cargar este jugador ahora mismo.';

  @override
  String get playerLocation => 'Ubicación';

  @override
  String get playerMessage => 'Mensaje';

  @override
  String get playerNoAssessment =>
      'Este jugador aún no ha completado ninguna evaluación.';

  @override
  String get playerNoMatchFilters =>
      'Ningún jugador coincide con estos filtros. Prueba a ampliar la distancia o el nivel.';

  @override
  String get playerPlays => 'Juega';

  @override
  String get playerRequestSent => 'Solicitud enviada';

  @override
  String playerRequestSentBody(String name) {
    return '$name verá tu solicitud de conexión. Puedes cancelarla mientras esté pendiente.';
  }

  @override
  String get playerRequestSentCancel => 'Solicitud enviada · Cancelar';

  @override
  String playerStatsOf(String name) {
    return 'Estadísticas de $name';
  }

  @override
  String get playerUnavailable => 'Jugador no disponible.';

  @override
  String get playerViewStats => 'Ver estadísticas';

  @override
  String get playerWantsToConnect => 'Quiere conectar: responde en Solicitudes';

  @override
  String get practiceDuration => 'Duración';

  @override
  String get practiceEmpty => 'Registra tu primera sesión de entrenamiento';

  @override
  String get practiceLoadFailed =>
      'No se ha podido cargar tu registro de entrenamiento.';

  @override
  String get practiceMinutesShort => 'min';

  @override
  String get practiceNotes => 'Notas';

  @override
  String get practiceNotesHint => '¿Qué has trabajado? ¿Algún avance?';

  @override
  String get practiceSave => 'Guardar entrenamiento';

  @override
  String get practiceSkillFocus => 'Habilidad trabajada';

  @override
  String get privacyAvailabilityNote =>
      'Desactivado: solo tus conexiones ven tu disponibilidad detallada';

  @override
  String get privacyLoadFailed =>
      'No se han podido cargar tus ajustes de privacidad.';

  @override
  String get privacyShowEveryone => 'Mostrar a todos';

  @override
  String get privacySkillsNote =>
      'Desactivado: solo tus conexiones ven el desglose de tu juego';

  @override
  String get profileAddPadel => '+ Añadir pádel';

  @override
  String get profileAddPhoto => 'Añadir una foto';

  @override
  String get profileBio => 'Biografía';

  @override
  String get profileBioHint => 'Cuéntales algo sobre ti a otros jugadores';

  @override
  String get profileEdit => 'Editar perfil';

  @override
  String get profileLevelNotAssessed => 'Nivel aún sin evaluar';

  @override
  String profileLevelWithLabel(String level, String label) {
    return 'Nivel $level · $label';
  }

  @override
  String get profileLoadFailed => 'No se ha podido cargar tu perfil.';

  @override
  String get profileMySports => 'Mis deportes';

  @override
  String get profileRating => 'Nivel';

  @override
  String get profileMatches => 'Partidos';

  @override
  String get profileWins => 'Victorias';

  @override
  String profilePlayingSince(String date) {
    return 'Juega en Drift desde $date';
  }

  @override
  String get profileMyStats => 'Mis estadísticas';

  @override
  String get profilePadelLoadFailed =>
      'No se ha podido cargar tu perfil de pádel';

  @override
  String get profileRemovePhoto => 'Eliminar foto';

  @override
  String get profileYourActiveProfile => 'Tu perfil activo';

  @override
  String get progressEmpty =>
      'Tu informe de progreso se completa a medida que juegas y entrenas';

  @override
  String get proposeAddTime => 'Añadir una hora';

  @override
  String get proposeFutureTime => 'Elige una hora futura.';

  @override
  String get proposeNoTimes => 'Aún no has añadido horas.';

  @override
  String proposeOfferUpTo(int max) {
    return 'Ofrece hasta $max opciones y elegirá una.';
  }

  @override
  String proposeSendTimes(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Enviar $count horas',
      one: 'Enviar 1 hora',
    );
    return '$_temp0';
  }

  @override
  String get proposeTitle => 'Proponer horas';

  @override
  String get pushFallbackBody => 'Abre para ver qué ha cambiado.';

  @override
  String get pushFallbackTitle => 'Novedad de Drift Tennis';

  @override
  String get quickBookCourt => 'Reservar pista';

  @override
  String get quickBookCourtHint => 'Pistas cerca de ti';

  @override
  String get quickEnterLadder => 'Entrar en escalera';

  @override
  String get quickEnterLadderHint => 'Sube en la clasificación';

  @override
  String get quickFindMatch => 'Buscar partido';

  @override
  String get quickFindMatchHint => 'Jugadores de tu nivel';

  @override
  String get quickLogPractice => 'Registrar entreno';

  @override
  String get quickLogPracticeHint => 'Mantén la racha';

  @override
  String get rateGood => 'Bien';

  @override
  String get rateGreat => 'Muy bien';

  @override
  String get rateOkay => 'Regular';

  @override
  String get ratePeak => 'Genial';

  @override
  String get rateRough => 'Mal';

  @override
  String get reasonCheating => 'Trampas';

  @override
  String get reasonFakeProfile => 'Perfil falso';

  @override
  String get reasonHarassment => 'Acoso o abuso';

  @override
  String get reasonOther => 'Otro motivo';

  @override
  String get reasonSpam => 'Spam';

  @override
  String get reportChooseReason => 'Elige un motivo para continuar.';

  @override
  String get reportCourtTitle => 'Informar / actualizar datos de la pista';

  @override
  String get reportDuplicate => 'Duplicada';

  @override
  String get reportInappropriate => 'Contenido inapropiado';

  @override
  String get reportIncorrectInfo => 'Información incorrecta';

  @override
  String get reportOther => 'Otro';

  @override
  String get reportPermanentlyClosed => 'Cerrada definitivamente';

  @override
  String get reportThanks => 'Gracias, lo revisaremos.';

  @override
  String get safetyAnythingElse => '¿Algo más? (opcional)';

  @override
  String get safetyBlock => 'Bloquear';

  @override
  String get safetyBlockBody =>
      'No podrá encontrarte ni contactarte, y se eliminará cualquier conexión entre vosotros.';

  @override
  String get safetyBlockPlayer => 'Bloquear jugador';

  @override
  String get safetyBlockQ => '¿Bloquear a este jugador?';

  @override
  String get safetyBlockSub => 'Ya no podrá encontrarte ni contactarte';

  @override
  String get safetyMessageReported =>
      'Gracias, hemos recibido la denuncia del mensaje.';

  @override
  String get safetyPlayerBlocked => 'Jugador bloqueado.';

  @override
  String get safetyReportMessage => 'Denunciar este mensaje';

  @override
  String get safetyReportPlayer => 'Denunciar jugador';

  @override
  String get safetyReportPrivacy =>
      'Las denuncias llegan a nuestro equipo de moderación y nunca se comparten con el jugador denunciado.';

  @override
  String get safetyReportSubmitted => 'Denuncia enviada. Gracias.';

  @override
  String get safetyReporting => 'Enviando denuncia…';

  @override
  String get safetySubmitReport => 'Enviar denuncia';

  @override
  String get safetyTellUs => 'Cuéntanos qué ha pasado';

  @override
  String get safetyTitle => 'Seguridad';

  @override
  String get scoreErrBothGames => 'Introduce los juegos de ambos en cada set.';

  @override
  String scoreErrInvalid(int set, String score) {
    return 'El set $set ($score) no es un resultado de tenis válido.';
  }

  @override
  String scoreErrNeedTiebreak(int set) {
    return 'El set $set se decidió en tie-break (7-6): introduce los puntos del tie-break.';
  }

  @override
  String get scoreErrRetirementWinner => 'Elige quién ganó tras la retirada.';

  @override
  String scoreErrTie(int set, String score) {
    return 'El set $set no puede acabar en empate ($score).';
  }

  @override
  String scoreErrTiebreak(int set, String score) {
    return 'Los puntos del tie-break del set $set ($score) no son un final válido.';
  }

  @override
  String get searchAll => 'Todo';

  @override
  String get searchCompetitions => 'Competiciones';

  @override
  String get searchHint => 'Jugadores, pistas, clubes, competiciones';

  @override
  String get searchLoadFailed => 'No se ha podido cargar la búsqueda.';

  @override
  String get searchMinChars =>
      'Escribe al menos dos caracteres para buscar en Drift.';

  @override
  String searchNoResults(String query) {
    return 'No hay resultados para «$query». Prueba una búsqueda más amplia u otro filtro.';
  }

  @override
  String get searchPlayersHint => 'Buscar jugadores…';

  @override
  String get searchResult => 'Resultado';

  @override
  String get searchResultsFailed => 'No se han podido cargar los resultados.';

  @override
  String get seasonDraft => 'Aún no abierta';

  @override
  String get seasonNotStarted => 'Aún no ha empezado';

  @override
  String get seasonRegistrationOpen => 'Inscripción abierta';

  @override
  String seasonRoundOf(int current, int total) {
    return 'Ronda $current de $total';
  }

  @override
  String get seasonStartingSoon => 'Empieza pronto';

  @override
  String get securityChangePassword => 'Cambiar contraseña';

  @override
  String get securityCurrentPassword => 'Contraseña actual';

  @override
  String get securityPasswordUpdated => 'Contraseña actualizada.';

  @override
  String get securityUpdatePassword => 'Actualizar contraseña';

  @override
  String get settingsAccount => 'Cuenta';

  @override
  String get settingsAccountSecurity => 'Cuenta y seguridad';

  @override
  String get settingsAnalyseClip => 'Analizar un vídeo';

  @override
  String get settingsAppearance => 'Apariencia';

  @override
  String get settingsBlockedUsers => 'Usuarios bloqueados';

  @override
  String get settingsContactSupport => 'Contactar con soporte';

  @override
  String get settingsDeleteAccount => 'Eliminar cuenta';

  @override
  String get settingsHelpFaq => 'Ayuda y preguntas frecuentes';

  @override
  String get settingsLabs => 'Laboratorio';

  @override
  String get settingsLanguage => 'Idioma';

  @override
  String get settingsLegalDocuments => 'Documentos legales';

  @override
  String get settingsLogOutRow => 'Cerrar sesión';

  @override
  String get settingsLogout => 'Cerrar sesión';

  @override
  String get settingsLogoutConfirmBody =>
      'Puedes volver a iniciar sesión cuando quieras.';

  @override
  String get settingsLogoutConfirmTitle => '¿Cerrar sesión?';

  @override
  String get settingsManageConnectionRequests =>
      'Gestionar solicitudes de conexión';

  @override
  String get settingsNotificationPreferences =>
      'Preferencias de notificaciones';

  @override
  String get settingsNotifications => 'Notificaciones';

  @override
  String get settingsPlanBilling => 'Plan y facturación';

  @override
  String get settingsPrivacySafety => 'Privacidad y seguridad';

  @override
  String get settingsPrivacySettings => 'Ajustes de privacidad';

  @override
  String get settingsSubscriptionPlan => 'Suscripción y plan';

  @override
  String get settingsSupport => 'Soporte';

  @override
  String get settingsThemeDark => 'Oscuro';

  @override
  String get settingsThemeDevice => 'Dispositivo';

  @override
  String get settingsThemeLight => 'Claro';

  @override
  String settingsThemeValue(String mode) {
    return 'Tema: $mode';
  }

  @override
  String get settingsTitle => 'Ajustes';

  @override
  String settingsVersion(String version) {
    return 'Drift Tennis v$version';
  }

  @override
  String get skillBuilding => 'En progreso';

  @override
  String get skillNotEnoughData =>
      'Aún no hay datos suficientes: completa algunos entrenamientos o partidos';

  @override
  String get skillOnboardingAssessment => 'Evaluación inicial';

  @override
  String get skillProfileUnavailable => 'Perfil técnico no disponible.';

  @override
  String get skillRecommended => 'Recomendado';

  @override
  String get skillRecommendedForYou => 'Recomendado para ti';

  @override
  String get skillRetakeAssessment => 'Repetir evaluación';

  @override
  String get skillSetGoal => 'Fijar un objetivo';

  @override
  String get skillSignals => 'Señales que influyen';

  @override
  String get splashConnectFailed =>
      'No se ha podido conectar. Tu sesión sigue guardada.';

  @override
  String get sportPadel => 'Pádel';

  @override
  String get sportTennis => 'Tenis';

  @override
  String get standingsLegend =>
      'V = victoria · D = derrota · Pts = puntos (3 por victoria)';

  @override
  String get standingsPlayed => 'PJ';

  @override
  String get standingsPoints => 'Pts';

  @override
  String get statLosses => 'Derrotas';

  @override
  String get statNoMatchesPlayed => 'Ningún partido jugado';

  @override
  String get statNoRatedMatches => 'Aún no hay partidos puntuados';

  @override
  String get statPlayed => 'Jugados';

  @override
  String get statRecentForm => 'Forma reciente';

  @override
  String get statWinRate => '% de victorias';

  @override
  String get statWins => 'Victorias';

  @override
  String statWinsLosses(int wins, int losses) {
    return '$wins V · $losses D';
  }

  @override
  String get statWon => 'Ganados';

  @override
  String get supportBody =>
      'Envíanos un correo y te responderemos lo antes posible. Usa esta dirección para recuperar tu cuenta, solicitudes de borrado, facturación, denuncias y problemas técnicos.';

  @override
  String supportEmailButton(String email) {
    return 'Escribir a $email';
  }

  @override
  String supportEmailUs(String email) {
    return 'Escríbenos a $email';
  }

  @override
  String get supportNeedHelp => '¿Necesitas ayuda?';

  @override
  String get surfaceArtificialGrass => 'Hierba artificial';

  @override
  String get surfaceCarpet => 'Moqueta';

  @override
  String get surfaceClay => 'Tierra batida';

  @override
  String get surfaceGrass => 'Hierba';

  @override
  String get surfaceHard => 'Rápida';

  @override
  String get sysChallengeAccepted => 'Desafío aceptado';

  @override
  String get sysChallengeDeclined => 'Desafío rechazado';

  @override
  String get sysChallengeSent => 'Desafío enviado';

  @override
  String get sysChallengeWithdrawn => 'Desafío retirado';

  @override
  String get sysCourtSuggested => 'Pista sugerida';

  @override
  String get sysDisputeResolved => 'Disputa resuelta';

  @override
  String get sysFixtureScheduled => 'Partido programado';

  @override
  String get sysFixtureWalkover => 'Partido no jugado: walkover';

  @override
  String get sysMatchCancelled => 'Partido cancelado';

  @override
  String get sysMatchConfirmed => 'Partido confirmado';

  @override
  String get sysMatchRescheduled => 'Partido reprogramado';

  @override
  String get sysResultConfirmed => 'Resultado confirmado';

  @override
  String get sysResultDisputed => 'Resultado disputado';

  @override
  String get sysResultSubmitted => 'Resultado enviado';

  @override
  String get sysTimeAccepted => 'Hora aceptada';

  @override
  String get sysTimeProposed => 'Hora propuesta';

  @override
  String get timeAfternoon => 'Tarde';

  @override
  String get timeEvening => 'Noche';

  @override
  String get timeMorning => 'Mañana';

  @override
  String get videoAnalyseThis => 'Analizar este vídeo';

  @override
  String get videoAnalysingYourClip => 'Analizando tu vídeo…';

  @override
  String get videoAnalysisError => 'Algo ha fallado al analizar este vídeo.';

  @override
  String get videoAnalysisUnfinished => 'El análisis no ha terminado';

  @override
  String get videoBuffering => 'Cargando vídeo…';

  @override
  String get videoChecking => 'Comprobando tu vídeo…';

  @override
  String get videoCheckingOffline =>
      'La comprobación de vídeos no está disponible';

  @override
  String get videoCheckingOfflineBody =>
      'Puedes subirlo igualmente, pero ahora mismo no podemos comprobarlo.';

  @override
  String get videoChooseLibrary => 'Elegir de la galería';

  @override
  String get videoClipAnalysis => 'Análisis del vídeo';

  @override
  String get videoClipPassed => 'Este vídeo ha superado las comprobaciones';

  @override
  String get videoClipRejected => 'Este vídeo no se puede analizar';

  @override
  String get videoClipUsable => 'Este vídeo parece válido';

  @override
  String get videoCoupleSeconds => 'Tarda un par de segundos.';

  @override
  String get videoCourtUnchecked =>
      'Nota: no hemos podido comprobar las líneas de la pista en este vídeo, así que no podemos garantizar que se lea bien.';

  @override
  String get videoDidntWork => 'No ha funcionado';

  @override
  String get videoEarlyNote =>
      'El análisis es una función nueva. Estas cifras proceden de una sola cámara y son estimaciones, no lecturas de radar.';

  @override
  String get videoLesson => 'Lección en vídeo';

  @override
  String get videoLessonComplete => 'Lección marcada como completada.';

  @override
  String get videoLessonNotFound => 'No se ha encontrado la lección en vídeo.';

  @override
  String get videoLoadClipFailed => 'No se ha podido cargar este vídeo';

  @override
  String videoMeasuredAll(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Hemos medido los $count puntos encontrados',
      one: 'Hemos medido el único punto encontrado',
    );
    return '$_temp0';
  }

  @override
  String get videoMeasuredAllBody =>
      'Los totales de abajo cubren toda la sesión.';

  @override
  String videoMeasuredSome(int analysed, int found) {
    return 'Hemos medido $analysed de $found puntos';
  }

  @override
  String videoMeasuredSomeBody(int analysed) {
    return 'Analizar vídeo es lento, así que procesamos toda la sesión que podemos. Los totales de abajo cubren los $analysed puntos que hemos medido, no toda la sesión. Todos los puntos encontrados aparecen más abajo.';
  }

  @override
  String get videoNoAsset => 'Esta lección no tiene ningún vídeo.';

  @override
  String get videoNoDistances =>
      'No hay distancias ni velocidades para este vídeo';

  @override
  String get videoNoDistancesBody =>
      'No se han podido leer las líneas de la pista con claridad para medir distancias, así que las velocidades y posiciones no serían medidas reales. El recuento de golpes sigue siendo exacto.';

  @override
  String get videoNoSpeeds =>
      'No se ha podido medir ninguna velocidad en este vídeo.';

  @override
  String get videoOpponent => 'Rival';

  @override
  String get videoOpponentAvgShot => 'Golpe medio del rival';

  @override
  String get videoPassedChecks =>
      'Ha superado todas las comprobaciones que podemos hacer hoy. El análisis aún está en desarrollo; te avisaremos cuando esté disponible.';

  @override
  String get videoPause => 'Pausa';

  @override
  String get videoPlay => 'Reproducir';

  @override
  String get videoPlaybackCompleted =>
      'Reproducción terminada. Marca la lección como completada cuando quieras.';

  @override
  String get videoPlaybackError => 'Error de reproducción. Inténtalo de nuevo.';

  @override
  String get videoRalliesMeasured => 'Puntos medidos';

  @override
  String get videoRallyByRally => 'Punto a punto';

  @override
  String get videoRallyFailed => 'No se ha podido analizar este punto';

  @override
  String get videoReadyToAnalyse =>
      'Está listo para analizarse cuando quieras.';

  @override
  String get videoRecord => 'Grabar un vídeo';

  @override
  String get videoServeAvg => 'Saque (media del vuelo)';

  @override
  String get videoSessionTotals => 'Totales de la sesión';

  @override
  String videoShotCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count golpes',
      one: '1 golpe',
    );
    return '$_temp0';
  }

  @override
  String videoShotCountNoCourt(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count golpes',
      one: '1 golpe',
    );
    return '$_temp0 · sin ajuste de pista, sin velocidades';
  }

  @override
  String get videoShotTypes => 'Tipos de golpe';

  @override
  String get videoShotTypesNote =>
      'Los tipos de golpe son una función nueva y a menudo fallan. Tómalos como una referencia aproximada.';

  @override
  String get videoShots => 'Golpes';

  @override
  String get videoSkippedBudget =>
      'Sin medir: se agotó el tiempo de análisis de esta sesión';

  @override
  String get videoSomeUncalibrated =>
      'En algunos puntos no se ha podido medir la velocidad';

  @override
  String videoSomeUncalibratedBody(int count) {
    return '$count de los puntos medidos no tenían líneas de pista lo bastante claras, así que cuentan para los golpes pero no para las velocidades.';
  }

  @override
  String get videoSpeed => 'Velocidad';

  @override
  String get videoSpeedNote =>
      'Media del vuelo de la bola, por lo que es menor que una lectura de radar en el impacto.';

  @override
  String get videoStarting => 'Iniciando…';

  @override
  String get videoStatusAccepted => 'Listo para analizar';

  @override
  String get videoStatusAnalysed => 'Analizado';

  @override
  String get videoStatusAnalysing => 'Analizando…';

  @override
  String get videoStatusFailed => 'Algo ha fallado';

  @override
  String get videoStatusRejected => 'No se puede analizar';

  @override
  String get videoTakesMinutes =>
      'El análisis tarda unos minutos. Te avisaremos cuando termine; no hace falta que te quedes en esta pantalla.';

  @override
  String get videoTakesMinutesLeave =>
      'Tarda unos minutos. Te avisaremos cuando esté listo, así que puedes salir de esta pantalla.';

  @override
  String get videoTip1 => 'Pon el móvil en horizontal, no en vertical';

  @override
  String get videoTip2 => 'Apóyalo en la valla o usa un trípode y no lo muevas';

  @override
  String get videoTip3 => 'Encuadra toda la pista que puedas';

  @override
  String get videoTip4 =>
      'Las pistas con líneas claras y visibles funcionan mejor';

  @override
  String get videoTip5 => 'Una sola toma continua, sin cortes ni ediciones';

  @override
  String get videoTipsHeading => 'Para conseguir un vídeo útil';

  @override
  String get videoTooShort => 'Demasiado corto para medirlo';

  @override
  String get videoTryAnother => 'Probar otro vídeo';

  @override
  String get videoUnreachable =>
      'No se ha podido conectar con Drift. Revisa tu conexión e inténtalo de nuevo.';

  @override
  String get videoUploadAnother => 'Subir otro';

  @override
  String get videoUploadFailed =>
      'Algo ha fallado al subir el vídeo. Inténtalo de nuevo.';

  @override
  String get videoUploadTimeout =>
      'La subida ha caducado. Revisa tu conexión e inténtalo de nuevo; un vídeo más corto se sube más rápido.';

  @override
  String get videoUploading => 'Subiendo…';

  @override
  String get videoWhatToChange =>
      'Esto es lo que debes cambiar antes de volver a grabar.';

  @override
  String get videoWorthKnowing => 'Conviene saber';

  @override
  String get videoYourAvgShot => 'Tu golpe medio';

  @override
  String get welcomeBody =>
      'Sigue tus partidos, entra en escaleras y torneos y sube de nivel, todo en un mismo lugar.';

  @override
  String get welcomeContinueEmail => 'Continuar con correo';

  @override
  String get welcomeTitle => 'Únete a la pista';

  @override
  String get withdrawBody =>
      'Avisaremos al jugador invitado de que se ha retirado el desafío.';

  @override
  String get withdrawKeep => 'Mantener desafío';

  @override
  String get withdrawTitle => '¿Deshacer este desafío?';
}
