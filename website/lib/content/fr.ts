import type { Dictionary } from "./types";

/**
 * Traduction française. Même forme que `en.ts` ; toute clé manquante ou en
 * trop casse la compilation. Même règle éditoriale : pas de tiret cadratin
 * dans le texte rendu, et aucune promesse que le produit ne tient pas.
 */
export const fr: Dictionary = {
  locale: "fr",
  meta: {
    title: "Drift Tennis · Trouvez votre match. Jouez votre saison.",
    description:
      "Drift Tennis transforme « je devrais jouer plus souvent au tennis » en un vrai match, un vrai plan de progression et une vraie communauté : des adversaires à votre niveau, des résultats vérifiés, de vraies ligues et une cote fiable. Le tennis mène, le padel suit le même chemin. Gratuit pendant le lancement.",
  },
  header: {
    sectionsAria: "Sections",
    padel: "Padel",
    forClubs: "Pour les clubs",
    legal: "Légal",
    joinCta: "Rejoindre la liste d'attente",
    backToSite: "← Retour au site",
  },
  hero: {
    quotePrefix: "« Je devrais jouer plus souvent au ",
    wordTennis: "tennis.",
    wordPadel: "padel.",
    quoteSuffix: " »",
    strikeAria: "Je devrais jouer plus souvent au tennis ou au padel.",
    resolve: "Vous avez un match samedi.",
    body: "Conçu pour les sports de raquette, Drift Tennis vous trouve des adversaires à votre niveau, planifie le match, enregistre le résultat confirmé par les deux joueurs, et transforme votre saison en une cote fiable. Le tennis mène, le padel suit le même chemin, et les deux vivent dans une seule application, plutôt que sur un site de réservation, trois groupes WhatsApp et un classement sur tableur.",
    ctaPrimary: "Rejoindre la liste d'attente",
    ctaSecondary: "Comment fonctionne une saison ↓",
    freeNote: "Gratuit pendant que nous démarrons. Android d'abord, iOS ensuite.",
  },
  loopStrip: {
    heading: "Une boucle, cinq étapes, et vous y revenez chaque semaine",
    stages: [
      { name: "Découvrir", line: "Trouvez votre niveau et qui affronter." },
      { name: "Jouer", line: "Concrétisez : une vraie rencontre." },
      { name: "Compétition", line: "Saisons, classements, une cote." },
      { name: "Progresser", line: "Sachez quoi travailler ensuite." },
      { name: "Connecter", line: "Restez dans votre communauté tennis." },
    ],
  },
  chapters: [
    {
      id: "discover",
      numeral: "1",
      title: "Découvrir",
      stages: ["Découvrir"],
      tagline: "Trouvez votre niveau. Trouvez vos partenaires.",
      intro:
        "Une évaluation courte et honnête vous place sur une échelle de 1,0 à 7,0. La découverte reste ensuite sûre pour les débutants : on ne vous présente que des joueurs avec qui vous pouvez vraiment échanger des balles.",
      items: [
        {
          title: "Évaluation adaptative",
          body: "Treize questions estiment votre niveau et votre profil de compétences. Pas d'accord avec le résultat ? Ajustez-le. L'application vous reçoit là où vous en êtes.",
          badge: { text: "À l'inscription", tone: "badge-primary" },
        },
        {
          title: "Découverte de joueurs",
          body: "Filtrez les joueurs par niveau, distance, format et disponibilité. Les positions exactes et les coordonnées ne quittent jamais le serveur. La distance s'affiche en bandes approximatives, comme « à environ 3 km ».",
          badge: { text: "Vie privée d'abord", tone: "badge-success" },
        },
        {
          title: "Courts et clubs à proximité",
          body: "Surface, intérieur ou extérieur, éclairage, type de réservation, et des champs honnêtement vides quand un lieu n'a pas été vérifié, jamais un numéro inventé.",
          badge: { text: "Recherche de courts", tone: "badge-primary" },
        },
      ],
    },
    {
      id: "compete",
      numeral: "2",
      title: "Jouer & Compétition",
      stages: ["Jouer", "Compétition"],
      tagline: "De « on joue un match ? » à la rencontre planifiée.",
      intro:
        "La planification est structurée, pas un dédale de messagerie. Proposez des horaires, contre-proposez, convenez d'un court. Le match ne quitte l'état PROPOSÉ que lorsque tout le monde y est vraiment.",
      items: [
        {
          title: "Défis structurés",
          body: "Défiez un joueur connecté, proposez des horaires, suggérez un court, contre-proposez jusqu'à trois tours. L'application vous renvoie ensuite à la conversation, pas à une semaine d'allers-retours.",
          badge: { text: "Propositions d'horaires", tone: "badge-primary" },
        },
        {
          title: "Le double, correctement",
          body: "Vous nommez votre partenaire à l'avance, votre adversaire désigne le sien en acceptant. Le match devient réel lorsque les quatre joueurs ont accepté.",
          badge: { text: "Flux à quatre joueurs", tone: "badge-primary" },
        },
        {
          title: "Des résultats dignes de confiance",
          body: "Un joueur saisit le score, l'autre confirme ou conteste. Les deux versions sont conservées jusqu'à ce qu'elles concordent : les classements restent propres, sans dispute.",
          badge: { text: "Confirmer ou contester", tone: "badge-success" },
        },
      ],
      coda: {
        name: "Compétition",
        tagline: "Des classements qui ont du sens.",
        intro:
          "De vraies ligues : fenêtres d'inscription, listes d'attente, appariement automatique en round-robin, rencontres et instantanés de classement qui gardent votre évolution semaine après semaine.",
        items: [
          {
            title: "Des ligues avec de vraies saisons",
            body: "Inscrivez-vous (ou mettez-vous en file d'attente), recevez vos rencontres à l'ouverture de la journée, jouez-les avec le même flux de planification et de résultats que n'importe quel match.",
            badge: { text: "Saisons & journées", tone: "badge-primary" },
          },
          {
            title: "Une cote fiable",
            body: "Un moteur de type Elo sur la même échelle de 1,0 à 7,0 que votre profil, pour que chaque chiffre de l'application soit une unité comparable. Forfaits et abandons gérés par la règle, pas par l'argument.",
            badge: { text: "1.0 – 7.0", tone: "badge-primary" },
          },
          {
            title: "Des classements avec historique",
            body: "Des instantanés de classement à chaque fin de journée, pour que la flèche d'évolution à côté de votre nom soit méritée, pas décorative.",
            badge: { text: "Flèches d'évolution", tone: "badge-success" },
          },
        ],
      },
    },
    {
      id: "improve",
      numeral: "3",
      title: "Progresser & Connecter",
      stages: ["Progresser", "Connecter"],
      tagline: "Sachez quoi travailler mardi.",
      intro:
        "Votre cote dit comment vous compétissez ; votre profil de compétences dit pourquoi. Drift garde les deux et oriente votre entraînement vers le plus faible.",
      items: [
        {
          title: "Un vrai profil de compétences",
          body: "Service, coup droit, revers, retour, volée, déplacements et jeu en match, combinés à partir de votre évaluation initiale et de vos entraînements enregistrés, jamais une devinette déguisée en pourcentage.",
          badge: { text: "Sept piliers", tone: "badge-primary" },
        },
        {
          title: "Leçons, exercices, programmes",
          body: "Des recommandations adaptées à votre niveau et à votre compétence la plus faible, plus des programmes d'entraînement qui les ordonnent en quelque chose de réellement suivable.",
          badge: { text: "Centre d'apprentissage", tone: "badge-primary" },
        },
        {
          title: "Des objectifs honnêtes",
          body: "Fixez une cible, recevez des jalons, et un statut qui compare votre rythme réel au plan : EN BONNE VOIE ou EN RETARD, pas une tape amicale sur l'épaule.",
          badge: { text: "Jalons", tone: "badge-success" },
        },
      ],
      coda: {
        name: "Connecter",
        tagline: "Votre vie tennis, au même endroit.",
        intro:
          "Connexions, messages, annonces de club et actualité tennis, avec le canal officiel séparé du bruit des discussions de groupe.",
        items: [
          {
            title: "Une messagerie qui garde le contexte",
            body: "Chaque match a son propre fil, et chaque changement d'état (proposé, accepté, contesté) y arrive comme message système que vous pouvez retrouver en remontant.",
            badge: { text: "Fils de match", tone: "badge-primary" },
          },
          {
            title: "Clubs et annonces",
            body: "Suivez le fil de votre club et gardez les annonces officielles séparées des discussions informelles, pour que « il pleut » n'écrase pas « la journée commence lundi ».",
            badge: { text: "Fil du club", tone: "badge-primary" },
          },
          {
            title: "Actualité tennis, classée",
            body: "Pro, joueurs, tournois, local, Afrique, clubs et communauté, résumée et attribuée, avec un lien vers l'article original.",
            badge: { text: "Fil d'actualité", tone: "badge-neutral" },
          },
        ],
      },
    },
  ],
  padel: {
    eyebrow: "Second sport · Mes sports",
    title: "Le padel, un vrai second sport",
    body: "Ajoutez le padel depuis votre profil : il suit le même chemin que votre tennis, avec sa propre évaluation, sa propre cote et son propre historique de matchs, totalement séparés de votre dossier tennis. Le tennis mène ici et garde le nom ; le padel n'est pas un faire-valoir.",
    points: [
      "Une évaluation et une cote padel propres, indépendantes de votre niveau tennis",
      "Des ligues et ladders de padel, créés par les clubs comme ceux de tennis",
      "Courts, clubs, entraîneurs et leçons étiquetés par sport, pour que rien ne se mélange",
      "Un profil, deux dossiers, et vous n'activez le second que si vous le voulez",
    ],
  },
  standings: {
    badge: "Match terminé",
    title: "Votre saison, d'un coup d'œil",
    bullets: [
      "· Rencontres automatiques en round-robin à chaque saison",
      "· Résultats confirmés par l'adversaire, contestations gardées jusqu'à résolution",
      "· Instantanés de classement avec évolution semaine après semaine",
    ],
    cardTitle: "Ligue du samedi · Classement",
    cardBadge: "Après la journée 6",
    columns: ["#", "Joueur", "J", "V", "D", "Niveau", "Forme"],
    note: "Données illustratives. Voici à quoi ressemble un tableau de classement en direct dans l'application.",
  },
  clubs: {
    badge: "Pour les clubs et académies",
    title: "Gérez votre club sans le tableur",
    body: "Les administrateurs de club ont leur propre console : créez des ligues et des saisons, laissez Drift générer les rencontres, réglez les contestations depuis une vraie file, gardez membres et annonces au même endroit, et gardez vos courts visibles pour chaque joueur à proximité.",
    points: [
      "Gestion des ligues, saisons, rencontres et contestations",
      "Membres, rôles, invitations et modération",
      "Listage et vérification des courts",
      "Abonnements de club facturés en KES via IntaSend",
    ],
    cta: "Parlez-nous",
  },
  final: {
    badge: "La finale",
    title: "Votre saison commence par un match",
    body: "Inscrivez-vous, passez l'évaluation, et Drift fait le reste : des adversaires à votre niveau, la rencontre dans votre calendrier, et une cote qui ne bouge que lorsque les résultats sont confirmés.",
    cta: "Rejoindre la liste d'attente",
    note: "Gratuit pendant que nous démarrons. Android d'abord, iOS ensuite. Les stores ne sont pas encore en ligne ; la liste d'attente est la façon d'être prévenu en premier.",
  },
  appScreens: {
    illustrative: "Écrans d'application illustratifs, pas de vraies données de joueurs.",
    fixture: {
      badge: "À suivre · Journée 3",
      format: "Double",
      rating: "Niveau",
      date: "Sam · 16:00",
      accepted: "✓ Horaire accepté",
      footnote: "Court de club suggéré · 2 propositions sur 3 réglées",
    },
    challenge: {
      badge: "Défi entrant",
      line: "{name} vous défie",
      proposed: "Proposé : dim 10:00 ou 17:00",
      accept: "Accepter",
      proposeTime: "Proposer un horaire",
    },
    skill: {
      title: "Profil de compétences",
      ratingBadge: "Niveau 3.5",
      pillars: {
        serve: "Service",
        forehand: "Coup droit",
        backhand: "Revers",
        return: "Retour",
        net: "Volée",
        movement: "Déplacements",
        matchPlay: "Jeu en match",
      },
      practiseTitle: "À travailler ensuite : le revers",
      practiseBody: "3 exercices adaptés à votre niveau",
    },
  },
  footer: {
    tagline: "Trouvez votre match. Jouez votre saison.",
    product: "Produit",
    legal: "Légal",
    contact: "Contact",
    theLoop: "La boucle",
    forClubs: "Pour les clubs",
    join: "Rejoindre la liste d'attente",
    productAria: "Liens produit du pied de page",
    legalAria: "Liens légaux du pied de page",
    copyright: "Copyright {year} Drift Tennis. Propriétaire.",
  },
  waitlist: {
    eyebrow: "Avant la première mise en jeu",
    title: "Soyez là pour la première journée",
    body: "Drift Tennis sort d'abord sur Android, iOS suivra, et c'est gratuit de rejoindre et de jouer pendant que nous démarrons. Le tennis mène, le padel est là aussi. Laissez votre nom et votre adresse e-mail et nous enverrons les nouvelles de lancement, les mises à jour produit internes et l'occasionnelle offre Drift Tennis. Vous pouvez vous désabonner des e-mails non essentiels quand vous voulez.",
    note: "Nous ne vendons ni ne partageons votre adresse e-mail pour le marketing d'une autre entreprise.",
    audiences: [
      { value: "PLAYER", label: "Un joueur", hint: "Je veux jouer plus au tennis ou au padel" },
      { value: "CLUB", label: "Un club ou un entraîneur", hint: "J'organise des compétitions ou j'enseigne" },
    ],
    levels: [
      { value: "", label: "Je préfère ne pas le dire" },
      { value: "1.0-2.0", label: "Débutant (1.0 – 2.0)" },
      { value: "2.5-3.5", label: "En progression (2.5 – 3.5)" },
      { value: "4.0-5.0", label: "Joueur de club solide (4.0 – 5.0)" },
      { value: "5.5-7.0", label: "Compétitif (5.5 – 7.0)" },
      { value: "unsure", label: "Pas encore sûr" },
    ],
    success: {
      title: "Vous êtes sur la liste.",
      personalTitle: "Vous êtes sur la liste, {name}.",
      body: "Nous enverrons d'abord les nouvelles de lancement, puis des mises à jour produit internes et des offres occasionnelles. Vous pouvez vous désabonner des e-mails non essentiels à tout moment.",
    },
    form: {
      firstName: "Prénom",
      firstNamePlaceholder: "Sarah",
      email: "Adresse e-mail",
      legend: "Je suis…",
      country: "Pays",
      optional: "(facultatif)",
      selectCountry: "Choisissez un pays",
      city: "Ville",
      cityPlaceholder: "Votre ville",
      level: "Niveau",
      errorFirstName: "Dites-nous votre prénom pour savoir comment vous appeler.",
      errorEmail: "Entrez une adresse e-mail où nous pouvons vous joindre.",
      errorGeneric: "Cela n'est pas passé.",
      submitting: "Ajout en cours…",
      submit: "Rejoindre la liste d'attente",
      badge: "Sur la liste",
      privacyLink: "Politique de confidentialité",
    },
  },
};
