/**
 * The shape every locale's copy must fill. Defined with widened string types
 * (not `typeof en`) so a translation can never be forced to match English
 * strings character-for-character, while a missing key still fails the build.
 *
 * House voice rules apply to every locale: no em dashes (U+2014) in rendered
 * copy, and nothing is claimed that the shipped product does not do.
 */
export type Item = {
  title: string;
  body: string;
  badge: { text: string; tone: string };
};

export type Coda = {
  name: string;
  tagline: string;
  intro: string;
  items: Item[];
};

export type Chapter = {
  /** Stable section anchor and header link target — never translated. */
  id: string;
  /** Oversized ordinal shown behind the heading, e.g. "1". */
  numeral: string;
  title: string;
  /** Loop stage names this chapter covers, in order. */
  stages: string[];
  tagline: string;
  intro: string;
  items: Item[];
  coda?: Coda;
};

export type WaitlistOption = { value: string; label: string; hint?: string };

export type WaitlistFormCopy = {
  firstName: string;
  firstNamePlaceholder: string;
  email: string;
  legend: string;
  country: string;
  optional: string;
  selectCountry: string;
  city: string;
  cityPlaceholder: string;
  level: string;
  errorFirstName: string;
  errorEmail: string;
  errorGeneric: string;
  submitting: string;
  submit: string;
  badge: string;
  privacyLink: string;
};

export type Dictionary = {
  locale: string;
  meta: { title: string; description: string };
  header: {
    sectionsAria: string;
    padel: string;
    forClubs: string;
    legal: string;
    joinCta: string;
    backToSite: string;
  };
  hero: {
    quotePrefix: string;
    wordTennis: string;
    wordPadel: string;
    quoteSuffix: string;
    strikeAria: string;
    resolve: string;
    body: string;
    ctaPrimary: string;
    ctaSecondary: string;
    freeNote: string;
  };
  loopStrip: {
    heading: string;
    stages: { name: string; line: string }[];
  };
  chapters: Chapter[];
  padel: {
    eyebrow: string;
    title: string;
    body: string;
    points: string[];
  };
  standings: {
    badge: string;
    title: string;
    bullets: string[];
    cardTitle: string;
    cardBadge: string;
    columns: string[];
    note: string;
  };
  clubs: {
    badge: string;
    title: string;
    body: string;
    points: string[];
    cta: string;
  };
  final: {
    badge: string;
    title: string;
    body: string;
    cta: string;
    note: string;
  };
  appScreens: {
    illustrative: string;
    fixture: {
      badge: string;
      format: string;
      rating: string;
      date: string;
      accepted: string;
      footnote: string;
    };
    challenge: {
      badge: string;
      line: string;
      proposed: string;
      accept: string;
      proposeTime: string;
    };
    skill: {
      title: string;
      ratingBadge: string;
      pillars: {
        serve: string;
        forehand: string;
        backhand: string;
        return: string;
        net: string;
        movement: string;
        matchPlay: string;
      };
      practiseTitle: string;
      practiseBody: string;
    };
  };
  footer: {
    tagline: string;
    product: string;
    legal: string;
    contact: string;
    theLoop: string;
    forClubs: string;
    join: string;
    productAria: string;
    legalAria: string;
    copyright: string;
  };
  waitlist: {
    eyebrow: string;
    title: string;
    body: string;
    /** ~150-character search-result description; `body` is too long for it. */
    metaDescription: string;
    note: string;
    audiences: WaitlistOption[];
    levels: WaitlistOption[];
    success: { title: string; personalTitle: string; body: string };
    form: WaitlistFormCopy;
  };
};
