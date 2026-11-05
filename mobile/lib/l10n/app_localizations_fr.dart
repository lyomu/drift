// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for French (`fr`).
class AppLocalizationsFr extends AppLocalizations {
  AppLocalizationsFr([String locale = 'fr']) : super(locale);

  @override
  String get achievementsCriteria => 'Conditions';

  @override
  String get achievementsEarned => 'Obtenu';

  @override
  String get achievementsLoadFailed => 'Impossible de charger les succès.';

  @override
  String get achievementsLocked => 'Verrouillé';

  @override
  String get achievementsYourBadges => 'Vos badges';

  @override
  String get assessmentGoodProgress => 'Bonne progression';

  @override
  String get assessmentHalfway =>
      'Vous êtes à mi-parcours. Les questions suivantes affinent votre niveau pour que Drift vous propose de meilleurs matchs.';

  @override
  String get assessmentHistory => 'Historique des évaluations';

  @override
  String get assessmentLoadFailed => 'Impossible de charger l’évaluation.';

  @override
  String get assessmentOnlyOne => 'Une seule évaluation pour l’instant';

  @override
  String assessmentQuestionOf(int current, int total) {
    return 'Question $current sur $total';
  }

  @override
  String get assessmentTitle => 'Évaluation tennis';

  @override
  String get authAgePolicy =>
      'Je confirme avoir 18 ans ou plus et j’accepte les Conditions générales et la Politique de confidentialité.';

  @override
  String authAppleFailed(String details) {
    return 'La connexion avec Apple n’a pas pu aboutir. $details';
  }

  @override
  String get authAppleNoToken =>
      'Apple n’a renvoyé aucun jeton d’identité. Veuillez réessayer.';

  @override
  String get authAppleUnavailable =>
      'La connexion avec Apple n’est pas encore disponible sur cet appareil.';

  @override
  String get authBackToLogin => 'Retour à la connexion';

  @override
  String get authCode => 'Code';

  @override
  String get authConfirmNewPassword => 'Confirmer le nouveau mot de passe';

  @override
  String get authContinueApple => 'Continuer avec Apple';

  @override
  String get authContinueGoogle => 'Continuer avec Google';

  @override
  String get authCreateAccount => 'Créer un compte';

  @override
  String get authEmail => 'E-mail';

  @override
  String get authFirstName => 'Prénom';

  @override
  String get authForgotPasswordIntro =>
      'Saisissez l’adresse e-mail de votre compte et nous vous enverrons un code à six chiffres pour définir un nouveau mot de passe.';

  @override
  String get authForgotPasswordLink => 'Mot de passe oublié ?';

  @override
  String get authForgotPasswordTitle => 'Mot de passe oublié';

  @override
  String get authGoogleFailed => 'La connexion avec Google n’a pas pu aboutir.';

  @override
  String get authGoogleNoToken =>
      'Google n’a renvoyé aucun jeton d’identité. L’identifiant client serveur de l’application est manquant.';

  @override
  String get authHaveAccount => 'Vous avez déjà un compte ? ';

  @override
  String get authLastName => 'Nom';

  @override
  String get authLink => 'Associer';

  @override
  String authLinkBody(String email) {
    return '$email possède déjà un compte Drift Tennis. Saisissez son mot de passe une fois pour associer les deux — vous pourrez ensuite utiliser l’un ou l’autre pour vous connecter.';
  }

  @override
  String get authLinkTitle => 'Associer votre compte';

  @override
  String get authLogIn => 'Se connecter';

  @override
  String get authLogin => 'Connexion';

  @override
  String get authNeedAccount => 'Pas encore de compte ? ';

  @override
  String get authNewPassword => 'Nouveau mot de passe';

  @override
  String get authOnWhatsApp => 'Ce numéro est sur WhatsApp';

  @override
  String get authPassword => 'Mot de passe';

  @override
  String get authPasswordRule => 'Utilisez entre 8 et 72 caractères.';

  @override
  String get authPasswordUpdated =>
      'Mot de passe mis à jour. Connectez-vous avec votre nouveau mot de passe.';

  @override
  String get authPasswordsDontMatch =>
      'Les mots de passe ne correspondent pas.';

  @override
  String get authPhone => 'Numéro de téléphone';

  @override
  String get authPhoneOptional => 'Numéro de téléphone (facultatif)';

  @override
  String get authResendCode => 'Renvoyer le code';

  @override
  String authResendCodeIn(int seconds) {
    return 'Renvoyer le code dans $seconds s';
  }

  @override
  String authResendIn(int seconds) {
    return 'Renvoyer dans $seconds s';
  }

  @override
  String authResetPasswordIntro(String email) {
    return 'Si un compte existe pour $email, un code à six chiffres est en route. Saisissez-le ci-dessous avec votre nouveau mot de passe.';
  }

  @override
  String get authResetPasswordTitle => 'Réinitialiser le mot de passe';

  @override
  String get authSearchCountries => 'Rechercher un pays';

  @override
  String authSelectCountry(String country, String code) {
    return 'Choisir le pays, actuellement $country, plus $code';
  }

  @override
  String get authSendCode => 'Envoyer le code';

  @override
  String get authSetNewPassword => 'Définir le mot de passe';

  @override
  String get authSignUp => 'S’inscrire';

  @override
  String get authSixDigitCode => 'Code à six chiffres';

  @override
  String get authVerify => 'Vérifier';

  @override
  String authVerifyIntro(String email) {
    return 'Saisissez le code à 6 chiffres envoyé à $email.';
  }

  @override
  String get authVerifying => 'Vérification…';

  @override
  String get availBookOnline => 'Réservation en ligne';

  @override
  String get availComingSoon => 'Réservation bientôt disponible';

  @override
  String get availContactToBook => 'Contacter pour réserver';

  @override
  String get availUnknown => 'Réservation inconnue';

  @override
  String get blockedLoadFailed =>
      'Impossible de charger les utilisateurs bloqués.';

  @override
  String get blockedNone => 'Vous n’avez bloqué personne.';

  @override
  String get blockedUnblock => 'Débloquer';

  @override
  String get blockedUnblocking => 'Déblocage…';

  @override
  String get clubAnnouncements => 'Annonces';

  @override
  String get clubFeed => 'Fil du club';

  @override
  String get clubFormerMember => 'Ancien membre';

  @override
  String get clubInvited => 'Vous avez été invité dans ce club.';

  @override
  String get clubJoin => 'Rejoindre';

  @override
  String get clubJoinRequestSent => 'Demande d’adhésion envoyée.';

  @override
  String get clubJoinToSeeAnnouncements =>
      'Rejoignez ce club pour voir ses annonces.';

  @override
  String get clubJoinToSeeFeed =>
      'Rejoignez ce club pour voir son fil et y publier.';

  @override
  String get clubLeave => 'Quitter le club';

  @override
  String get clubLoadFailed =>
      'Impossible de charger les clubs. Tirez pour réessayer.';

  @override
  String get clubNoAnnouncements => 'Aucune annonce pour l’instant';

  @override
  String get clubNoCourtsListed => 'Aucun court répertorié';

  @override
  String get clubNoPosts => 'Aucune publication pour l’instant';

  @override
  String get clubNoneNearby => 'Aucun club à proximité pour l’instant';

  @override
  String get clubRequestPending =>
      'Votre demande attend la validation d’un administrateur du club.';

  @override
  String get clubRequestToJoin => 'Demander à rejoindre';

  @override
  String get clubRequested => 'Demandé';

  @override
  String get clubRequesting => 'Envoi de la demande…';

  @override
  String get clubShareHint => 'Partagez quelque chose avec le club';

  @override
  String get clubSuspended => 'Votre adhésion à ce club est suspendue.';

  @override
  String get clubTitle => 'Club';

  @override
  String get clubUnavailable => 'Club indisponible.';

  @override
  String get clubViewCoaches => 'Voir les entraîneurs';

  @override
  String get clubWithdrawRequest => 'Retirer la demande';

  @override
  String get coachContactBook => 'Contacter / Réserver';

  @override
  String get coachContactFailed => 'Impossible d’ouvrir ce moyen de contact.';

  @override
  String coachContactName(String name) {
    return 'Contacter $name';
  }

  @override
  String get coachEmail => 'Écrire à l’entraîneur';

  @override
  String get coachFallbackName => 'Entraîneur';

  @override
  String get coachFilters => 'Filtres entraîneurs';

  @override
  String get coachLoadFailed =>
      'Impossible de charger les entraîneurs. Tirez pour réessayer.';

  @override
  String get coachNoneNearby =>
      'Aucun entraîneur près de chez vous pour l’instant';

  @override
  String get coachOpenBooking => 'Ouvrir la page de réservation';

  @override
  String get coachPlayersCoached => 'Joueurs entraînés';

  @override
  String get coachQualifications => 'Diplômes';

  @override
  String get coachSearchClub => 'Rechercher par nom de club';

  @override
  String get coachSelectedClub => 'Club sélectionné';

  @override
  String get coachSpecialisation => 'Spécialité';

  @override
  String get coachSpecialisationHint => 'ex. service, jeunes, jeu en match';

  @override
  String get coachSpecialisations => 'Spécialités';

  @override
  String get coachTitle => 'Entraîneur';

  @override
  String get coachUnavailable => 'Le profil de l’entraîneur est indisponible.';

  @override
  String get comingSoon => 'Bientôt disponible';

  @override
  String get comingSoonApple =>
      'La connexion avec Apple n’est pas encore prête — nous la configurons. Utilisez Google ou l’e-mail pour l’instant.';

  @override
  String get commonAccept => 'Accepter';

  @override
  String get commonAvailability => 'Disponibilités';

  @override
  String get commonBack => 'Retour';

  @override
  String commonCallNumber(String phone) {
    return 'Appeler le $phone';
  }

  @override
  String get commonCancel => 'Annuler';

  @override
  String get commonCancelling => 'Annulation…';

  @override
  String get commonClose => 'Fermer';

  @override
  String get commonCompleted => 'Terminé';

  @override
  String get commonConfirm => 'Confirmer';

  @override
  String get commonContact => 'Contacter';

  @override
  String get commonContinue => 'Continuer';

