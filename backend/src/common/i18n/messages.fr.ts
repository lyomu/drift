import type { MessageKey } from './messages.en';

/** French copy — see `messages.en.ts`, the source catalog. */
export const fr: Record<MessageKey, string> = {
  'common.aClub': 'un club',
  'common.theClub': 'le club',
  'common.aPlayer': 'Un joueur',

  'club.added.title': 'Vous avez été ajouté à {club}',
  'club.added.body':
    'Votre adhésion au club est active. Touchez pour voir le club.',
  'club.joined.title': 'Vous avez rejoint {club}',
  'club.joined.body':
    'Les annonces et le fil du club vous sont désormais ouverts.',
  'club.joinRequest.title': '{name} demande à rejoindre {club}',
  'club.joinRequest.body': 'Examinez la demande dans Membres.',
  'booking.request.title': '{name} demande une réservation de court',
  'booking.request.body':
    '{court} · {when}. Examinez la demande dans Réservations.',
  'booking.approved.title': 'Réservation confirmée',
  'booking.approved.body': '{court} · {when}{note}',
  'booking.declined.title': 'Réservation refusée',
  'booking.declined.body': '{court} · {when}{note}',
  'booking.cancelledByClub.title': 'Réservation annulée par le club',
  'booking.cancelledByClub.body': '{court} · {when}{note}',
  'booking.expired.title': 'Demande de réservation expirée',
  'booking.expired.body': '{court} · {when}. Le club n’a pas répondu à temps.',

  'league.registered.title': 'Vous êtes inscrit',
  'league.registered.body':
    '{league}. Nous vous préviendrons dès l’ouverture de votre premier tour.',
  'league.waitlisted.title': 'Vous êtes sur liste d’attente',
  'league.waitlisted.body':
    '{league} est complet. Vous serez inscrit automatiquement si une place se libère.',
  'league.promoted.title': 'Vous y êtes',
  'league.promoted.body':
    'Une place s’est libérée dans {league}. Vous avez été inscrit.',
  'league.roundOpen.title': 'Le tour {round} est ouvert',
  'league.roundOpen.body':
    '{league} — consultez votre rencontre et fixez une date.',
  'ladder.challenge.title': 'Défi de classement',
  'ladder.challenge.body':
    'Vous avez été défié sur {ladder}. Acceptez pour programmer le match.',

  'connection.request.title': '{name} souhaite se connecter',
  'connection.request.body':
    'Examinez sa demande pour l’accepter ou la refuser.',
  'connection.accepted.title': '{name} a accepté votre demande de connexion',
  'connection.accepted.body': 'Vous êtes maintenant connectés.',

  'match.challenge.title': '{name} vous a défié en match',
  'match.challenge.body': 'Examinez le défi pour l’accepter ou le refuser.',
  'match.partnerInvite.title': '{name} vous veut comme partenaire de double',
  'match.partnerInvite.body': 'Acceptez pour rejoindre le match.',
  'match.everyoneIn.title': 'Tout le monde est partant — fixez une date',
  'match.everyoneIn.body': 'Proposez un créneau pour programmer le match.',
  'match.accepted.title': '{name} a accepté votre défi',
  'match.accepted.body': 'En attente des autres joueurs.',
  'match.declined.title': '{name} a refusé votre défi',
  'match.declined.body': 'Trouvez un autre adversaire quand vous voulez.',
  'match.timeProposed.title': '{name} a proposé un créneau',
  'match.timeProposed.body':
    'Choisissez celui qui vous convient ou proposez le vôtre.',
  'match.confirmed.title': 'Votre match est confirmé',
  'match.confirmed.body': 'Fixé au {date}.',
  'match.courtSuggested.title': '{name} a suggéré un court',
  'match.reschedule.title': '{name} souhaite reprogrammer',
  'match.reschedule.body':
    'Proposez un nouveau créneau pour relancer le match.',
  'match.cancelled.title': '{name} a annulé le match',
  'match.cancelled.noReason': 'Aucune raison donnée.',
  'match.withdrawn.title': '{name} a retiré le défi',
  'match.withdrawn.body': 'Ce défi n’est plus disponible.',

  'result.submitted.title': '{name} a soumis un résultat',
  'result.submitted.body': 'Vérifiez-le pour le confirmer ou le contester.',
  'result.confirmed.title': '{name} a confirmé votre résultat',
  'result.confirmed.body': 'Votre classement et vos statistiques sont à jour.',
  'result.disputed.title': '{name} a contesté le résultat',
  'result.disputed.body':
    'Ouvrez la contestation pour soumettre votre version.',
  'result.resolved.title': 'Votre contestation est résolue',
  'result.resolved.body':
    'Les deux versions concordent — les classements sont à jour.',
  'result.revised.title': '{name} a modifié sa version',
  'result.revised.body':
    'Elle ne correspond toujours pas à la vôtre — vérifiez à nouveau.',
  'result.ruled.title':
    'Un administrateur du club a tranché votre contestation',
  'result.ruled.body':
    'Le résultat est définitif et les classements sont à jour.',
  'result.recorded.title':
    'Un administrateur du club a enregistré votre résultat',
  'result.recorded.body': 'Votre classement et vos statistiques sont à jour.',

  'message.new.title': 'Nouveau message de {name}',
  'message.newInCommunity.title': '{community} : {name}',

  // Communities
  'community.approved.title': 'Votre communauté est en ligne',
  'community.approved.body':
    '{community} a été approuvée. Invitez les personnes avec qui vous jouez.',
  'community.rejected.title': "Votre communauté n'a pas été approuvée",
  'community.rejected.body': '{community} : {note}',
  'community.rejectedNoNote.body':
    '{community} ne respecte pas les règles des communautés.',
  'community.joinRequest.title': '{name} souhaite rejoindre {community}',
  'community.joinRequest.body': 'Examinez la demande dans Gérer la communauté.',
  'community.requestApproved.title': 'Vous avez rejoint {community}',
  'community.requestApproved.body':
    'Dites bonjour dans la discussion de la communauté.',
  'community.requestDeclined.title': 'Demande non acceptée',
  'community.requestDeclined.body':
    "{community} n'a pas accepté votre demande.",
  'community.removed.title': 'Retiré de {community}',
  'community.removed.body':
    'Un administrateur vous a retiré de cette communauté.',
  'community.suspended.title': '{community} a été suspendue',
  'community.suspended.body':
    "Sa discussion est en lecture seule pendant que Drift Tennis l'examine.",
  'community.restored.title': '{community} est de retour',
  'community.restored.body':
    'La discussion de la communauté est de nouveau ouverte.',
  'community.deleted.title': '{community} a été fermée',
  'community.deleted.body': "Cette communauté n'existe plus.",
  'community.madeAdmin.title':
    'Vous êtes maintenant administrateur de {community}',
  'community.madeAdmin.body':
    'Vous pouvez approuver les demandes et gérer les membres.',
  'community.ownershipTransferred.title':
    'Vous êtes maintenant propriétaire de {community}',
  'community.ownershipTransferred.body':
    'Vous pouvez tout gérer dans cette communauté.',
  'community.newLeague.title': 'Nouvelle ligue dans {community}',
  'community.newLadder.title': 'Nouvelle échelle dans {community}',
  'community.newCompetition.body':
    '{competition}. Ouvrez la communauté pour participer.',

  'home.empty.title': 'Vous êtes à jour',
  'home.empty.body':
    'Rien ne vous attend pour l’instant. Trouvez un joueur près de chez vous et organisez votre prochain match.',
  'home.action.findPlayers': 'Trouver des joueurs',
  'home.action.viewAll': 'Tout voir',
  'home.action.openClub': 'Ouvrir {club}',
  'home.action.open': 'Ouvrir',
  'home.action.viewChallenge': 'Voir le défi',
  'home.action.openFixture': 'Voir la rencontre',
  'home.action.findCourts': 'Trouver des courts',
  'home.action.addPadel': 'Ajouter le padel',
  'home.action.viewRequests': 'Voir les demandes',
  'home.action.reviewDispute': 'Voir la contestation',
  'home.action.reviewScore': 'Vérifier le score',
  'home.action.openInbox': 'Ouvrir la messagerie',
  'home.action.viewMatch': 'Voir le match',
  'home.achievements.title': '{earned} succès sur {total}',
  'home.achievements.next': 'Prochain : {title} — {criteria}',
  'home.achievements.keepPlaying':
    'Continuez à jouer pour débloquer les autres.',
  'home.skill.FOREHAND': 'coup droit',
  'home.skill.BACKHAND': 'revers',
  'home.skill.SERVE': 'service',
  'home.skill.RETURN': 'retour',
  'home.skill.NET_PLAY': 'jeu au filet',
  'home.skill.MOVEMENT': 'déplacement',
  'home.skill.MATCH_PLAY': 'jeu en match',
  'home.recommendation.title': 'Travaillez votre {skill}',
  'home.recommendation.drill':
    '« {title} » est un exercice choisi pour votre niveau.',
  'home.recommendation.lesson':
    '« {title} » est une leçon choisie pour votre niveau.',
  'home.challenge.title': '{name} vous a défié',
  'home.challenge.singles': 'Un match en simple.',
  'home.challenge.doubles': 'Un match en double.',
  'home.challenge.respond': 'Acceptez ou refusez pour lui répondre.',
  'home.challenge.expiresToday': 'Il expire aujourd’hui.',
  'home.challenge.expiresTomorrow': 'Expire demain.',
  'home.challenge.expiresInDays': 'Expire dans {days} jours.',
  'home.round.title': 'Le tour {round} se termine {when}',
  'home.round.withinHour': 'dans l’heure',
  'home.round.inHours': 'dans {hours} heures',
  'home.round.tomorrow': 'demain',
  'home.round.inDays': 'dans {days} jours',
  'home.round.scheduled':
    'Jouez votre rencontre de {league} et saisissez le score avant la date limite, sinon elle sera enregistrée comme forfait.',
  'home.round.unscheduled':
    'Vous n’avez pas encore fixé d’horaire pour votre rencontre de {league}. Les rencontres non jouées sont enregistrées comme forfait.',
  'home.courts.title': 'Courts près de chez vous',
  'home.courts.distance': '{name} est à environ {km} km.',
  'home.courts.nearby': '{name} et d’autres sont à proximité.',
  'home.padel.title': 'Le padel vous attend',
  'home.padel.learn':
    'Vous souhaitez apprendre le padel. Faites la courte évaluation et nous fixerons votre niveau de départ.',
  'home.padel.plays':
    'Vous jouez aussi au padel. Ajoutez-le à votre profil pour obtenir un classement et un historique de matchs.',
  'home.connections.one': '{name} souhaite se connecter',
  'home.connections.many': '{count} personnes souhaitent se connecter',
  'home.connections.oneBody':
    'Vous connecter débloque son profil complet et vous permet d’échanger des messages.',
  'home.connections.manyBody':
    'Dont {name}. Vous connecter débloque les profils complets et la messagerie.',
  'home.opponents.title': 'Joueurs de votre niveau',
  'home.opponents.one': 'Un joueur à proximité semble être un bon adversaire.',
  'home.opponents.many':
    '{count} joueurs à proximité semblent être de bons adversaires.',
  'home.result.yourOpponent': 'Votre adversaire',
  'home.result.disputedTitle': 'Un score est contesté',
  'home.result.disputedBody':
    '{name} et vous avez saisi des scores différents. Comparez les deux versions pour trancher.',
  'home.result.confirmTitle': 'Confirmez le score de votre match',
  'home.result.confirmBody':
    '{name} a saisi un score. Confirmez-le pour valider vos deux classements.',
  'home.messages.one': 'Vous avez un nouveau message',
  'home.messages.many': '{count} messages non lus',
  'home.messages.oneThread': 'Dans une conversation.',
  'home.messages.manyThreads': 'Dans {count} conversations.',
  'home.upcoming.yourOpponent': 'votre adversaire',
  'home.upcoming.title': 'Prochain match : {name}',
  'home.upcoming.at': 'À {venue}.',
  'home.upcoming.noCourt': 'Aucun court fixé pour l’instant.',

  'mail.signoff': '— Drift Tennis',

  'mail.code.signup.subject': 'Votre code de vérification Drift Tennis',
  'mail.code.signup.lead':
    'Bienvenue sur Drift Tennis. Votre code de vérification e-mail est :',
  'mail.code.passwordReset.subject':
    'Réinitialisez votre mot de passe Drift Tennis',
  'mail.code.passwordReset.lead':
    'Utilisez le code ci-dessous pour réinitialiser votre mot de passe Drift Tennis :',
  'mail.code.expiry':
    'Le code expire dans 10 minutes et ne peut être utilisé qu’une fois.',
  'mail.code.ignore':
    'Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail — votre compte est en sécurité.',

  'mail.clubSetup.subject':
    'Votre club Drift Tennis a été approuvé — terminez sa configuration',
  'mail.clubSetup.approved':
    'Votre demande de création de club a été approuvée.',
  'mail.clubSetup.finish': 'Terminez la configuration de votre compte club :',
  'mail.ignoreIfNotRequested':
    'Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.',
  'mail.clubWelcome.subject': 'Vous avez été ajouté à {club} sur Drift Tennis',
  'mail.clubWelcome.added': 'Vous avez été ajouté à {club} en tant que {role}.',
  'mail.clubWelcome.open':
    'Ouvrez l’application Drift Tennis pour voir votre club.',
  'mail.role.OWNER': 'propriétaire',
  'mail.role.ADMIN': 'administrateur',
  'mail.role.COMPETITION_MANAGER': 'responsable des compétitions',
  'mail.role.COACH': 'entraîneur',
  'mail.role.CONTENT_MANAGER': 'responsable du contenu',
  'mail.role.READ_ONLY': 'membre en lecture seule',

  'mail.welcome.greetingNamed': 'Bonjour {name},',
  'mail.welcome.greeting': 'Bonjour,',
  'mail.welcome.subject': 'Bienvenue sur Drift Tennis',
  'mail.welcome.body':
    'Bienvenue sur Drift Tennis — nous sommes vraiment ravis de vous compter parmi nous.\n\nDrift vous aide à trouver des partenaires de jeu, à progresser\net à rester en contact avec votre communauté tennis.\n\nComplétez votre profil pour commencer, puis découvrez les joueurs, les clubs\net les matchs près de chez vous. Que vous veniez pour jouer, entraîner ou\nanimer un club, vous faites désormais partie de la communauté Drift.\n\nÀ bientôt sur le court,',
  'mail.welcomeClub.subject': 'Bienvenue sur Drift Tennis — {club} est prêt',
  'mail.welcomeClub.body':
    'Bienvenue sur Drift Tennis — nous sommes ravis que {club} rejoigne la communauté.\n\nL’espace de votre club est prêt. Ajoutez les informations qui aident les joueurs à vous trouver,\ninvitez votre équipe et publiez votre première annonce quand vous le souhaitez.\n\nNous sommes heureux de vous accueillir et avons hâte de voir votre communauté grandir.',

  'mail.waitlist.subject': 'Vous êtes sur la liste d’attente Drift Tennis',
  'mail.waitlist.greetingNamed':
    'Vous êtes sur la liste de Drift Tennis, {name}.',
  'mail.waitlist.greeting': 'Vous êtes sur la liste de Drift Tennis.',
  'mail.waitlist.body':
    'Nous vous enverrons les nouvelles du lancement ainsi que, de temps en temps, des actualités\nou offres Drift Tennis. Pour ne plus recevoir d’e-mails non essentiels, écrivez à serve@driftsports.app\navec « Unsubscribe » en objet.\nL’inscription et le jeu sont gratuits pendant notre lancement.\nAndroid d’abord, iOS ensuite.\n\nSi vous ne vous êtes pas inscrit, ignorez cet e-mail et contactez-nous si vous souhaitez\nque l’adresse soit supprimée.',

  // Daily tennis fact (Notification Centre only, no push)
  'tennisFact.notificationTitle': 'Votre ace du jour',

  'mail.support.subject':
    'Re : {subject} — nouvelle réponse du support Drift Tennis',
  'mail.support.lead': 'Le support a répondu à votre demande :',
  'mail.support.open':
    'Ouvrez l’application Drift Tennis pour poursuivre la conversation.',
};
