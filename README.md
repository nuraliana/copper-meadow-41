# Leonida Platinum — GTA VI Trophy Guide & Tracker

[![make.fun](https://make.fun/badge.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![make.fun rank](https://make.fun/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![make.fun reward](https://make.fun/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

An offline web app that guides and tracks all **55 PlayStation 5 trophies** of
Grand Theft Auto VI: 1 platinum, 2 gold, 6 silver, 46 bronze — 28 of them hidden
until earned, none of them online.

## What it does

- **Checklist tracker** — tick trophies off as you earn them; progress is saved
  in the browser (localStorage) and survives reloads, with **export to JSON**
  and **import** back, so a backup is one click away.
- **Filters that actually help** — by kind (story, completion, activities, side,
  collectibles, crime, mystery, money), by grade, by earned/unearned, plus a
  search box that reads names, descriptions and guide text.
- **Spoiler setting** — story trophies stay hidden (name and description) until
  you earn them. Turn it off any time to see the full list.
- **Roadmap to the platinum** — seven stages in order, from the story run to the
  money cleanup, each naming the trophies it unlocks.
- **Missables page** — one trophy is possibly missable (the Chapter 1 balcony
  meditation in Positive Mental Attitude) and six more are flagged watch, with
  the setup each one needs.
- **A guide for every trophy, in our own words** — each with numbered steps and
  the source of every step named beside it. Where sources disagree, or only one
  source covers a trophy, the guide says so instead of pretending certainty.
- **Counters** — 17 trophies with a tracked number (stunts, gold medals, drone
  races, meditation spots, vehicles and more) get a stepper; hitting the target
  ticks the trophy earned automatically.

## Try it

```sh
node serve.ts
```

Then open http://localhost:8080. Add `?demo=1` to preview the guide with 11
trophies earned and several counters part way. The app is plain static files
under `app/` — no build step, no network request at run time.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` validates the 55 trophies (each with a non-blank guide and sourced
steps), copies `app/` and `screenshots/` to the output folder, and writes
`dossier.json` with the vendored make.fun library.

## Sources

Names, descriptions and grades are PlayStation's official list. Guide steps cite
PowerPyx, OutputLag, KeenGamer, eGamers, GTA-Zone, HowToVideoGame, GTAScoop,
and the official list itself — cited, never copied. No Rockstar logo or official
artwork is used anywhere in this guide.

## License

MIT — see `LICENSE`.