  @override
  String commonCourtCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count courts',
      one: '1 court',
    );
    return '$_temp0';
  }

  @override
  String get commonDecline => 'Refuser';

  @override
  String get commonDelete => 'Supprimer';

  @override
  String get commonDistanceUnknown => 'Distance inconnue';

  @override
  String get commonDone => 'Terminé';

  @override
  String get commonErrorGeneric =>
      'Une erreur s’est produite. Veuillez réessayer.';

  @override
  String get commonGoBack => 'Retour';

  @override
  String get commonGotIt => 'Compris';

  @override
  String get commonInProgress => 'En cours';

  @override
  String commonKmAway(String km) {
    return 'à $km km';
  }

  @override
  String commonLevel(String level) {
    return 'Niveau $level';
  }

  @override
  String get commonLoading => 'Chargement…';

  @override
  String get commonNotAvailable => 'Indisponible.';

  @override
  String get commonNotSet => 'Non défini';

  @override
  String get commonNotesOptional => 'Notes (facultatif)';

  @override
  String get commonOpen => 'Ouvert';

  @override
  String get commonOpenAction => 'Ouvrir';

  @override
  String get commonOptionalSuffix => ' (facultatif)';

  @override
  String get commonPlayer => 'Joueur';

  @override
  String commonPlayerCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count joueurs',
      one: '1 joueur',
    );
    return '$_temp0';
  }

  @override
  String get commonRetry => 'Réessayer';

  @override
  String get commonSave => 'Enregistrer';

  @override
  String get commonSaving => 'Enregistrement…';

  @override
  String get commonSearch => 'Rechercher';

  @override
  String get commonSeeAll => 'Tout voir';

  @override
  String get commonSending => 'Envoi…';

  @override
  String get commonSkip => 'Passer';

  @override
  String get commonSubmit => 'Envoyer';

  @override
  String get commonSubmitting => 'Envoi…';

  @override
  String get commonThem => 'Adversaire';

  @override
  String get commonToday => 'Aujourd’hui';

  @override
  String get commonTryAgain => 'Réessayer';

  @override
  String get commonUnknown => 'Inconnu';

  @override
  String get commonUnknownDate => 'Date inconnue';

  @override
  String get commonUnrated => 'Non classé';

  @override
  String get commonUpdating => 'Mise à jour…';

  @override
  String get commonVerified => 'Vérifié';

  @override
  String get commonView => 'Voir';

  @override
  String get commonViewAll => 'Tout voir';

  @override
  String get commonViewDetails => 'Voir les détails';

  @override
  String get commonViewProfile => 'Voir le profil';

  @override
  String get commonVs => 'contre';

  @override
  String get commonWorking => 'En cours…';

  @override
  String get commonYesterday => 'Hier';

  @override
  String get commonYou => 'Vous';

  @override
  String get communityAboutHint =>
      'ex. niveau, courts habituels, déroulé d’une séance';

  @override
  String get communityAboutOptional => 'À propos · Facultatif';

  @override
  String get communityAddPhoto => 'Ajouter une photo';

  @override
  String get communityAddPhotoOptional => 'Ajouter une photo (facultatif)';

  @override
  String get communityApprove => 'Approuver';

  @override
  String communityChallengeRange(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Défi possible jusqu\'à $count échelons au-dessus',
      one: 'Défi possible 1 échelon au-dessus',
    );
    return '$_temp0';
  }

  @override
  String get communityChallengeRangeHint =>
      'Jusqu\'où au-dessus de sa position un joueur peut défier.';

  @override
  String get communityChangePhoto => 'Changer la photo';

  @override
  String communityChatPreview(String name, String message) {
    return '$name : $message';
  }

  @override
  String get communityChatReadOnly =>
      'Cette communauté est suspendue : sa discussion est en lecture seule.';

  @override
  String get communityChatUnavailable =>
      'La discussion s\'ouvre une fois la communauté approuvée.';

  @override
  String get communityCity => 'Ville';

  @override
  String get communityCityHint => 'Nairobi';

  @override
  String get communityCreate => 'Créer';

  @override
  String get communityDecline => 'Refuser';

  @override
  String get communityDelete => 'Supprimer la communauté';

  @override
  String get communityDeleteBody =>
      'La discussion, les échelles et les ligues disparaissent aussi, et chaque membre est informé de sa fermeture. C\'est irréversible.';

  @override
  String get communityDeleted => 'Communauté supprimée';

  @override
  String communityDeleteTitle(String name) {
    return 'Supprimer $name ?';
  }

  @override
  String get communityDetails => 'Informations';

  @override
  String get communityDisputeHint =>
      'Les joueurs ne s\'accordent pas sur le score. Votre décision tranche.';

  @override
  String get communityDisputeKeep => 'Garder le score saisi';

  @override
  String get communityDisputeResolved => 'Litige résolu';

  @override
  String communityDisputes(int count) {
    return 'Résultats contestés ($count)';
  }

  @override
  String get communityDisputeUseDisputed => 'Retenir le score contesté';

  @override
  String communityDisputeVs(String a, String b) {
    return '$a contre $b';
  }

  @override
  String get communityEmptyBody =>
      'Une communauté, c\'est une session régulière avec ses propres membres et sa discussion. Créez-en une et invitez les personnes avec qui vous jouez.';

  @override
  String get communityEmptyTitle => 'Pas encore de communauté';

  @override
  String get communityFilterAnyCity => 'Toutes les villes';

  @override
  String get communityFilterCity => 'Ville';

  @override
  String get communityFilterCityTitle => 'Communautés à…';

  @override
  String get communityFilterNearMe => 'Près de moi';

  @override
  String get communityFormAboutLabel => 'Dites aux joueurs à quoi s’attendre';

  @override
  String get communityFormCityHint => 'ex. Nairobi';

  @override
  String get communityFormCityLabel => 'Dans quelle ville jouez-vous ?';

  @override
  String get communityFormFrequencyLabel =>
      'À quelle fréquence vous retrouvez-vous ?';

  @override
  String get communityFormJoinLabel =>
      'Comment les nouveaux joueurs rejoignent-ils ?';

  @override
  String get communityFormJoinOpen => 'Ouverte à tous';

  @override
  String get communityFormJoinOpenHint =>
      'Les joueurs rejoignent tout de suite, sans validation';

  @override
  String get communityFormJoinRequest => 'Sur validation';

  @override
  String get communityFormJoinRequestHint =>
      'Vous examinez et acceptez chaque joueur';

  @override
  String get communityFormNameLabel => 'Comment s’appelle votre communauté ?';

  @override
  String get communityFormOptional => 'Facultatif';

  @override
  String get communityFrequencyBiweekly => 'Toutes les 2 semaines';

  @override
  String get communityFrequencyMonthly => 'Mensuel';

  @override
  String get communityFrequencyOther => 'Autre';

  @override
  String get communityFrequencyWeekly => 'Hebdo';

  @override
  String get communityHowOften => 'Fréquence';

  @override
  String get communityJoin => 'Rejoindre';

  @override
  String get communityJoinAnyone => 'Tout le monde';

  @override
  String get communityJoinAnyoneHint =>
      'Tout le monde sur Drift Tennis peut rejoindre directement';

  @override
  String get communityJoinByRequest => 'Sur demande';

  @override
  String get communityJoinByRequestHint => 'Vous approuvez chaque demande';

  @override
  String get communityJoined => 'Membre';

  @override
  String communityJoinedToast(String name) {
    return 'Vous avez rejoint $name';
  }

  @override
  String communityJoinRequests(int count) {
    return 'Demandes d\'adhésion ($count)';
  }

  @override
  String get communityLadderCreated =>
      'Échelle créée. Les membres ont été prévenus.';

  @override
  String get communityLadderName => 'Nom de l\'échelle';

  @override
  String communityLadderPlayers(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count joueurs',
      one: '1 joueur',
      zero: 'Aucun joueur pour l\'instant',
    );
    return '$_temp0';
  }

  @override
  String get communityLadders => 'Échelles';

  @override
  String communityLadderYourRung(int position, int total) {
    return 'Vous êtes n°$position sur $total';
  }

  @override
  String get communityLeagueCapacity => 'Nombre max. de joueurs (facultatif)';

  @override
  String get communityLeagueCapacityHint =>
      'Les inscriptions en trop rejoignent une liste d\'attente.';

  @override
  String get communityLeagueCloseBeforeStart =>
      'Les inscriptions doivent fermer au plus tard le jour du début.';

  @override
  String get communityLeagueCreate => 'Créer la ligue';

  @override
  String get communityLeagueCreated =>
      'Ligue créée. Les membres ont été prévenus.';

  @override
  String get communityLeagueDaysBetweenRounds => 'Jours par tour';

  @override
  String get communityLeagueDescription => 'Description (facultatif)';

  @override
  String get communityLeagueName => 'Nom de la ligue';

  @override
  String get communityLeagueOpenBeforeClose =>
      'Les inscriptions doivent ouvrir avant de fermer.';

  @override
  String get communityLeagueRegistrationCloses => 'Clôture des inscriptions';

  @override
  String get communityLeagueRegistrationOpens => 'Ouverture des inscriptions';

  @override
  String get communityLeagueRounds => 'Tours';

  @override
  String get communityLeagues => 'Ligues';

  @override
  String get communityLeagueStarts => 'Début de la ligue';

  @override
  String get communityLeave => 'Quitter la communauté';

  @override
  String get communityLeaveBody =>
      'Vous quitterez sa discussion et ne recevrez plus ses notifications. Vous pourrez redemander à la rejoindre plus tard.';

  @override
  String get communityLeaveLastOwner =>
      'Vous êtes le seul membre : partir ferme définitivement la communauté.';

  @override
  String communityLeaveTitle(String name) {
    return 'Quitter $name ?';
  }

  @override
  String get communityLeft => 'Vous avez quitté la communauté.';

  @override
  String get communityLoadCompetitionsFailed =>
      'Impossible de charger les compétitions.';

  @override
  String get communityLoadFailed => 'Impossible de charger les communautés.';

  @override
  String get communityLoadMembersFailed => 'Impossible de charger les membres.';

  @override
  String get communityLoadOneFailed =>
      'Impossible de charger cette communauté.';

  @override
  String get communityMakeAdmin => 'Nommer admin';

  @override
  String get communityMakeOwner => 'Nommer propriétaire';

  @override
  String get communityManage => 'Gérer la communauté';

  @override
  String communityMemberCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count membres',
      one: '1 membre',
    );
    return '$_temp0';
  }

  @override
  String communityMembersCount(int count) {
    return 'Membres ($count)';
  }

  @override
  String get communityMute => 'Couper les notifications de discussion';

  @override
  String get communityMuteHint =>
      'Les approbations et nouvelles compétitions vous parviennent toujours.';

  @override
  String get communityName => 'Nom';

  @override
  String get communityNameHint => 'ex. Double du mardi soir';

  @override
  String get communityNearYou => 'Communautés près de vous';

  @override
  String get communityNewLadder => 'Nouvelle échelle';

  @override
  String get communityNewLeague => 'Nouvelle ligue';

  @override
  String get communityNoAbout => 'Pas encore de description.';

  @override
  String get communityNoCompetitions => 'Pas encore d\'échelle ni de ligue.';

  @override
  String get communityNoCompetitionsManager =>
      'Pas encore d\'échelle ni de ligue. Créez-en une pour vos membres.';

  @override
  String get communityNoneMatch =>
      'Aucune communauté ne correspond. Essayez un autre filtre ou créez-en une.';

  @override
  String get communityNoneNearby =>
      'Pas encore de communauté près de vous. Créez-en une et invitez les personnes avec qui vous jouez.';

  @override
  String get communityNotApprovedBody =>
      'Drift n\'a pas approuvé cette communauté. Contactez le support si vous pensez que c\'est une erreur.';

  @override
  String get communityOwnerZone => 'Propriétaire';

  @override
  String get communityPhotoChosen => 'Photo ajoutée';

  @override
  String get communityRemove => 'Retirer de la communauté';

  @override
  String get communityRemoveAdmin => 'Retirer le rôle d\'admin';

  @override
  String get communityRemoveBody =>
      'Cette personne quittera la discussion et sera informée de son retrait. Elle pourra redemander à rejoindre.';

  @override
  String communityRemoveTitle(String name) {
    return 'Retirer $name ?';
  }

  @override
  String get communityReport => 'Signaler la communauté';

  @override
  String get communityReportAlsoLeave => 'Quitter aussi cette communauté';

  @override
  String get communityReportBody =>
      'L\'équipe Drift l\'examinera. La communauté ne saura pas qui l\'a signalée.';

  @override
  String get communityReported => 'Merci — Drift va examiner cette communauté.';

  @override
  String get communityReportedAndLeft =>
      'Signalée, et vous avez quitté la communauté.';

  @override
  String communityReportTitle(String name) {
    return 'Signaler $name';
  }

  @override
  String get communityRequested => 'Demandée';

  @override
  String get communityRequestedCancel => 'Demandée · Annuler la demande';

  @override
  String get communityRequestSent =>
      'Demande envoyée. Vous recevrez une notification dès qu\'elle sera traitée.';

  @override
  String get communityRequestToJoin => 'Demander à rejoindre';

  @override
  String get communityResults => 'Résultats';

  @override
  String get communityReviewNote =>
      'Drift examine chaque nouvelle communauté avant que d\'autres puissent la trouver. Nous vous préviendrons dès qu\'elle sera en ligne.';

  @override
  String get communityRoleAdmin => 'Admin';

  @override
  String get communityRoleMember => 'Membre';

  @override
  String get communityRoleOwner => 'Propriétaire';

  @override
  String communityRunBy(String club) {
    return 'Gérée par $club';
  }

  @override
  String get communitySave => 'Enregistrer';

  @override
  String get communitySaved => 'Enregistré';

  @override
  String get communitySearchHint => 'Rechercher des communautés';

  @override
  String get communityStart => 'Créer une communauté';

  @override
  String get communityStatusNotApproved => 'Non approuvée';

  @override
  String get communityStatusSuspended => 'Suspendue';

  @override
  String get communityStatusUnderReview => 'En cours d\'examen';

  @override
  String get communitySubmitted => 'Envoyée pour examen';

  @override
  String get communitySuspendedBody =>
      'Drift a suspendu cette communauté. La discussion est en lecture seule et personne ne peut la rejoindre pendant l\'examen.';

  @override
  String get communityTabAbout => 'À propos';

  @override
  String get communityTabChat => 'Discussion';

  @override
  String get communityTabCompetitions => 'Compétitions';

  @override
  String get communityTabMembers => 'Membres';

  @override
  String get communityTransfer => 'Transférer';

  @override
  String get communityTransferBody =>
      'Cette personne pourra tout gérer, y compris supprimer la communauté. Vous restez administrateur.';

  @override
  String communityTransferred(String name) {
    return '$name est maintenant propriétaire de la communauté';
  }

  @override
  String communityTransferTitle(String name) {
    return 'Nommer $name propriétaire ?';
  }

  @override
  String get communityTypeClub => 'Club';

  @override
  String get communityTypeClubHint => 'Les membres d\'un club';

  @override
  String get communityTypeLadder => 'Échelle';

  @override
  String get communityTypeLadderHint =>
      'Défis classés en continu entre membres';

  @override
  String get communityTypeSocial => 'Loisir';

  @override
  String get communityTypeSocialHint =>
      'Échanges détendus et rendez-vous réguliers';

  @override
  String get communityTypeTraining => 'Entraînement';

  @override
  String get communityTypeTrainingHint =>
      'Stages, exercices et séances encadrées';

  @override
  String get communityUnderReviewBody =>
      'Drift examine votre communauté. Personne d\'autre ne peut la trouver ni la rejoindre avant son approbation — vous recevrez une notification.';

  @override
  String get communityUnmute => 'Réactiver les notifications de discussion';

  @override
  String get communityWhatItIs => 'Quel type de communauté est-ce ?';

  @override
  String get communityWhoCanJoin => 'Qui peut rejoindre';

  @override
  String get communityYourCommunities => 'Vos communautés';

  @override
  String get competeBye => 'Exempt';

  @override
  String competeByeFixture(String name) {
    return '$name — exempt';
  }

  @override
  String get competeByeThisRound => 'Exempt ce tour-ci';

  @override
  String get competeCurrentRound => 'Tour en cours';

  @override
  String competeDeadline(String date) {
    return 'Date limite : $date';
  }

  @override
  String get competeEnter => 'Participer';

  @override
  String get competeEvents => 'Événements';

  @override
  String get competeFinal => 'Finale';

  @override
  String get competeFull => 'Complet';

  @override
  String get competeJoinTournament => 'Participer au tournoi';

  @override
  String get competeJoinWaitlist => 'Rejoindre la liste d’attente';

  @override
  String get competeJoinWaitlistBody =>
      'Vous serez ajouté à la liste d’attente et inscrit automatiquement si une place se libère.';

  @override
  String get competeJoinWaitlistQ => 'Rejoindre la liste d’attente ?';

  @override
  String get competeLadder => 'Classement';

  @override
  String get competeLadderUnavailable => 'Classement indisponible.';

  @override
  String get competeLadders => 'Classements';

  @override
  String get competeLeague => 'Ligue';

  @override
  String get competeLeagueUnavailable => 'Ligue indisponible.';

  @override
  String get competeLeagues => 'Ligues';

  @override
  String get competeLeaveWaitlist => 'Quitter la liste d’attente';

  @override
  String get competeLoadLaddersFailed =>
      'Impossible de charger les classements.';

  @override
  String get competeLoadLeaguesFailed =>
      'Impossible de charger les ligues. Veuillez réessayer.';

  @override
  String get competeLoadMyLeaguesFailed => 'Impossible de charger vos ligues.';

  @override
  String get competeLoadPlayersFailed => 'Impossible de charger les joueurs.';

  @override
  String get competeLoadStandingsFailed =>
      'Impossible de charger le classement.';

  @override
  String get competeLoadTournamentsFailed =>
      'Impossible de charger les tournois.';

  @override
  String get competeMyLeagues => 'Mes ligues';

  @override
  String get competeNoLadders =>
      'Aucun classement pour l’instant. Demandez à votre club d’en créer un.';

  @override
  String get competeNoLeagues =>
      'Aucune ligue près de chez vous pour l’instant — élargissez votre recherche';

  @override
  String get competeNoMyLeagues => 'Vous n’avez encore rejoint aucune ligue';

  @override
  String get competeNoRegistrations => 'Personne ne s’est encore inscrit.';

  @override
  String get competeNoRules =>
      'Aucun règlement n’a encore été publié pour cette ligue.';

  @override
  String get competeNoTournaments =>
      'Aucun tournoi pour l’instant. Demandez à votre club d’en organiser un.';

  @override
  String get competeOnWaitlist => 'Sur liste d’attente';

  @override
  String get competeRegister => 'S’inscrire';

  @override
  String get competeRegisterBody =>
      'Vous serez opposé aux autres inscrits dès le début de la ligue.';

  @override
  String get competeRegisterQ => 'S’inscrire à cette ligue ?';

  @override
  String get competeRegisteredPlayers => 'Joueurs inscrits';

  @override
  String get competeRegistrationClosed =>
      'Les inscriptions sont closes pour cette ligue.';

  @override
  String get competeRegistrationOpensSoon =>
      'Les inscriptions ouvrent bientôt.';

  @override
  String get competeRound => 'Tour';

  @override
  String competeRoundNumber(int number) {
    return 'Tour $number';
  }

  @override
  String get competeRoundUnavailable => 'Tour indisponible.';

  @override
  String get competeRules => 'Règlement';

  @override
  String get competeRulesUnavailable => 'Règlement indisponible.';

  @override
  String get competeScoringFormat => 'Format de score';

  @override
  String get competeSemiFinals => 'Demi-finales';

  @override
  String competeSpotsLeft(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count places restantes',
      one: '1 place restante',
    );
    return '$_temp0';
  }

  @override
  String get competeStandings => 'Classement';

  @override
  String get competeStandingsEmpty =>
      'Le classement apparaît après le premier tour.';

  @override
  String get competeTournament => 'Tournoi';

  @override
  String get competeTournamentUnavailable => 'Tournoi indisponible.';

  @override
  String get competeTournaments => 'Tournois';

  @override
  String get competeUnfinishedMatches => 'Matchs inachevés';

  @override
  String competeVsFixture(String a, String b) {
    return '$a contre $b';
  }

  @override
  String get competeWaitlist => 'Liste d’attente';

  @override
  String get competeWaitlistBody =>
      'Nous vous inscrirons automatiquement si une place se libère.';

  @override
  String get competeWalkovers => 'Forfaits';

  @override
  String get competeWithdraw => 'Se retirer';

  @override
  String get competeWithdrawBody =>
      'Vous pourrez vous réinscrire plus tard tant que les inscriptions sont ouvertes.';

  @override
  String get competeWithdrawQ => 'Se retirer de cette ligue ?';

  @override
  String get competeYoureRegistered => 'Vous êtes inscrit';

  @override
  String get connectionsCancelRequest => 'Annuler la demande';

  @override
  String get connectionsEmpty =>
      'Connectez-vous avec des joueurs pour développer votre réseau tennis';

  @override
  String get connectionsIncoming => 'Reçues';

  @override
  String get connectionsLoadRequestsFailed =>
      'Impossible de charger vos demandes.';

  @override
  String get connectionsNoPending => 'Aucune demande en attente';

  @override
  String get connectionsPending => 'Demandes en attente';

  @override
  String get connectionsRequests => 'Demandes';

  @override
  String get connectionsSent => 'Envoyées';

  @override
  String get connectionsTitle => 'Connexions';

  @override
  String get courtAccess => 'Accès';

  @override
  String get courtAddress => 'Adresse';

  @override
  String get courtAmenities => 'Équipements';

  @override
  String get courtBookOnline => 'Réserver en ligne';

  @override
  String get courtBookingOptions => 'Options de réservation';

  @override
  String get courtBookingOptionsLower => 'Options de réservation';

  @override
  String get courtDetails => 'Détails';

  @override
  String get courtGetDirections => 'Itinéraire';

  @override
  String get courtHours => 'Horaires';

  @override
  String get courtIndoor => 'Intérieur';

  @override
  String get courtIndoorSuffix => ' (intérieur)';

  @override
  String get courtList => 'Liste';

  @override
  String get courtLitSuffix => ' · éclairé';

  @override
  String get courtLoadFailed =>
      'Impossible de charger les courts. Tirez pour réessayer.';

  @override
  String get courtLocationUnknown => 'Emplacement inconnu';

  @override
  String get courtMap => 'Carte';

  @override
  String get courtMapUnavailable =>
      'Carte indisponible — passez en vue Liste pour parcourir les résultats.';

  @override
  String get courtNativeBookingUnavailable =>
      'La réservation dans l’app n’est pas encore disponible pour ce court.';

  @override
  String get courtNoBookingInfo =>
      'Aucune information de réservation — contactez directement';

  @override
  String get courtNoPhotos => 'Aucune photo pour l’instant';

  @override
  String get courtNoneFound => 'Aucun court trouvé';

  @override
  String get courtNoneInArea => 'Aucun court trouvé dans cette zone';

  @override
  String get courtOutdoor => 'Extérieur';

  @override
  String get courtPhone => 'Téléphone';

  @override
  String get courtPhotos => 'Photos';

  @override
  String get courtPrivate => 'Privé';

  @override
  String get courtPublic => 'Public';

  @override
  String get courtAddFavorite => 'Ajouter aux favoris';

  @override
  String get courtBookACourt => 'Réserver un terrain';

  @override
  String get courtBookingEyebrow => 'Réservation';

  @override
  String get courtClosedNow => 'Fermé';

  @override
  String courtCourtCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count terrains',
      one: '1 terrain',
    );
    return '$_temp0';
  }

  @override
  String courtCourtsOfSurface(int count, String surface) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count terrains $surface',
      one: '1 terrain $surface',
    );
    return '$_temp0';
  }

  @override
  String get courtFavoriteFailed =>
      'Impossible de mettre à jour les favoris. Réessayez.';

  @override
  String get courtFindTheCourt => 'Trouver le terrain';

  @override
  String get courtGoodToKnow => 'Bon à savoir';

  @override
  String get courtInfoVerifiedFooter =>
      'Informations du lieu vérifiées par Drift';

  @override
  String get courtLocationEyebrow => 'Emplacement';

  @override
  String get courtOpenNow => 'Ouvert';

  @override
  String courtPhotoCount(int index, int total) {
    return '$index / $total';
  }

  @override
  String get courtRemoveFavorite => 'Retirer des favoris';

  @override
  String get courtReportIssue => 'Signaler ou corriger les infos';

  @override
  String get courtShare => 'Partager le terrain';

  @override
  String courtShareText(String name, String address) {
    return '$name — $address';
  }

  @override
  String get courtSurface => 'Surface';

  @override
  String get courtVerifiedVenue => 'Lieu vérifié';

  @override
  String get courtUnavailable => 'Court indisponible.';

  @override
  String get courtUnverified => 'Non vérifié';

  @override
  String get courtVerificationPending => 'Vérification en cours';

  @override
  String get courtViewPhotos => 'Voir les photos';

  @override
  String get courtVisitWebsite => 'Visiter le site';

  @override
  String get courtWebsite => 'Site web';

  @override
  String get courtWhatsApp => 'Écrire sur WhatsApp';

  @override
  String get deleteBody =>
      'Vous serez immédiatement déconnecté sur tous vos appareils et les autres joueurs ne pourront plus vous trouver ni vous contacter.\n\nVos données personnelles seront ensuite définitivement effacées au bout de 30 jours. D’ici là, contactez l’assistance si vous changez d’avis — passé ce délai, c’est irréversible.\n\nLes matchs que vous avez joués restent enregistrés pour les autres joueurs concernés, mais ne seront plus associés à vous.';

  @override
  String get deleteButton => 'Supprimer mon compte';

  @override
  String get deleteConfirm => 'J’ai compris, supprimer mon compte';

  @override
  String get deleteDeleting => 'Suppression…';

  @override
  String get deleteTitle => 'Votre compte va être supprimé';

  @override
  String get discoverClubs => 'Clubs';

  @override
  String get discoverCoaches => 'Entraîneurs';

  @override
  String get discoverCourts => 'Courts';

  @override
  String get discoverFindPlayers => 'Trouver des joueurs';

  @override
  String get drawerSigningOut => 'Déconnexion…';

  @override
  String get drawerViewProfile => 'Voir votre profil';

  @override
  String get eventsComingSoon => 'Événements bientôt disponibles';

  @override
  String get eventsComingSoonBody =>
      'Les soirées, stages et rencontres de votre club apparaîtront ici dès qu’il en organisera.';

  @override
  String get exp1to2y => '1 à 2 ans';

  @override
  String get exp1to2ySub => 'Je construis des bases solides';

  @override
  String get exp2to5y => '2 à 5 ans';

  @override
  String get exp2to5ySub => 'Je développe un vrai sens du jeu';

  @override
  String get exp5plus => 'Plus de 5 ans';

  @override
  String get exp5plusSub => 'Expérimenté et régulier';

  @override
  String get exp6to12m => '6 à 12 mois';

  @override
  String get exp6to12mSub => 'Je prends mes marques sur le court';

  @override
  String get expAdvanced => 'Compétition / Confirmé';

  @override
  String get expAdvancedSub => 'Niveau tournoi';

  @override
  String get expNew => 'Je débute complètement';

  @override
  String get expNewSub => 'Jamais tenu de raquette';

  @override
  String get expUnder6m => 'Moins de 6 mois';

  @override
  String get expUnder6mSub => 'J’apprends encore les bases';

  @override
  String get filterAny => 'Toutes';

  @override
  String get filterApply => 'Appliquer les filtres';

  @override
  String filterApplyCount(int count) {
    return 'Appliquer les filtres ($count)';
  }

  @override
  String get filterDistance => 'Distance';

  @override
  String get filterFeatures => 'Équipements';

  @override
  String get filterFloodlit => 'Éclairé';

  @override
  String get filterHasBooking => 'Infos de réservation';

  @override
  String get filterIndoorOutdoor => 'Intérieur / Extérieur';

  @override
  String get filterLevel => 'Niveau';

  @override
  String get filterSurface => 'Surface';

  @override
  String get filterTitle => 'Filtres';

  @override
  String get formLoss => 'D';

  @override
  String get formNoMatches => 'Aucun match joué pour l’instant';

  @override
  String get formWin => 'V';

  @override
  String get goalAchieved => 'Atteint';

  @override
  String get goalBaseline => 'Point de départ';

  @override
  String get goalBehind => 'En retard';

  @override
  String get goalCoaching => 'Trouver un entraîneur';

  @override
  String get goalCompete => 'Participer à des ligues/tournois';

  @override
  String get goalDeadline => 'Échéance';

  @override
  String get goalDeleteQ => 'Supprimer cet objectif ?';

  @override
  String get goalEmpty => 'Fixez votre premier objectif de progression';

  @override
  String get goalGetFit => 'Être en meilleure forme';

  @override
  String get goalHaveFun => 'Simplement m’amuser';

  @override
  String get goalImproveSkills => 'Améliorer mon jeu';

  @override
  String get goalLoadFailed => 'Impossible de charger les objectifs.';

  @override
  String get goalMeetPeople => 'Rencontrer de nouveaux joueurs';

  @override
  String get goalMilestones => 'Étapes';

  @override
  String get goalOnTrack => 'En bonne voie';

  @override
  String get goalPlayMore => 'Jouer plus souvent';

  @override
  String get goalTarget => 'Cible';

  @override
  String goalTargetOutOf6(String value) {
    return 'Cible $value/6';
  }

  @override
  String get goalTitle => 'Objectif';

  @override
  String get goalTrackProgress => 'Suivre ma progression';

  @override
  String get goalCreateAddCustomMilestone => 'Ajouter une étape personnalisée';

  @override
  String get goalCreateAddDeadline => 'Ajouter une échéance';

  @override
  String get goalCreateChange => 'Changer';

  @override
  String get goalCreateChooseDate => 'Choisir une date';

  @override
  String get goalCreateCurrentRating => 'Niveau actuel';

  @override
  String get goalCreateCustomDate => 'Date personnalisée';

  @override
  String get goalCreateEdit => 'Modifier';

  @override
  String get goalCreateErrorCustomDate =>
      'Choisissez une date ou sélectionnez « Sans échéance ».';

  @override
  String get goalCreateErrorTargetHigher =>
      'Choisissez une cible supérieure à votre niveau actuel.';

  @override
  String get goalCreateFocusHeading => 'Que voulez-vous améliorer ?';

  @override
  String get goalCreateFocusSub => 'Choisissez un axe ou restez général.';

  @override
  String goalCreateFocusValue(String focus) {
    return 'Axe : $focus';
  }

  @override
  String goalCreateImprovement(String value) {
    return '+$value de progression';
  }

  @override
  String get goalCreateMilestoneHint => 'ex. Travailler le placement croisé';

  @override
  String goalCreateMilestonesAdded(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count étapes ajoutées',
      one: '1 étape ajoutée',
      zero: 'Aucune étape ajoutée',
    );
    return '$_temp0';
  }

  @override
  String get goalCreateMilestonesHeading => 'Découpez-le en étapes';

  @override
  String get goalCreateMilestonesSub =>
      'Facultatif · De petites victoires aident à garder le cap.';

  @override
  String get goalCreateNoDeadline => 'Sans échéance';

  @override
  String get goalCreateNone => 'Aucune';

  @override
  String get goalCreateOptionalLater => 'Facultatif · Modifiable plus tard.';

  @override
  String get goalCreateRatingInfoBody =>
      'Les niveaux Drift vont de 0 à 6. Votre niveau actuel part de votre dernière évaluation et de vos entraînements. Ajustez-le s’il ne vous semble pas juste.';

  @override
  String get goalCreateRatingInfoTitle => 'À propos des niveaux Drift';

  @override
  String get goalCreateRemoveMilestone => 'Supprimer l’étape';

  @override
  String get goalCreateSelectedSkill => 'Compétence choisie';

  @override
  String get goalCreateSetTarget => 'Choisissez votre cible';

  @override
  String get goalCreateSkillHeading => 'Choisissez une compétence';

  @override
  String get goalCreateSkillSub => 'Sélectionnez une compétence à développer.';

  @override
  String get goalCreateStep1Subtitle =>
      'Quelle partie de votre jeu voulez-vous améliorer ?';

  @override
  String get goalCreateStep1Title => 'Créer un objectif';

  @override
  String get goalCreateStep2Subtitle =>
      'Choisissez le résultat que vous visez.';

  @override
  String get goalCreateStep2Title => 'Choisissez votre axe';

  @override
  String get goalCreateStep3Subtitle =>
      'Fixez une cible motivante et un plan pour l’atteindre.';

  @override
  String get goalCreateStep3Title => 'Construisez votre objectif';

  @override
  String goalCreateStepOf(int step, int total) {
    return 'Étape $step sur $total';
  }

  @override
  String get goalCreateSubmit => 'Créer l’objectif';

  @override
  String get goalCreateSummaryFocus => 'Axe';

  @override
  String get goalCreateSummaryHeading => 'Récapitulatif';

  @override
  String get goalCreateSummaryRating => 'Niveau';

  @override
  String get goalCreateSummarySub => 'Vérifiez votre plan avant de le créer.';

  @override
  String get goalCreateTargetDate => 'Date cible';

  @override
  String get goalCreateTargetDisclaimer =>
      'Votre cible est le niveau que vous visez, pas une mesure automatique de vos performances.';

  @override
  String get goalCreateTargetHeading => 'Fixez votre objectif de progression';

  @override
  String get goalCreateTargetMustBeHigher => 'La cible doit être plus haute';

  @override
  String get goalCreateTargetRating => 'Niveau visé';

  @override
  String get goalCreateTargetSub => 'Déplacez les curseurs par pas de 0,5.';

  @override
  String get goalCreateTimeline => 'Échéance';

  @override
  String get goalCreateTimelineHeading => 'Quand voulez-vous l’atteindre ?';

  @override
  String goalCreateWeeks(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count semaines',
      one: '1 semaine',
    );
    return '$_temp0';
  }

  @override
  String get goalCreateYourGoal => 'Votre objectif';

  @override
  String get goalCreatedAnother => 'Créer un autre objectif';

  @override
  String goalCreatedBody(String skill) {
    return 'Votre objectif $skill est fixé. Chaque séance ciblée vous en rapproche.';
  }

  @override
  String get goalCreatedEyebrow => 'Objectif créé';

  @override
  String get goalCreatedOpen => 'Ouverte';

  @override
  String get goalCreatedStart => 'Départ';

  @override
  String get goalCreatedTitle => 'Prêt à progresser.';

  @override
  String get goalCreatedView => 'Voir l’objectif';

  @override
  String get goalFocusAccuracy => 'Précision';

  @override
  String get goalFocusAgility => 'Agilité';

  @override
  String get goalFocusApproach => 'Montée au filet';

  @override
  String get goalFocusBalance => 'Équilibre';

  @override
  String get goalFocusClosing => 'Conclure';

  @override
  String get goalFocusComposure => 'Sang-froid';

  @override
  String get goalFocusConsistency => 'Régularité';

  @override
  String get goalFocusDepth => 'Profondeur';

  @override
  String get goalFocusDescBackhandAccuracy => 'Diriger la balle avec contrôle';

  @override
  String get goalFocusDescBackhandConsistency => 'Construire un revers fiable';

  @override
  String get goalFocusDescBackhandPower => 'Gagner en vitesse et en profondeur';

  @override
  String get goalFocusDescBackhandTechnique =>
      'Améliorer la mécanique de frappe';

  @override
  String get goalFocusDescFootworkAgility =>
      'Changer de direction efficacement';

  @override
  String get goalFocusDescFootworkBalance => 'Rester contrôlé en mouvement';

  @override
  String get goalFocusDescFootworkPreparation =>
      'Se placer plus tôt pour chaque frappe';

  @override
  String get goalFocusDescFootworkRecovery => 'Se replacer après chaque frappe';

  @override
  String get goalFocusDescForehandAccuracy => 'Mieux placer vos frappes';

  @override
  String get goalFocusDescForehandConsistency => 'Garder plus de balles en jeu';

  @override
  String get goalFocusDescForehandPower =>
      'Développer des frappes plus puissantes';

  @override
  String get goalFocusDescForehandTechnique => 'Affiner la mécanique du geste';

  @override
  String get goalFocusDescGeneral =>
      'Travailler la compétence dans son ensemble';

  @override
  String get goalFocusDescMatchPlayClosing =>
      'Conclure les sets avec confiance';

  @override
  String get goalFocusDescMatchPlayComposure => 'Rester lucide sous pression';

  @override
  String get goalFocusDescMatchPlayConsistency => 'Réduire les fautes directes';

  @override
  String get goalFocusDescMatchPlayStrategy =>
      'Construire des points plus intelligents';

  @override
  String get goalFocusDescMovementBalance => 'Rester stable sur chaque frappe';

  @override
  String get goalFocusDescMovementEndurance => 'Bien bouger plus longtemps';

  @override
  String get goalFocusDescMovementRecovery => 'Se replacer plus vite';

  @override
  String get goalFocusDescMovementSpeed => 'Arriver plus tôt sur la balle';

  @override
  String get goalFocusDescNetPlayApproach => 'Monter au filet efficacement';

  @override
  String get goalFocusDescNetPlayPositioning => 'Occuper le bon espace';

  @override
  String get goalFocusDescNetPlayTouch => 'Améliorer le toucher et le contrôle';

  @override
  String get goalFocusDescNetPlayVolleys => 'Gagner en confiance à la volée';

  @override
  String get goalFocusDescReturnConsistency =>
      'Remettre plus de retours en jeu';

  @override
  String get goalFocusDescReturnDepth => 'Garder des retours profonds';

  @override
  String get goalFocusDescReturnPositioning =>
      'Trouver une meilleure position de retour';

  @override
  String get goalFocusDescReturnReaction => 'Lire et réagir plus tôt';

  @override
  String get goalFocusDescServeConsistency =>
      'Augmenter votre pourcentage de premières balles';

  @override
  String get goalFocusDescServePlacement => 'Toucher vos cibles au service';

  @override
  String get goalFocusDescServePower => 'Générer plus de vitesse de raquette';

  @override
  String get goalFocusDescServeTechnique => 'Améliorer le geste et le rythme';

  @override
  String get goalFocusEndurance => 'Endurance';

  @override
  String get goalFocusGeneral => 'Progression générale';

  @override
  String get goalFocusPlacement => 'Placement';

  @override
  String get goalFocusPositioning => 'Positionnement';

  @override
  String get goalFocusPower => 'Puissance';

  @override
  String get goalFocusPreparation => 'Préparation';

  @override
  String get goalFocusReaction => 'Réaction';

  @override
  String get goalFocusRecovery => 'Replacement';

  @override
  String get goalFocusSpeed => 'Vitesse';

  @override
  String get goalFocusStrategy => 'Stratégie';

  @override
  String get goalFocusTechnique => 'Technique';

  @override
  String get goalFocusTouch => 'Toucher';

  @override
  String get goalFocusVolleys => 'Volées';

  @override
  String get goalMilestoneDrillBackhand => 'Tenir un échange de 10 revers';

  @override
  String get goalMilestoneDrillFootwork =>
      'Terminer un circuit complet de jeu de jambes à vide';

  @override
  String get goalMilestoneDrillForehand =>
      'Tenir un échange de 10 coups droits';

  @override
  String get goalMilestoneDrillMatchPlay =>
      'Appliquer votre axe dans un match complet';

  @override
  String get goalMilestoneDrillMovement =>
      'Terminer un exercice de déplacement sur tout le court avec contrôle';

  @override
  String get goalMilestoneDrillNetPlay =>
      'Tenir un échange de 10 volées au filet';

  @override
  String get goalMilestoneDrillReturn =>
      'Remettre 8 services sur 10 à l’entraînement';

  @override
  String get goalMilestoneDrillServe =>
      'Passer 7 premières balles sur 10 dans la zone cible';

  @override
  String goalMilestoneReachTarget(String skill) {
    return 'Atteindre votre niveau cible en $skill';
  }

  @override
  String get goalMilestoneSessionsBackhand =>
      'Faire trois séances axées sur le revers';

  @override
  String get goalMilestoneSessionsFootwork =>
      'Faire trois séances axées sur le jeu de jambes';

  @override
  String get goalMilestoneSessionsForehand =>
      'Faire trois séances axées sur le coup droit';

  @override
  String get goalMilestoneSessionsMatchPlay =>
      'Jouer trois sets d’entraînement ciblés';

  @override
  String get goalMilestoneSessionsMovement =>
      'Faire trois séances axées sur le déplacement';

  @override
  String get goalMilestoneSessionsNetPlay =>
      'Faire trois séances de jeu au filet';

  @override
  String get goalMilestoneSessionsReturn =>
      'Faire trois séances axées sur le retour';

  @override
  String get goalMilestoneSessionsServe =>
      'Faire trois séances axées sur le service';

  @override
  String get goalUnavailable => 'Objectif indisponible.';

  @override
  String get handLeftHanded => 'Gaucher';

  @override
  String get handRightHanded => 'Droitier';

  @override
  String get helpBody =>
      'Consultez la FAQ de Drift Tennis. Elle s’ouvre avec les mêmes réponses que sur notre site.';

  @override
  String get helpOpenFailed => 'Impossible d’ouvrir la FAQ pour le moment.';

  @override
  String get helpOpenFaqs => 'Ouvrir la FAQ';

  @override
  String get helpTitle => 'Vos questions, nos réponses.';

  @override
  String get homeBook => 'Réserver';

  @override
  String get homeBrowse => 'Parcourir';

  @override
  String get homeCourtsNearYou => 'Courts près de chez vous';

  @override
  String get homeFindAMatch => 'Trouver un match';

  @override
  String get homeFindMore => 'En trouver plus';

  @override
  String homeGreeting(String name) {
    return 'Bonjour, $name';
  }

  @override
  String get homeLoadFailed =>
      'Impossible de charger votre fil d’accueil. Veuillez réessayer.';

  @override
  String get homeMapView => 'Vue carte';

  @override
  String get homeNeedsYou => 'À traiter';

  @override
  String get homeNextMatch => 'Prochain match';

  @override
  String get homeNextPrefix => 'Prochain : ';

  @override
  String get homeNoCourts => 'Aucun court à proximité pour l’instant.';

  @override
  String get homeNoMatches => 'Aucun match prévu pour l’instant.';

  @override
  String get homeNoPlayers => 'Aucun joueur à proximité pour l’instant.';

  @override
  String get homePlayersNearYou => 'Joueurs près de chez vous';

  @override
  String get homeProgressEmpty =>
      'Jouez des matchs et notez vos entraînements pour débloquer des succès.';

  @override
  String homeProgressTo(String level) {
    return 'Progression vers $level';
  }

  @override
  String get homeQuickActions => 'Actions rapides';

  @override
  String get homeRating => 'Classement';

  @override
  String get homeReview => 'Examiner';

  @override
  String get homeStatDoubles => 'DOUBLE';

  @override
  String get homeStatLevel => 'NIVEAU';

  @override
  String get homeStatSingles => 'SIMPLE';

  @override
  String get homeTennisNews => 'Actualités tennis';

  @override
  String get homeWelcomeBack => 'Bon retour';

  @override
  String get homeYourProgress => 'Votre progression';

  @override
  String get introGetStarted => 'Commencer';

  @override
  String get introSlide1Body =>
      'Suivez chaque match, chaque résultat et chaque tournoi au rythme de votre communauté tennis.';

  @override
  String get introSlide1Title => 'Le jeu\nne s’arrête jamais';

  @override
  String get introSlide2Body =>
      'Suivez vos progrès, affinez votre technique et prenez de bonnes habitudes grâce à des analyses pensées pour votre parcours.';

  @override
  String get introSlide2Title => 'Faites progresser\nvotre jeu';

  @override
  String get introSlide3Body =>
      'Découvrez des joueurs, des clubs et des compétitions près de chez vous, puis entrez sur le court en confiance.';

  @override
  String get introSlide3Title => 'Commencez votre\naventure tennis';

  @override
  String get leagueJoined => 'Inscrit';

  @override
  String leagueMemberCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count membres',
      one: '1 membre',
    );
    return '$_temp0';
  }

  @override
  String leagueMembersOfCapacity(int count, int capacity) {
    return '$count/$capacity membres';
  }

  @override
  String get leagueWaitlisted => 'En attente';

  @override
  String get learnBrowseBySkill => 'Parcourir par compétence';

  @override
  String get learnContentLoadFailed => 'Impossible de charger le contenu.';

  @override
  String get learnContentUnavailable => 'Contenu indisponible.';

  @override
  String get learnFeaturedLessons => 'Leçons à la une';

  @override
  String get learnGoals => 'Objectifs';

  @override
  String get learnGoalsSub => 'Fixez et suivez vos cibles';

  @override
  String get learnLessonsFailed =>
      'Impossible de charger les leçons. Tirez vers le bas pour réessayer.';

  @override
  String get learnLessonsComingSoon => 'Leçons bientôt disponibles';

  @override
  String get learnLessonsComingSoonBody =>
      'Nous préparons des leçons et des exercices. Revenez bientôt.';

  @override
  String get learnLogDrill => 'Noter cet exercice dans l’entraînement';

  @override
  String get learnMarkComplete => 'Marquer comme terminé';

  @override
  String get learnMarkedComplete => 'Marqué comme terminé.';

  @override
  String get learnMarking => 'Enregistrement…';

  @override
  String get learnNoContentFilter =>
      'Aucun contenu pour ce filtre pour l’instant';

  @override
  String get learnNoData => 'Pas encore de données';

  @override
  String get learnPlanUnavailable => 'Programme indisponible.';

  @override
  String get learnPracticeLog => 'Journal d’entraînement';

  @override
  String get learnPracticeLogSub => 'Revoyez vos séances';

  @override
  String get learnProgressReport => 'Bilan de progression';

  @override
  String get learnProgressReportSub => 'Mesurez le chemin parcouru';

  @override
  String get learnSkillProfile => 'Profil technique';

  @override
  String get learnSkillProfileSub => 'Suivez vos points forts';

  @override
  String get learnSteps => 'Étapes';

  @override
  String get learnTrainingPlan => 'Programme d’entraînement';

  @override
  String get learnWatchVideo => 'Regarder la vidéo';

  @override
  String get legalBody =>
      'Les documents juridiques en vigueur pour l’application et le site Drift Tennis sont publiés ici. La dernière version approuvée s’ouvre toujours. Ces documents font foi en anglais.';

  @override
  String get legalDataPrivacy => 'Avis sur la protection des données';

  @override
  String get legalHeading => 'Conditions et confidentialité';

  @override
  String get legalOpenFailed =>
      'Impossible d’ouvrir le document juridique pour le moment.';

  @override
  String get legalPrivacy => 'Politique de confidentialité';

  @override
  String get legalTerms => 'Conditions générales';

  @override
  String get legalTitle => 'Mentions légales';

  @override
  String get levelAdvanced => 'Confirmé';

  @override
  String get levelAll => 'Tous niveaux';

  @override
  String get levelBeginner => 'Débutant';

  @override
  String get levelFoundational => 'Initié';

  @override
  String get levelIntermediate => 'Intermédiaire';

  @override
  String get locationDenied => 'L’autorisation de localisation a été refusée.';

  @override
  String get locationServicesOff =>
      'Les services de localisation sont désactivés.';

  @override
  String get matchAcceptTheirVersion => 'Accepter sa version';

  @override
  String get matchAddNote => 'Ajouter un message (facultatif)';

  @override
  String get matchAddSet => 'Ajouter une manche';

  @override
  String get matchCancelMatch => 'Annuler le match';

  @override
  String get matchChallenge => 'Défi';

  @override
  String get matchChoosePartner => 'Choisissez votre partenaire de double.';

  @override
  String get matchChooseYourPartner => 'Choisissez votre partenaire';

  @override
  String get matchConfidence => 'Confiance';

  @override
  String get matchConnectFirst =>
      'Connectez-vous d’abord avec un joueur pour faire équipe.';

  @override
  String get matchCourt => 'Court';

  @override
  String get matchCourtName => 'Nom du court';

  @override
  String get matchDifferentResults =>
      'Votre adversaire et vous avez saisi des résultats différents.';

  @override
  String get matchDispute => 'Contester';

  @override
  String get matchDisputeIntro =>
      'Votre adversaire et vous avez saisi des résultats différents. Acceptez sa version si elle est juste, ou modifiez la vôtre.';

  @override
  String get matchEnterResult => 'Saisir le résultat';

  @override
  String get matchHowDidItFeel => 'Comment vous êtes-vous senti ?';

  @override
  String get matchLoadConnectionsFailed =>
      'Impossible de charger vos connexions.';

  @override
  String get matchLoadFailed => 'Impossible de charger ce match.';

  @override
  String get matchLoadMatchesFailed => 'Impossible de charger vos matchs.';

  @override
  String matchOpponentPicksPartner(String name) {
    return '$name choisira son partenaire en acceptant.';
  }

  @override
  String get matchParticipantDeclined => 'A refusé';

  @override
  String get matchParticipantIn => 'Partant';

  @override
  String get matchParticipantInvited => 'Invité';

  @override
  String get matchPickATime => 'Choisissez un créneau';

  @override
  String get matchPlayers => 'Joueurs';

  @override
  String get matchProposeTimes => 'Proposer des créneaux';

  @override
  String get matchRematch => 'Revanche';

  @override
  String get matchReschedule => 'Reprogrammer';

  @override
  String get matchResult => 'Résultat';

  @override
  String get matchResultDisputed => 'Résultat contesté';

  @override
  String get matchRetirement => 'Abandon';

  @override
  String get matchReviseVersion => 'Modifier votre version';

  @override
  String matchRoundBanner(int round, String league) {
    return 'Tour $round · $league';
  }

  @override
  String get matchRoundsUsed =>
      'Vous avez utilisé toutes vos propositions — réglez le reste par message.';

  @override
  String get matchScore => 'Score';

  @override
  String get matchSendChallenge => 'Envoyer le défi';

  @override
  String matchSetNumber(int number) {
    return 'Manche $number';
  }

  @override
  String get matchSport => 'Sport';

  @override
  String get matchStateCancelled => 'Annulé';

  @override
  String get matchStateCompleted => 'Joué';

  @override
  String get matchStateDisputed => 'Contesté';

  @override
  String get matchStateExpired => 'Expiré';

  @override
  String get matchStateProposed => 'En attente de réponse';

  @override
  String get matchStateRescheduled => 'Reprogrammation';

  @override
  String get matchStateRetired => 'Abandon';

  @override
  String get matchStateScheduled => 'Programmé';

  @override
  String get matchStateScheduling => 'Choix de l’horaire';

  @override
  String get matchStateWalkover => 'Forfait';

  @override
  String get matchSuggest => 'Suggérer';

  @override
  String get matchSuggestACourt => 'Suggérer un court';

  @override
  String get matchSuggestCourt => 'Suggérer un court';

  @override
  String get matchSuggestDifferentTimes => 'Proposer d’autres créneaux';

  @override
  String get matchTapToConfirm => 'Touchez un créneau pour confirmer le match.';

  @override
  String get matchTheirVersion => 'Sa version';

  @override
  String get matchTiebreakShort => 'TB';

  @override
  String get matchTimeTbc => 'Horaire à confirmer';

  @override
  String get matchTitle => 'Match';

  @override
  String get matchUndoChallenge => 'Annuler le défi';

  @override
  String get matchUnplayedWalkover => 'Non joué — forfait';

  @override
  String get matchUnplayedWalkoverBody =>
      'La date limite du tour est passée avant que cette rencontre soit jouée. Elle est enregistrée comme forfait, sans vainqueur.';

  @override
  String get matchViewDispute => 'Voir la contestation';

  @override
  String get matchWaitingChoose => 'En attente de son choix.';

  @override
  String get matchWaitingConfirm => 'En attente de sa confirmation.';

  @override
  String get matchWalkoverNeither =>
      'Un forfait n’est attribué à aucun des joueurs.';

  @override
  String get matchWalkoverRetirement => 'Forfait / Abandon';

  @override
  String get matchWhatHappened => 'Que s’est-il passé ?';

  @override
  String get matchWhoWon => 'Qui a gagné ?';

  @override
  String get matchYouSuffix => ' (vous)';

  @override
  String get matchYourOpponent => 'Votre adversaire';

  @override
  String get matchYourPartner => 'Votre partenaire';

  @override
  String get matchYourProposedTimes => 'Vos créneaux proposés';

  @override
  String get matchYourVersion => 'Votre version';

  @override
  String get messagingChat => 'Discussion';

  @override
  String messagingConnectFirst(String name) {
    return 'Connectez-vous avec $name ou défiez-le avant de lui écrire.';
  }

  @override
  String get messagingConversation => 'Conversation';

  @override
  String get messagingEmpty =>
      'Aucune conversation pour l’instant — connectez-vous avec un joueur pour en commencer une';

  @override
  String get messagingLoadConversationFailed =>
      'Impossible de charger cette conversation.';

  @override
  String get messagingLoadFailed => 'Impossible de charger vos messages.';

  @override
  String get messagingMinChars => 'Saisissez au moins deux lettres d’un nom.';

  @override
  String get messagingNewMessage => 'Nouveau message';

  @override
  String get messagingNoSearchResults =>
      'Aucune conversation ne correspond à votre recherche';

  @override
  String get messagingSayHello => 'Dites bonjour';

  @override
  String get messagingSearch => 'Rechercher dans les messages';

  @override
  String get messagingSearchPlayers => 'Rechercher un joueur par nom';

  @override
  String get messagingSearchPlayersFailed =>
      'Impossible de rechercher des joueurs pour le moment.';

  @override
  String get messagingSystemMessage => 'Message système';

  @override
  String get messagingUnread => 'Non lus';

  @override
  String messagingViewNamed(String name) {
    return 'Voir $name';
  }

  @override
  String get messagingViewRelatedLeague => 'Voir la ligue associée';

  @override
  String get messagingViewRelatedMatch => 'Voir le match associé';

  @override
  String get navAchievements => 'Succès';

  @override
  String get navCommunity => 'Communauté';

  @override
  String get navDiscover => 'Découvrir';

  @override
  String get navHome => 'Accueil';

  @override
  String get navLearn => 'Progresser';

  @override
  String get navMessages => 'Messages';

  @override
  String get navMyProfile => 'Mon profil';

  @override
  String get navMySportsHub => 'Mon espace sport';

  @override
  String get navNews => 'Actualités';

  @override
  String get navNotifications => 'Notifications';

  @override
  String get navPlay => 'Jouer';

  @override
  String get navSettings => 'Paramètres';

  @override
  String get newsArtwork => 'Illustration d’actualité tennis';

  @override
  String get newsBrokenLink => 'Le lien vers la source semble cassé.';

  @override
  String get newsCurated => 'Sélectionné pour vous';

  @override
  String newsDaysAgo(int days) {
    return 'il y a $days j';
  }

  @override
  String get newsFreshOffCourt => 'TOUT CHAUD DU COURT';

  @override
  String get newsLatest => 'À la une';

  @override
  String get newsLatestStories => 'Derniers articles';

  @override
  String get newsLoadFailed =>
      'Impossible de charger les actualités. Tirez pour réessayer.';

  @override
  String get newsLoadMore => 'Charger plus d’articles';

  @override
  String get newsLoadMoreFailed =>
      'Impossible de charger plus d’articles. Réessayez.';

  @override
  String get newsLoadSavedFailed =>
      'Impossible de charger les articles enregistrés.';

  @override
  String get newsNoStories =>
      'Aucun article dans cette catégorie pour l’instant';

  @override
  String newsOfflineSaved(String date) {
    return 'Actualités hors ligne enregistrées le $date';
  }

  @override
  String get newsOpenInBrowser => 'Ouvrir dans le navigateur';

  @override
  String get newsOpenSource => 'Ouvrir la source originale';

  @override
  String get newsRead => 'Lire';

  @override
  String get newsReadStory => 'Lire l’article';

  @override
  String get newsRecently => 'Récemment';

  @override
  String get newsRemoveFromSaved => 'Retirer des enregistrements';

  @override
  String get newsRemoveFromSavedTitle => 'Retirer des enregistrements';

  @override
  String get newsSaveForLater =>
      'Enregistrez des articles pour les lire plus tard';

  @override
  String get newsSaveStory => 'Enregistrer l’article';

  @override
  String get newsSavedStories => 'Articles enregistrés';

  @override
  String get newsSavedStoriesTitle => 'Articles enregistrés';

  @override
  String get newsStories => 'Articles';

  @override
  String get newsStory => 'Article';

  @override
  String get newsStoryUnavailable => 'Article indisponible.';

  @override
  String get notifCaughtUp => 'Vous êtes à jour.';

  @override
  String get notifClearAll => 'Tout effacer';

  @override
  String get notifClearAllBody =>
      'Toutes les notifications de cette liste seront supprimées. Vous continuerez à recevoir les nouvelles.';

  @override
  String get notifClearAllQ => 'Effacer toutes les notifications ?';

  @override
  String get notifDeleteBody => 'Cette notification sera retirée de la liste.';

  @override
  String get notifDeleteQ => 'Supprimer la notification ?';

  @override
  String get notifLoadFailed => 'Impossible de charger les notifications.';

  @override
  String get notifMarkAllRead => 'Tout marquer comme lu';

  @override
  String get notifNothingToOpen =>
      'Rien d’autre à ouvrir pour cette notification.';

  @override
  String get notifPrefAnnouncements => 'Actualités de l’équipe Drift';

  @override
  String get notifPrefClubs => 'Annonces et adhésions de vos clubs';

  @override
  String get notifPrefCommunities =>
      'Approbations, demandes d\'adhésion et nouvelles compétitions dans vos communautés';

  @override
  String get notifPrefCompetitions =>
      'Nouveaux tours et résultats dans vos ligues';

  @override
  String get notifPrefConnections =>
      'Demandes de connexion et connexions acceptées';

  @override
  String get notifPrefLearning =>
      'Objectifs, programmes et rappels d’entraînement';

  @override
  String get notifPrefLearningTitle => 'Apprentissage';

  @override
  String get notifPrefLoadFailed => 'Impossible de charger vos préférences.';

  @override
  String get notifPrefMatches => 'Nouveaux défis et mises à jour de matchs';

  @override
  String get notifPrefMatchesTitle => 'Matchs';

  @override
  String get notifPrefMessages => 'Nouveaux messages dans vos discussions';

  @override
  String get notifPrefNews => 'Actualités et articles tennis';

  @override
  String get onbAdjustLevel => 'Ajuster le niveau';

  @override
  String get onbAdjustLevelTitle => 'Ajuster le niveau';

  @override
  String get onbAllSet => 'Tout est prêt !';

  @override
  String get onbAllSetBody =>
      'Votre profil tennis est prêt. Découvrez les joueurs, courts et matchs près de chez vous.';

  @override
  String get onbAvailabilityHighlight => 'jouer ?';

  @override
  String get onbAvailabilitySubtitle =>
      'Touchez les créneaux où vous êtes généralement libre. Vous pourrez les modifier à tout moment.';

  @override
  String get onbAvailabilityTitle => 'Quand pouvez-vous jouer ?';

  @override
  String get onbBasicHighlight => 'vous';

  @override
  String get onbBasicSubtitle =>
      'Juste l’essentiel. Vous pourrez tout modifier plus tard.';

  @override
  String get onbBasicTitle => 'Parlez-nous de vous';

  @override
  String get onbChooseEachSection =>
      'Choisissez une option dans chaque section pour continuer.';

  @override
  String get onbChooseHand => 'Choisissez votre main de jeu pour continuer.';

  @override
  String get onbChooseOption => 'Veuillez choisir une option pour continuer.';

  @override
  String get onbClubHighlight => 'jouez-vous ?';

  @override
  String get onbClubName => 'Nom du club (facultatif)';

  @override
  String get onbClubSubtitle => 'Pas encore de club ? Passez cette étape.';

  @override
  String get onbClubTitle => 'Où jouez-vous ?';

  @override
  String get onbConfirmLevel => 'Confirmer le niveau';

  @override
  String get onbEnterLocation =>
      'Indiquez votre localisation approximative pour continuer.';

  @override
  String get onbExperienceHighlight => 'tennis ?';

  @override
  String get onbExperienceSubtitle =>
      'Nous adapterons votre entraînement à votre niveau.';

  @override
  String get onbExperienceTitle => 'Quelle est votre expérience du tennis ?';

  @override
  String get onbFormat => 'Format';

  @override
  String get onbGeneralLocation => 'Localisation / ville';

  @override
  String get onbGoHome => 'Aller à l’accueil';

  @override
  String get onbGoalsHighlight => 'Drift ?';

  @override
  String get onbGoalsSubtitle =>
      'Choisissez-en autant que vous voulez. Cela oriente seulement nos suggestions.';

  @override
  String get onbGoalsTitle => 'Qu’est-ce qui vous amène sur Drift ?';

  @override
  String get onbHandAmbidextrous => 'Ambidextre';

  @override
  String get onbHandLeft => 'Gauche';

  @override
  String get onbHandRight => 'Droite';

  @override
  String get onbLoadDetailsFailed =>
      'Impossible de charger vos informations. Veuillez réessayer.';

  @override
  String get onbLocateFailed =>
      'Impossible de déterminer votre position. Saisissez-la ci-dessous.';

  @override
  String get onbLocating => 'Localisation…';

  @override
  String get onbLocationHighlight => 'basé ?';

  @override
  String get onbLocationSubtitle =>
      'Nous l’utilisons pour trouver des joueurs et des courts près de chez vous.';

  @override
  String get onbLocationTitle => 'Où êtes-vous basé ?';

  @override
  String get onbPadelHighlight => 'padel ?';

  @override
  String get onbPadelLearn => 'J’aimerais apprendre';

  @override
  String get onbPadelLearnSub => 'Prêt à m’y mettre';

  @override
  String get onbPadelNo => 'Non, juste le tennis';

  @override
  String get onbPadelNoSub => 'Fidèle aux classiques';

  @override
  String get onbPadelSubtitle =>
      'Le padel arrive bientôt sur Drift — dites-nous si vous y jouez ou souhaitez apprendre.';

  @override
  String get onbPadelTitle => 'Jouez-vous aussi au padel ?';

  @override
  String get onbPadelYes => 'Oui, je joue au padel';

  @override
  String get onbPadelYesSub => 'Déjà sur le terrain';

  @override
  String get onbPlayingHand => 'Main de jeu';

  @override
  String get onbPreferredCourt => 'Court préféré (facultatif)';

  @override
  String get onbPreferredTimes => 'Créneaux préférés';

  @override
  String get onbPrefsHighlight => 'jouer ?';

  @override
  String get onbPrefsSubtitle =>
      'Cela détermine avec qui nous vous mettons en relation.';

  @override
  String get onbPrefsTitle => 'Comment aimez-vous jouer ?';

  @override
  String get onbSelectAll => 'plusieurs choix possibles';

  @override
  String onbStepOf(int step, int total) {
    return 'ÉTAPE $step SUR $total';
  }

  @override
  String get onbStyle => 'Style';

  @override
  String get onbSuggestedHighlight => 'niveau';

  @override
  String onbSuggestedLevel(String level) {
    return 'Suggéré : $level';
  }

  @override
  String get onbSuggestedSubtitle =>
      'D’après vos réponses, voici le niveau qui vous correspond. Vous pourrez l’ajuster à tout moment depuis votre profil.';

  @override
  String get onbSuggestedTitle => 'Votre niveau suggéré';

  @override
  String get onbTimeBlockAm => 'Matin';

  @override
  String get onbTimeBlockMid => 'Midi';

  @override
  String get onbTimeBlockPm => 'Soir';

  @override
  String get onbUseCurrentLocation => 'Utiliser ma position actuelle';

  @override
  String get optCompetitive => 'Compétition';

  @override
  String get optDoubles => 'Double';

  @override
  String get optEither => 'Peu importe';

  @override
  String get optSingles => 'Simple';

  @override
  String get optSocial => 'Loisir';

  @override
  String get padelAdd => 'Ajouter le padel';

  @override
  String get padelAddBody =>
      'Vous ferez une courte évaluation adaptative dédiée au padel — régularité, jeu au filet, sorties de vitre, etc. Elle crée un profil padel entièrement distinct de votre profil tennis.';

  @override
  String get padelAddHeading => 'Ajouter le padel à votre profil';

  @override
  String get padelAdding => 'Ajout…';

  @override
  String get padelAssessment => 'Évaluation padel';

  @override
  String get padelCompleteAssessment =>
      'Faites l’évaluation pour obtenir un classement';

  @override
  String get padelGoalsHint =>
      'Séparés par des virgules, ex. Améliorer ma bandeja, Jouer chaque semaine';

  @override
  String get padelHistoryEmpty =>
      'Jouez votre premier match de padel pour commencer votre historique';

  @override
  String get padelHistoryFailed =>
      'Impossible de charger votre historique de padel.';

  @override
  String get padelMatchHistory => 'Historique des matchs de padel';

  @override
  String get padelNotAdded => 'Le padel n’a pas encore été ajouté.';

  @override
  String get padelPartnerHint => 'ex. Je cherche un partenaire régulier';

  @override
  String get padelPartnerPreference => 'Partenaire recherché';

  @override
  String padelPartnerPreferenceValue(String value) {
    return 'Partenaire recherché : $value';
  }

  @override
  String get padelPillarBandeja => 'Bandeja';

  @override
  String get padelPillarNetControl => 'Contrôle du filet';

  @override
  String get padelPillarOverhead => 'Coup au-dessus de la tête';

  @override
  String get padelPillarPartnerCommunication =>
      'Communication avec le partenaire';

  @override
  String get padelPillarPositioning => 'Placement';

  @override
  String get padelPillarRallyConsistency => 'Régularité';

  @override
  String get padelPillarSmash => 'Smash';

  @override
  String get padelPillarTacticalAwareness => 'Sens tactique';

  @override
  String get padelPillarTransition => 'Transition';

  @override
  String get padelPillarVibora => 'Víbora';

  @override
  String get padelPillarWallUsage => 'Jeu de vitres';

  @override
  String get padelPreferences => 'Préférences';

  @override
  String get padelPreferredSide => 'Côté préféré';

  @override
  String padelPreferredSideValue(String side) {
    return 'Côté préféré : $side';
  }

  @override
  String get padelPrefsGoals => 'Préférences et objectifs';

  @override
  String get padelProfile => 'Profil padel';

  @override
  String get padelProfileFailed => 'Impossible de charger votre profil padel.';

  @override
  String get padelSkillProfile => 'Profil technique';

  @override
  String get padelStartAssessment => 'Commencer l’évaluation padel';

  @override
  String get padelYourStats => 'Vos statistiques padel';

  @override
  String get payActive => 'Actif';

  @override
  String get payAddMethod => 'Ajouter';

  @override
  String get payAddPaymentMethod => 'Ajouter un moyen de paiement';

  @override
  String get payAmount => 'Montant';

  @override
  String get payBillingHistory => 'Historique de facturation';

  @override
  String get payBillingHistoryFailed =>
      'Impossible de charger votre historique de facturation.';

  @override
  String get payCard => 'Carte';

  @override
  String get payCardBrand => 'Marque de la carte';

  @override
  String get payCardBrandHint => 'ex. Visa';

  @override
  String get payCardLast4 => 'Carte tokenisée — quatre derniers chiffres';

  @override
  String get payChangePlan => 'Changer de formule';

  @override
  String get payChargesReceipts => 'Paiements et reçus';

  @override
  String get payChooseFree => 'Choisir Gratuit';

  @override
  String get payChoosePlan => 'Choisir une formule';

  @override
  String get payCreated => 'Créé le';

  @override
  String get payCurrent => 'Actuelle';

  @override
  String get payCurrentPlan => 'Formule actuelle';

  @override
  String get payDate => 'Date';

  @override
  String get payDefault => 'Par défaut';

  @override
  String get payDownloadReceipt => 'Télécharger le reçu';

  @override
  String get payFailed => 'Échoué';

  @override
  String get payFailureReason => 'Motif de l’échec';

  @override
  String get payFourDigits => 'Saisissez exactement quatre chiffres.';

  @override
  String get payFree => 'Gratuit';

  @override
  String get payFreeBeta => 'Gratuit pendant la bêta';

  @override
  String get payIncluded => 'Inclus';

  @override
  String get payInvoice => 'Facture';

  @override
  String get payManageMethods => 'Gérer les moyens de paiement';

  @override
  String get payMethodsFailed =>
      'Impossible de charger vos moyens de paiement.';

  @override
  String get payMobileLast4 =>
      'Numéro mobile tokenisé — quatre derniers chiffres';

  @override
  String get payMobileMoney => 'Mobile money';

  @override
  String get payNoBillingHistory => 'Aucune facturation pour l’instant';

  @override
  String get payNoChargesBeta => 'Aucun frais pendant la bêta.';

  @override
  String get payNoMethod => 'Aucun moyen de paiement enregistré';

  @override
  String get payNoMethodBody =>
      'Ajoutez une carte ou un compte mobile money tokenisé pour choisir une formule payante.';

  @override
  String get payNotAvailable => 'Non disponible';

  @override
  String get payPaid => 'Payé';

  @override
  String get payPastDue => 'En retard';

  @override
  String get payPaymentMethod => 'Moyen de paiement';

  @override
  String get payPaymentMethods => 'Moyens de paiement';

  @override
  String payPerMonth(String amount) {
    return '$amount / mois';
  }

  @override
  String payPerYear(String amount) {
    return '$amount / an';
  }

  @override
  String get payPeriod => 'Période';

  @override
  String payPeriodEnds(String date) {
    return 'La période en cours se termine le $date';
  }

  @override
  String payPeriodRange(String start, String end) {
    return 'du $start au $end';
  }

  @override
  String get payPlan => 'Formule';

  @override
  String get payPlansFailed =>
      'Impossible de charger les formules disponibles.';

  @override
  String get payProcessing => 'Traitement…';

  @override
  String get payProviderReference => 'Référence du prestataire';

  @override
  String get payReceipt => 'Reçu';

  @override
  String get payReceiptHeading => 'Reçu Drift Tennis';

  @override
  String get payReceiptSaveFailed =>
      'Impossible d’enregistrer le reçu. Veuillez réessayer.';

  @override
  String payReceiptSaved(String path) {
    return 'Reçu enregistré dans $path';
  }

  @override
  String get payReceiptsAppear =>
      'Vos reçus apparaîtront ici après votre premier changement de formule payante.';

  @override
  String get payRemove => 'Supprimer';

  @override
  String get payRemoveMethodQ => 'Supprimer ce moyen de paiement ?';

  @override
  String payRemoveNamed(String name) {
    return 'Supprimer $name';
  }

  @override
  String get payRetryPayment => 'Relancer le paiement';

  @override
  String get paySaveMethod => 'Enregistrer';

  @override
  String get paySelectAndPay => 'Choisir et payer';

  @override
  String get payStatus => 'Statut';

  @override
  String get paySubscriptionFailed => 'Impossible de charger votre abonnement.';

  @override
  String get payTokenNote =>
      'Drift ne conserve que le jeton du prestataire et ces chiffres d’affichage. Vos données de paiement complètes ne nous parviennent jamais.';

  @override
  String get payUpgradePlan => 'Passer à une formule supérieure';

  @override
  String get payVoid => 'Annulé';

  @override
  String get pillarBackhand => 'Revers';

  @override
  String get pillarCompetitionExperience => 'Expérience en compétition';

  @override
  String get pillarFitness => 'Condition physique';

  @override
  String get pillarFootwork => 'Jeu de jambes';

  @override
  String get pillarForehand => 'Coup droit';

  @override
  String get pillarMatchPlay => 'Jeu en match';

  @override
  String get pillarMental => 'Mental';

  @override
  String get pillarMovement => 'Déplacement';

  @override
  String get pillarNetPlay => 'Jeu au filet';

  @override
  String get pillarReturn => 'Retour';

  @override
  String get pillarServe => 'Service';

  @override
  String get pillarTactics => 'Tactique';

  @override
  String get pillarVolley => 'Volée';

  @override
  String get playActiveEmpty =>
      'Aucun match à venir — défiez quelqu’un pour commencer.';

  @override
  String get playChallengeWithdrawn => 'Défi retiré.';

  @override
  String get playChallengesEmpty =>
      'Aucun défi en cours — trouvez un joueur et lancez-en un.';

  @override
  String playCompetitionRound(String name, int round) {
    return '$name · Tour $round';
  }

  @override
  String get playFindOpponent => 'Trouver un adversaire';

  @override
  String get playHistoryEmpty =>
      'Jouez votre premier match pour commencer votre historique.';

  @override
  String get playLoadPlayersFailed =>
      'Impossible de charger les joueurs. Tirez pour réessayer.';

  @override
  String get playNoPlayersFound => 'Aucun joueur trouvé.';

  @override
  String get playRespond => 'Répondre';

  @override
  String get playSegmentMatches => 'Matchs';

  @override
  String get playTabActive => 'En cours';

  @override
  String get playTabChallenges => 'Défis';

  @override
  String get playTabHistory => 'Historique';

  @override
  String get playYourStats => 'Vos statistiques';

  @override
  String get playerAtAGlance => 'EN BREF';

  @override
  String get playerCancelRequest => 'Annuler la demande';

  @override
  String get playerChallengeToMatch => 'Défier en match';

  @override
  String get playerConnect => 'Se connecter';

  @override
  String get playerConnectToSeeAvailability =>
      'Connectez-vous pour voir quand ce joueur est généralement disponible.';

  @override
  String get playerConnectToSeeSkills =>
      'Connectez-vous avec ce joueur pour voir le détail de son jeu.';

  @override
  String get playerConnected => 'Connectés';

  @override
  String get playerDevelopmentAreas => 'Axes de progression';

  @override
  String get playerLoadFailed =>
      'Impossible de charger ce joueur pour le moment.';

  @override
  String get playerLocation => 'Lieu';

  @override
  String get playerMessage => 'Message';

  @override
  String get playerNoAssessment =>
      'Ce joueur n’a pas encore fait d’évaluation.';

  @override
  String get playerNoMatchFilters =>
      'Aucun joueur ne correspond à ces filtres. Élargissez la distance ou le niveau.';

  @override
  String get playerPlays => 'Joue';

  @override
  String get playerRequestSent => 'Demande envoyée';

  @override
  String playerRequestSentBody(String name) {
    return '$name verra votre demande de connexion. Vous pouvez l’annuler tant qu’elle est en attente.';
  }

  @override
  String get playerRequestSentCancel => 'Demande envoyée · Annuler';

  @override
  String playerStatsOf(String name) {
    return 'Statistiques de $name';
  }

  @override
  String get playerUnavailable => 'Joueur indisponible.';

  @override
  String get playerViewStats => 'Voir les statistiques';

  @override
  String get playerWantsToConnect =>
      'Souhaite se connecter — répondez dans Demandes';

  @override
  String get practiceDuration => 'Durée';

  @override
  String get practiceEmpty => 'Notez votre première séance d’entraînement';

  @override
  String get practiceLoadFailed =>
      'Impossible de charger votre journal d’entraînement.';

  @override
  String get practiceMinutesShort => 'min';

  @override
  String get practiceNotes => 'Notes';

  @override
  String get practiceNotesHint => 'Qu’avez-vous travaillé ? Des déclics ?';

  @override
  String get practiceSave => 'Enregistrer la séance';

  @override
  String get practiceSkillFocus => 'Compétence travaillée';

  @override
  String get privacyAvailabilityNote =>
      'Désactivé : seules vos connexions voient vos disponibilités détaillées';

  @override
  String get privacyLoadFailed =>
      'Impossible de charger vos paramètres de confidentialité.';

  @override
  String get privacyShowEveryone => 'Visible par tous';

  @override
  String get privacySkillsNote =>
      'Désactivé : seules vos connexions voient le détail de votre jeu';

  @override
  String get profileAddPadel => '+ Ajouter le padel';

  @override
  String get profileAddPhoto => 'Ajouter une photo';

  @override
  String get profileBio => 'Bio';

  @override
  String get profileBioHint => 'Présentez-vous aux autres joueurs';

  @override
  String get profileEdit => 'Modifier le profil';

  @override
  String get profileLevelNotAssessed => 'Niveau pas encore évalué';

  @override
  String profileLevelWithLabel(String level, String label) {
    return 'Niveau $level · $label';
  }

  @override
  String get profileLoadFailed => 'Impossible de charger votre profil.';

  @override
  String get profileMySports => 'Mes sports';

  @override
  String get profileRating => 'Classement';

  @override
  String get profileMatches => 'Matchs';

  @override
  String get profileWins => 'Victoires';

  @override
  String profilePlayingSince(String date) {
    return 'Joue sur Drift depuis $date';
  }

  @override
  String get profileMyStats => 'Mes statistiques';

  @override
  String get profilePadelLoadFailed =>
      'Impossible de charger votre profil padel';

  @override
  String get profileRemovePhoto => 'Supprimer la photo';

  @override
  String get profileYourActiveProfile => 'Votre profil actif';

  @override
  String get progressEmpty =>
      'Votre bilan se construit au fil de vos matchs et entraînements';

  @override
  String get proposeAddTime => 'Ajouter un créneau';

  @override
  String get proposeFutureTime => 'Choisissez un horaire futur.';

  @override
  String get proposeNoTimes => 'Aucun créneau ajouté.';

  @override
  String proposeOfferUpTo(int max) {
    return 'Proposez jusqu’à $max créneaux — il en choisira un.';
  }

  @override
  String proposeSendTimes(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Envoyer $count créneaux',
      one: 'Envoyer 1 créneau',
    );
    return '$_temp0';
  }

  @override
  String get proposeTitle => 'Proposer des créneaux';

  @override
  String get pushFallbackBody => 'Ouvrez pour voir ce qui a changé.';

  @override
  String get pushFallbackTitle => 'Nouvelle mise à jour de Drift Tennis';

  @override
  String get quickBookCourt => 'Réserver un court';

  @override
  String get quickBookCourtHint => 'Courts près de chez vous';

  @override
  String get quickEnterLadder => 'Rejoindre un classement';

  @override
  String get quickEnterLadderHint => 'Grimpez au classement';

  @override
  String get quickFindMatch => 'Trouver un match';

  @override
  String get quickFindMatchHint => 'Des joueurs de votre niveau';

  @override
  String get quickLogPractice => 'Noter un entraînement';

  @override
  String get quickLogPracticeHint => 'Gardez le rythme';

  @override
  String get rateGood => 'Bien';

  @override
  String get rateGreat => 'Très bien';

  @override
  String get rateOkay => 'Moyen';

  @override
  String get ratePeak => 'Au top';

  @override
  String get rateRough => 'Difficile';

  @override
  String get reasonCheating => 'Triche';

  @override
  String get reasonFakeProfile => 'Faux profil';

  @override
  String get reasonHarassment => 'Harcèlement ou abus';

  @override
  String get reasonOther => 'Autre chose';

  @override
  String get reasonSpam => 'Spam';

  @override
  String get reportChooseReason => 'Choisissez un motif pour continuer.';

  @override
  String get reportCourtTitle => 'Signaler / mettre à jour le court';

  @override
  String get reportDuplicate => 'Doublon';

  @override
  String get reportInappropriate => 'Contenu inapproprié';

  @override
  String get reportIncorrectInfo => 'Informations incorrectes';

  @override
  String get reportOther => 'Autre';

  @override
  String get reportPermanentlyClosed => 'Fermé définitivement';

  @override
  String get reportThanks => 'Merci — nous allons vérifier.';

  @override
  String get safetyAnythingElse => 'Autre chose ? (facultatif)';

  @override
  String get safetyBlock => 'Bloquer';

  @override
  String get safetyBlockBody =>
      'Il ne pourra plus vous trouver ni vous contacter, et votre connexion sera supprimée.';

  @override
  String get safetyBlockPlayer => 'Bloquer le joueur';

  @override
  String get safetyBlockQ => 'Bloquer ce joueur ?';

  @override
  String get safetyBlockSub =>
      'Il ne pourra plus vous trouver ni vous contacter';

  @override
  String get safetyMessageReported => 'Merci — ce message a été signalé.';

  @override
  String get safetyPlayerBlocked => 'Joueur bloqué.';

  @override
  String get safetyReportMessage => 'Signaler ce message';

  @override
  String get safetyReportPlayer => 'Signaler le joueur';

  @override
  String get safetyReportPrivacy =>
      'Les signalements sont transmis à notre équipe de modération et ne sont jamais partagés avec le joueur signalé.';

  @override
  String get safetyReportSubmitted => 'Signalement envoyé. Merci.';

  @override
  String get safetyReporting => 'Signalement…';

  @override
  String get safetySubmitReport => 'Envoyer le signalement';

  @override
  String get safetyTellUs => 'Dites-nous ce qui s’est passé';

  @override
  String get safetyTitle => 'Sécurité';

  @override
  String get scoreErrBothGames =>
      'Saisissez les jeux des deux joueurs pour chaque manche.';

  @override
  String get matchLength => 'Format du match';

  @override
  String get aiCoachLabel => 'Coach IA';

  @override
  String get commonComingSoon => 'Bientôt disponible';

  @override
  String get drawerSoonBadge => 'Bientôt';

  @override
  String matchBestOfN(int number) {
    return 'Au meilleur des $number';
  }

  @override
  String scoreErrMatchDecided(int set) {
    return 'Le match était déjà joué avant la manche $set. Supprimez les manches en trop.';
  }

  @override
  String get scoreErrNeedMoreSets =>
      'Le match n’est pas terminé — ajoutez les manches restantes.';

  @override
  String scoreErrInvalid(int set, String score) {
    return 'La manche $set ($score) n’est pas un score de tennis valide.';
  }

  @override
  String scoreErrNeedTiebreak(int set) {
    return 'La manche $set s’est jouée au tie-break (7-6) — saisissez les points du tie-break.';
  }

  @override
  String get scoreErrRetirementWinner =>
      'Indiquez qui a gagné après l’abandon.';

  @override
  String scoreErrTie(int set, String score) {
    return 'La manche $set ne peut pas se terminer à égalité ($score).';
  }

  @override
  String scoreErrTiebreak(int set, String score) {
    return 'Les points du tie-break de la manche $set ($score) ne sont pas un score final valide.';
  }

  @override
  String get searchAll => 'Tout';

  @override
  String get searchCompetitions => 'Compétitions';

  @override
  String get searchHint => 'Joueurs, courts, clubs, compétitions';

  @override
  String get searchLoadFailed => 'La recherche n’a pas pu être chargée.';

  @override
  String get searchMinChars =>
      'Saisissez au moins deux caractères pour rechercher dans Drift.';

  @override
  String searchNoResults(String query) {
    return 'Aucun résultat pour « $query ». Essayez une recherche plus large ou un autre filtre.';
  }

  @override
  String get searchPlayersHint => 'Rechercher des joueurs…';

  @override
  String get searchResult => 'Résultat';

  @override
  String get searchResultsFailed => 'Impossible de charger les résultats.';

  @override
  String get seasonDraft => 'Pas encore ouvert';

  @override
  String get seasonNotStarted => 'Pas encore commencé';

  @override
  String get seasonRegistrationOpen => 'Inscriptions ouvertes';

  @override
  String seasonRoundOf(int current, int total) {
    return 'Tour $current sur $total';
  }

  @override
  String get seasonStartingSoon => 'Bientôt';

  @override
  String get securityChangePassword => 'Changer le mot de passe';

  @override
  String get securityCurrentPassword => 'Mot de passe actuel';

  @override
  String get securityPasswordUpdated => 'Mot de passe mis à jour.';

  @override
  String get securityUpdatePassword => 'Mettre à jour le mot de passe';

  @override
  String get settingsAccount => 'Compte';

  @override
  String get settingsAccountSecurity => 'Compte et sécurité';

  @override
  String get settingsAnalyseClip => 'Analyser une vidéo';

  @override
  String get settingsAppearance => 'Apparence';

  @override
  String get settingsBlockedUsers => 'Utilisateurs bloqués';

  @override
  String get settingsContactSupport => 'Contacter l’assistance';

  @override
  String get settingsDeleteAccount => 'Supprimer le compte';

  @override
  String get settingsHelpFaq => 'Aide et FAQ';

  @override
  String get settingsLabs => 'Labo';

  @override
  String get settingsLanguage => 'Langue';

  @override
  String get settingsLegalDocuments => 'Documents juridiques';

  @override
  String get settingsLogOutRow => 'Se déconnecter';

  @override
  String get settingsLogout => 'Se déconnecter';

  @override
  String get settingsLogoutConfirmBody =>
      'Vous pouvez vous reconnecter à tout moment.';

  @override
  String get settingsLogoutConfirmTitle => 'Se déconnecter ?';

  @override
  String get settingsManageConnectionRequests =>
      'Gérer les demandes de connexion';

  @override
  String get settingsNotificationPreferences => 'Préférences de notification';

  @override
  String get settingsNotifications => 'Notifications';

  @override
  String get settingsPlanBilling => 'Abonnement et facturation';

  @override
  String get settingsPrivacySafety => 'Confidentialité et sécurité';

  @override
  String get settingsPrivacySettings => 'Paramètres de confidentialité';

  @override
  String get settingsSubscriptionPlan => 'Abonnement et formule';

  @override
  String get settingsSupport => 'Assistance';

  @override
  String get settingsThemeDark => 'Sombre';

  @override
  String get settingsThemeDevice => 'Appareil';

  @override
  String get settingsThemeLight => 'Clair';

  @override
  String settingsThemeValue(String mode) {
    return 'Thème : $mode';
  }

  @override
  String get settingsTitle => 'Paramètres';

  @override
  String settingsVersion(String version) {
    return 'Drift Tennis v$version';
  }

  @override
  String get skillBuilding => 'En construction';

  @override
  String get skillNotEnoughData =>
      'Pas encore assez de données — faites quelques séances ou matchs';

  @override
  String get skillOnboardingAssessment => 'Évaluation initiale';

  @override
  String get skillProfileUnavailable => 'Profil technique indisponible.';

  @override
  String get skillRecommended => 'Recommandé';

  @override
  String get skillRecommendedForYou => 'Recommandé pour vous';

  @override
  String get skillRetakeAssessment => 'Refaire l’évaluation';

  @override
  String get skillSetGoal => 'Fixer un objectif';

  @override
  String get skillSignals => 'Éléments pris en compte';

  @override
  String get splashConnectFailed =>
      'Connexion impossible. Votre session est toujours enregistrée.';

  @override
  String get sportPadel => 'Padel';

  @override
  String get sportTennis => 'Tennis';

  @override
  String get standingsLegend =>
      'V = victoire · D = défaite · Pts = points (3 par victoire)';

  @override
  String get standingsPlayed => 'MJ';

  @override
  String get standingsPoints => 'Pts';

  @override
  String get statLosses => 'Défaites';

  @override
  String get statNoMatchesPlayed => 'Aucun match joué';

  @override
  String get statNoRatedMatches => 'Aucun match classé pour l’instant';

  @override
  String get statPlayed => 'Joués';

  @override
  String get statRecentForm => 'Forme récente';

  @override
  String get statWinRate => 'Taux de victoire';

  @override
  String get statWins => 'Victoires';

  @override
  String statWinsLosses(int wins, int losses) {
    return '$wins V · $losses D';
  }

  @override
  String get statWon => 'Gagnés';

  @override
  String get supportBody =>
      'Envoyez-nous un e-mail et nous vous répondrons dès que possible. Utilisez cette adresse pour la récupération de compte, les demandes de suppression, la facturation, les signalements et les problèmes techniques.';

  @override
  String supportEmailButton(String email) {
    return 'Écrire à $email';
  }

  @override
  String supportEmailUs(String email) {
    return 'Écrivez-nous à $email';
  }

  @override
  String get supportNeedHelp => 'Besoin d’aide ?';

  @override
  String get surfaceArtificialGrass => 'Gazon synthétique';

  @override
  String get surfaceCarpet => 'Moquette';

  @override
  String get surfaceClay => 'Terre battue';

  @override
  String get surfaceGrass => 'Gazon';

  @override
  String get surfaceHard => 'Dur';

  @override
  String get sysChallengeAccepted => 'Défi accepté';

  @override
  String get sysChallengeDeclined => 'Défi refusé';

  @override
  String get sysChallengeSent => 'Défi envoyé';

  @override
  String get sysChallengeWithdrawn => 'Défi retiré';

  @override
  String get sysCourtSuggested => 'Court suggéré';

  @override
  String get sysDisputeResolved => 'Contestation résolue';

  @override
  String get sysFixtureScheduled => 'Rencontre programmée';

  @override
  String get sysFixtureWalkover => 'Rencontre non jouée — forfait';

  @override
  String get sysMatchCancelled => 'Match annulé';

  @override
  String get sysMatchConfirmed => 'Match confirmé';

  @override
  String get sysMatchRescheduled => 'Match reprogrammé';

  @override
  String get sysResultConfirmed => 'Résultat confirmé';

  @override
  String get sysResultDisputed => 'Résultat contesté';

  @override
  String get sysResultSubmitted => 'Résultat saisi';

  @override
  String get sysTimeAccepted => 'Créneau accepté';

  @override
  String get sysTimeProposed => 'Créneau proposé';

  @override
  String get timeAfternoon => 'Après-midi';

  @override
  String get timeEvening => 'Soir';

  @override
  String get timeMorning => 'Matin';

  @override
  String get videoAnalyseThis => 'Analyser cette vidéo';

  @override
  String get videoAnalysingYourClip => 'Analyse de votre vidéo…';

  @override
  String get videoAnalysisError =>
      'Une erreur s’est produite pendant l’analyse de cette vidéo.';

  @override
  String get videoAnalysisUnfinished => 'L’analyse ne s’est pas terminée';

  @override
  String get videoBuffering => 'Chargement de la vidéo…';

  @override
  String get videoChecking => 'Vérification de la vidéo…';

  @override
  String get videoCheckingOffline =>
      'La vérification des vidéos est hors ligne';

  @override
  String get videoCheckingOfflineBody =>
      'Vous pouvez quand même envoyer la vidéo, mais nous ne pouvons pas la vérifier pour l’instant.';

  @override
  String get videoChooseLibrary => 'Choisir dans la galerie';

  @override
  String get videoClipAnalysis => 'Analyse de la vidéo';

  @override
  String get videoClipPassed => 'Cette vidéo a passé les vérifications';

  @override
  String get videoClipRejected => 'Cette vidéo ne peut pas être analysée';

  @override
  String get videoClipUsable => 'Cette vidéo semble exploitable';

  @override
  String get videoCoupleSeconds => 'Cela prend quelques secondes.';

  @override
  String get videoCourtUnchecked =>
      'Remarque : nous n’avons pas pu vérifier les lignes du court sur cette vidéo, nous ne pouvons donc pas garantir sa bonne lecture.';

  @override
  String get videoDidntWork => 'Ça n’a pas marché';

  @override
  String get videoEarlyNote =>
      'L’analyse est une fonctionnalité récente. Ces chiffres proviennent d’une seule caméra et sont des estimations, pas des mesures radar.';

  @override
  String get videoLesson => 'Leçon vidéo';

  @override
  String get videoLessonComplete => 'Leçon marquée comme terminée.';

  @override
  String get videoLessonNotFound => 'Leçon vidéo introuvable.';

  @override
  String get videoLoadClipFailed => 'Impossible de charger cette vidéo';

  @override
  String videoMeasuredAll(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Nous avons mesuré les $count échanges trouvés',
      one: 'Nous avons mesuré l’échange trouvé',
    );
    return '$_temp0';
  }

  @override
  String get videoMeasuredAllBody =>
      'Les totaux ci-dessous couvrent toute la séance.';

  @override
  String videoMeasuredSome(int analysed, int found) {
    return 'Nous avons mesuré $analysed échanges sur $found';
  }

  @override
  String videoMeasuredSomeBody(int analysed) {
    return 'L’analyse vidéo est lente, nous traitons donc autant de la séance que possible. Les totaux ci-dessous couvrent les $analysed échanges mesurés — pas toute la séance. Tous les échanges trouvés sont listés plus bas.';
  }

  @override
  String get videoNoAsset => 'Aucune vidéo n’est associée à cette leçon.';

  @override
  String get videoNoDistances =>
      'Distances et vitesses indisponibles pour cette vidéo';

  @override
  String get videoNoDistancesBody =>
      'Les lignes du court n’ont pas pu être lues assez nettement pour mesurer les distances : vitesses et positions ne seraient pas de vraies mesures. Le nombre de coups ci-dessous reste exact.';

  @override
  String get videoNoSpeeds =>
      'Aucune vitesse n’a pu être mesurée sur cette vidéo.';

  @override
  String get videoOpponent => 'Adversaire';

  @override
  String get videoOpponentAvgShot => 'Coup moyen de l’adversaire';

  @override
  String get videoPassedChecks =>
      'Elle a passé toutes nos vérifications actuelles. L’analyse elle-même est encore en développement — nous vous préviendrons dès qu’elle arrive.';

  @override
  String get videoPause => 'Pause';

  @override
  String get videoPlay => 'Lecture';

  @override
  String get videoPlaybackCompleted =>
      'Lecture terminée. Marquez la leçon comme terminée quand vous êtes prêt.';

  @override
  String get videoPlaybackError => 'Erreur de lecture. Veuillez réessayer.';

  @override
  String get videoRalliesMeasured => 'Échanges mesurés';

  @override
  String get videoRallyByRally => 'Échange par échange';

  @override
  String get videoRallyFailed => 'Cet échange n’a pas pu être analysé';

  @override
  String get videoReadyToAnalyse =>
      'Elle est prête à être analysée quand vous voulez.';

  @override
  String get videoRecord => 'Filmer une vidéo';

  @override
  String get videoServeAvg => 'Service (moyenne sur la trajectoire)';

  @override
  String get videoSessionTotals => 'Totaux de la séance';

  @override
  String videoShotCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count coups',
      one: '1 coup',
    );
    return '$_temp0';
  }

  @override
  String videoShotCountNoCourt(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count coups',
      one: '1 coup',
    );
    return '$_temp0 · court non calibré, pas de vitesses';
  }

  @override
  String get videoShotTypes => 'Types de coups';

  @override
  String get videoShotTypesNote =>
      'Les types de coups sont une fonctionnalité récente, souvent erronée. Considérez-les comme une indication.';

  @override
  String get videoShots => 'Coups';

  @override
  String get videoSkippedBudget =>
      'Non mesuré — temps d’analyse épuisé pour cette séance';

  @override
  String get videoSomeUncalibrated =>
      'Certains échanges n’ont pas pu être mesurés en vitesse';

  @override
  String videoSomeUncalibratedBody(int count) {
    return '$count des échanges mesurés n’avaient pas de lignes assez nettes : ils comptent dans les coups mais pas dans les vitesses.';
  }

  @override
  String get videoSpeed => 'Vitesse';

  @override
  String get videoSpeedNote =>
      'Moyenne sur la trajectoire de la balle, donc inférieure à une mesure radar à l’impact.';

  @override
  String get videoStarting => 'Démarrage…';

  @override
  String get videoStatusAccepted => 'Prête à analyser';

  @override
  String get videoStatusAnalysed => 'Analysée';

  @override
  String get videoStatusAnalysing => 'Analyse en cours…';

  @override
  String get videoStatusFailed => 'Une erreur s’est produite';

  @override
  String get videoStatusRejected => 'Analyse impossible';

  @override
  String get videoTakesMinutes =>
      'L’analyse prend quelques minutes. Nous vous préviendrons quand elle sera terminée — inutile de rester sur cet écran.';

  @override
  String get videoTakesMinutesLeave =>
      'Cela prend quelques minutes. Nous vous préviendrons quand ce sera prêt, vous pouvez quitter cet écran.';

  @override
  String get videoTip1 =>
      'Tenez le téléphone à l’horizontale, pas à la verticale';

  @override
  String get videoTip2 =>
      'Calez-le contre le grillage ou utilisez un trépied, et ne le bougez pas';

  @override
  String get videoTip3 => 'Cadrez le plus de court possible';

  @override
  String get videoTip4 =>
      'Les courts aux lignes bien visibles donnent les meilleurs résultats';

  @override
  String get videoTip5 => 'Une seule prise continue — sans coupe ni montage';

  @override
  String get videoTipsHeading => 'Pour une vidéo exploitable';

  @override
  String get videoTooShort => 'Trop court pour être mesuré';

  @override
  String get videoTryAnother => 'Essayer une autre vidéo';

  @override
  String get videoUnreachable =>
      'Impossible de joindre Drift. Vérifiez votre connexion et réessayez.';

  @override
  String get videoUploadAnother => 'Envoyer une autre vidéo';

  @override
  String get videoUploadFailed =>
      'L’envoi de la vidéo a échoué. Veuillez réessayer.';

  @override
  String get videoUploadTimeout =>
      'L’envoi a expiré. Vérifiez votre connexion et réessayez — une vidéo plus courte s’enverra plus vite.';

  @override
  String get videoUploading => 'Envoi…';

  @override
  String get videoWhatToChange =>
      'Voici ce qu’il faut changer avant de filmer à nouveau.';

  @override
  String get videoWorthKnowing => 'Bon à savoir';

  @override
  String get videoYourAvgShot => 'Votre coup moyen';

  @override
  String get welcomeBody =>
      'Suivez vos matchs, participez aux classements et tournois, et progressez, le tout au même endroit.';

  @override
  String get welcomeContinueEmail => 'Continuer avec l’e-mail';

  @override
  String get welcomeTitle => 'Rejoignez le court';

  @override
  String get withdrawBody =>
      'Le joueur invité sera informé que le défi a été retiré.';

  @override
  String get withdrawKeep => 'Garder le défi';

  @override
  String get withdrawTitle => 'Annuler ce défi ?';

  @override
  String get homeVs => 'VS';

  @override
  String get homeNextMatchEmptyTitle => 'Votre prochain adversaire vous attend';

  @override
  String get homeNextMatchEmptyBody =>
      'Trouvez un joueur de votre niveau et fixez un créneau.';

  @override
  String get homeChallengeAFriend => 'Défier un ami';

  @override
  String get homeTodaysFact => 'Votre ace du jour';

  @override
  String get tennisFactEyebrow => 'Je parie que vous l\'ignoriez';

  @override
  String get tennisFactCta => 'Découvrir l\'histoire';

  @override
  String get tennisFactGotIt => 'Compris';

  @override
  String tennisFactSource(String source) {
    return 'Source : $source';
  }

  @override
  String get tennisFactOpenHint => 'Touchez pour lire';

  @override
  String get bookingTitle => 'Réserver un court';

  @override
  String get bookingSurface => 'Surface';

  @override
  String get bookingDay => 'Jour';

  @override
  String get bookingTime => 'Heure de début';

  @override
  String get bookingDuration => 'Durée';

  @override
  String bookingMinutes(int minutes) {
    return '$minutes min';
  }

  @override
  String get bookingNoteLabel => 'Message pour le club (facultatif)';

  @override
  String get bookingFreeNote => 'Gratuit. Le club confirme votre demande.';

  @override
  String get bookingSubmit => 'Demander la réservation';

  @override
  String get bookingNoSlots => 'Aucun créneau disponible ce jour-là.';

  @override
  String get bookingPickSlot => 'Choisissez une heure de début';

  @override
  String get bookingSent => 'Demande envoyée. Le club la confirmera bientôt.';

  @override
  String get bookingUnavailable =>
      'La réservation en ligne n\'est pas disponible pour ce court pour le moment.';

  @override
  String get bookingRequestAction => 'Demander un créneau';

  @override
  String get bookingMyBookings => 'Mes réservations';

  @override
  String get bookingEmpty => 'Aucune réservation pour l\'instant';

  @override
  String get bookingEmptyHint =>
      'Les demandes de court que vous envoyez apparaîtront ici.';

  @override
  String get bookingUpcoming => 'À venir';

  @override
  String get bookingPast => 'Passées';

  @override
  String get bookingStatusPending => 'En attente';

  @override
  String get bookingStatusApproved => 'Confirmée';

  @override
  String get bookingStatusDeclined => 'Refusée';

  @override
  String get bookingStatusCancelled => 'Annulée';

  @override
  String get bookingStatusCompleted => 'Terminée';

  @override
  String get bookingCancel => 'Annuler la réservation';

  @override
  String get bookingCancelTitle => 'Annuler cette réservation ?';

  @override
  String get bookingCancelBody => 'Le club sera informé que vous ne venez pas.';

  @override
  String get bookingKeep => 'Conserver';

  @override
  String get bookingCancelled => 'Réservation annulée';

  @override
  String get bookingCancelledByClub => 'Annulée par le club';

  @override
  String bookingClubNote(String note) {
    return 'Message du club : $note';
  }

  @override
  String bookingYourNote(String note) {
    return 'Votre message : $note';
  }

  @override
  String get availBookInApp => 'Demander dans l\'app';
}
