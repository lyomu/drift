# Features

One folder per feature module, added starting in Phase M3 (Authentication & Adaptive Onboarding). See `foundation/07-mvp-roadmap.md` §5 for build order — each phase gets its own folder here (`auth/`, `onboarding/`, `home/`, `players/`, `matches/`, `competitions/`, `courts/`, `learning/`, `news/`, ...).

Each feature folder should separate `data/` (models, repositories), `application/` (state/controllers), and `presentation/` (screens, widgets) rather than mixing state logic into widget files — this is what "logic before UI" means in practice per feature.
