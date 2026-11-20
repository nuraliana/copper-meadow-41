# Leonida Trophy Guide — GTA VI, all 55 trophies

[![make.fun](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/nuraliana/copper-meadow-41/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/nuraliana/copper-meadow-41/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

An offline web app that is the best guide and tracker for the 55 PlayStation 5
trophies of Grand Theft Auto VI. Static files only — open `app/index.html` in a
desktop browser and it works with the network off.

## What it does

- **Every trophy, official and cited** — all 55 names, descriptions and grades as
  PlayStation publishes them (1 platinum, 2 gold, 6 silver, 46 bronze; 28 hidden;
  0 online), each with a guide in our own words. Every one of the 134 guide steps
  carries its source numbers; 8 sources were read 20 Nov 2026.
- **Tracker** — a checklist saved in the browser (localStorage), with export to a
  JSON file and import back, plus count steppers for the 17 counted trophies
  (250 stunts, 42 shooting-range golds, 18 meditations, $250,000 laundered…).
- **Filters** — by kind (story, side lines, activities, collectibles, crime,
  mystery, money, 100% goal), by grade, by earned/unearned, and free-text search.
- **Spoiler setting** — hides the 12 story trophies' names and descriptions until
  they are earned (each can be revealed one by one).
- **Roadmap to the platinum** — seven stages (S1–S7) in play order, about 200
  hours at difficulty 4/10, one playthrough, with per-stage progress bars.
- **Missables, honestly flagged** — 1 possibly missable (Positive Mental Attitude,
  the Chapter 1 balcony meditation), 6 watch-list side lines, 3 unconfirmed
  methods and 3 cases where the guides disagree. Where a method is unknown, the
  guide says so instead of inventing one.

## Run it

```sh
node serve.ts        # then open http://localhost:8080
```

or open `app/index.html` directly. No build step, no network requests at run time.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` checks the trophy data is the full 55 with a guide each, copies `app/`
and `screenshots/` to the output directory, and writes `dossier.json`.

## Sources

PowerPyx (full guide, read in full), OutputLag, KeenGamer, eGamers, GTA-Zone,
HowToVideoGame, GTAScoop, and the official list as shipped in this bounty's kit
(agreeing with Exophase and PSNProfiles on all 55). Full list with per-trophy
citation counts is in the app under Sources & audit, and in
`app/data/trophies.json`.

Unofficial fan guide. Not affiliated with Rockstar Games, Sony or PlayStation.
No Rockstar logo, artwork or game screenshots are used.
