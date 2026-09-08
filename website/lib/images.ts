/**
 * The one place every photograph on the site is declared.
 *
 * Each slot fixes an aspect ratio and a focal point, so replacing a file is a
 * straight swap at the same ratio — no layout changes, no hunting through
 * components for a hard-coded width. Sources and licences live in
 * `public/images/CREDITS.md`.
 *
 * `focal` is passed to `object-position`: photographs get cropped hard at
 * narrow widths, and the default `center` drops the subject out of frame on
 * the overhead and aerial shots.
 */

export type SiteImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** `object-position` value — keeps the subject in frame when cropped. */
  focal: string;
};

/**
 * Alt text describes what the photo *shows*, not what the section argues.
 * These are decorative-adjacent editorial images; a screen-reader user gets
 * the section's real content from the heading and body copy beside them.
 */
export const images = {
  hero: {
    src: "/images/hero-court.jpg",
    alt: "A player meeting the ball on a sunlit hard court.",
    width: 2000,
    height: 1120,
    focal: "center 40%",
  },
  discover: {
    src: "/images/overhead-player.jpg",
    alt: "Overhead view of a player following through, long shadow across the baseline.",
    width: 2000,
    height: 3000,
    // The player sits left of centre and high in the frame; a centre crop
    // to 4:5 clips her at the edge.
    focal: "38% 42%",
  },
  compete: {
    src: "/images/player-portrait.jpg",
    alt: "A player stepping up to serve on a blue hard court.",
    width: 2000,
    height: 1333,
    focal: "center 45%",
  },
  improve: {
    src: "/images/match-action.jpg",
    alt: "Overhead view of a serve on a clay court in late afternoon light.",
    width: 2000,
    height: 1333,
    focal: "center 50%",
  },
  clubs: {
    src: "/images/club-aerial.jpg",
    alt: "Aerial view of a single tennis court surrounded by trees.",
    width: 2000,
    height: 2500,
    focal: "center 55%",
  },
  final: {
    src: "/images/ball-on-line.jpg",
    alt: "A tennis ball resting on the white line of a blue court.",
    width: 1336,
    height: 2000,
    focal: "center 60%",
  },
  waitlist: {
    src: "/images/blue-court-net.jpg",
    alt: "The net and service lines of an empty blue hard court.",
    width: 2000,
    height: 3000,
    focal: "center 50%",
  },
} as const satisfies Record<string, SiteImage>;
