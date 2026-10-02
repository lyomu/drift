# components/v2 — landing page redesign

Everything the redesigned landing page is built from lives here, and nothing
outside this folder is edited for it. The current site keeps running from
`components/` at `/`; this tree renders at `/preview`
(`app/[locale]/preview/page.tsx`) until it is signed off.

Rules while both exist:

- **No cross-imports from `components/` into here.** Copy what you need, so
  changing a v2 component can never alter the live page. `lib/` is shared and
  read-only from here: content dictionaries, images, SEO and locale helpers.
- **Copy still comes from `lib/content/{en,fr,es}.ts`.** New sections mean new
  keys in `lib/content/types.ts` and all three dictionaries, because a missing
  key fails the build. Keys the old page uses stay until it is deleted.
- **The house voice rules still apply** (DESIGN.md): nothing claimed that the
  product does not do, no testimonials or counts, no scarcity, no em dashes.

Shipping it: this folder's contents move to `components/`, the preview route's
page becomes `app/[locale]/page.tsx`, the old components and the `/preview`
disallow in `app/robots.ts` are deleted, and DESIGN.md is rewritten to describe
what actually shipped.
