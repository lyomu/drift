# Image credits

Every image on the public website is self-hosted from this folder. Nothing is
hotlinked — `next.config.ts` sets `img-src 'self' data: blob:`, so an external
CDN would be blocked with no visible error.

## From the Drift Tennis app

Already licensed for the product; reused here from
`mobile/assets/images/onboarding/`.

| File | Source | Used on |
|---|---|---|
| `hero-court.jpg` | `intro_advance_your_game.jpg` | Landing hero |
| `ball-on-line.jpg` | `intro_tennis_journey.jpg` | "The final" waitlist CTA band |

## From Unsplash

Licensed under the [Unsplash License](https://unsplash.com/license): free to
use commercially, no permission needed. Attribution is not required but is
recorded here as good practice.

| File | Photographer | Photo page | Source URL |
|---|---|---|---|
| `overhead-player.jpg` | Renith R | [woman-playing-tennis-on-court-from-above-A9VpotrPr1k](https://unsplash.com/photos/woman-playing-tennis-on-court-from-above-A9VpotrPr1k) | `photo-1545151414-8a948e1ea54f` |
| `player-portrait.jpg` | *not recorded* | [woman-holding-tennis-ball-and-racket-MLU_X1d3ofQ](https://unsplash.com/photos/woman-holding-tennis-ball-and-racket-MLU_X1d3ofQ) | `photo-1545809074-59472b3f5ecc` |
| `match-action.jpg` | Moises Alex | [man-playing-tennis-WqI-PbYugn4](https://unsplash.com/photos/man-playing-tennis-WqI-PbYugn4) | `photo-1554068865-24cecd4e34b8` |
| `club-aerial.jpg` | Ryan Searle | [aerial-photo-of-tennis-court-surrounded-with-trees-qjrjJnFypa0](https://unsplash.com/photos/aerial-photo-of-tennis-court-surrounded-with-trees-qjrjJnFypa0) | `photo-1499510318569-1a3d67dc3976` |
| `blue-court-net.jpg` | C Cai | [tennis-net-on-blue-court-mwoRv-RSPHw](https://unsplash.com/photos/tennis-net-on-blue-court-mwoRv-RSPHw) | `photo-1699117686612-ece525e4f91a` |

All were fetched at `?w=2000&q=80&fm=jpg&fit=max`.

Note: the app's own `intro_game_never_stops.jpg` turned out to be a portrait
crop of `photo-1554068865-24cecd4e34b8` — the same frame as `match-action.jpg`.
Only the landscape version is kept here, so the page never shows one photo
twice.

## Replacing these

`lib/images.ts` is the single manifest: every slot declares its `src`, `alt`,
aspect ratio and focal point. Swapping in your own photography is a file
replace at the same aspect ratio plus an `alt` update — no layout changes.
Update this table at the same time.
