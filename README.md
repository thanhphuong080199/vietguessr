# VietGuessr

Can you guess where in Vietnam you are? A location-guessing game using real
street-level imagery from Mapillary. Drop a pin, score points, explore the
country — free to run, no credit card needed.

**🎮 Live demo: <https://vietguessr.vercel.app/>**

## How it works

1. A random Vietnam panorama loads — look around with mouse/touch.
2. Click the map to drop your guess pin, then press **Đoán!** (Guess).
3. The true location is revealed with a line to your guess, plus a
   distance-based score (max 5,000 per round).
4. Press **Chơi lại** (Play again) for a new image.

## Tech stack

- **Vite + React + TypeScript**
- **mapillary-js** — 360° / street panorama viewer
- **maplibre-gl** + **OpenFreeMap** — the guess map (no API key)
- **@turf/turf** — distance between guess and truth
- **zustand** — game state
- **tailwindcss** + **lucide-react** — UI
- **Vitest** — tests

## Prerequisites

- **Node.js 18+** and npm
- A **free Mapillary access token** (no credit card):
  1. Sign up at <https://www.mapillary.com>
  2. Open the developer dashboard:
     <https://www.mapillary.com/dashboard/developers>
  3. Create an app / token and copy the value (looks like `MLY|...|...`)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your env file and add your Mapillary token
cp .env.example .env
#   then edit .env and set:
#   VITE_MAPILLARY_TOKEN=MLY|xxxxxxxx|xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 3. Build the curated image pool (queries Mapillary across Vietnam)
npm run build-pool
```

`npm run build-pool` writes `src/data/pool.national.json`. It reads the same
`VITE_MAPILLARY_TOKEN` from `.env`. Run it once (re-run anytime to refresh the
pool). Without a populated pool the app shows a "no images yet" message.

## Run

```bash
# Start the dev server (default http://localhost:5173)
npm run dev
```

Other scripts:

```bash
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build locally
npm run test       # run the Vitest suite
npm run build-pool # (re)generate the curated image pool
```

## Project structure

```
scripts/build-pool.ts          # offline pool generator (needs token)
src/
  App.tsx                      # game layout + wiring
  types.ts                     # shared types
  config/{regions,scoring}.ts  # Vietnam bounds + scoring formula
  data/pool.national.json      # curated images (generated)
  store/gameStore.ts           # zustand round state machine
  components/                  # PanoramaViewer, GuessMap, RoundHud, ResultView
```

## Notes

- The map uses **OpenFreeMap** tiles, so no MapTiler/Mapbox key is required.
- `.env` is gitignored — never commit your token.
- Scoring: `score = round(5000 · e^(−distance_km / 300))`, capped at 5,000
  (tunable in `src/config/scoring.ts`).
