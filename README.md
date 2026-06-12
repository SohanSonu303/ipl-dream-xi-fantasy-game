# 🏏 IPL Dream XI · Draft Simulator

A premium, broadcast-styled browser game: roll random IPL franchises, draft an
eleven-player Dream XI, then simulate a full season — league stage, playoffs and
a shot at the trophy. Built with React + TypeScript + Vite.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
npm run preview  # preview the production build
```

## Game flow

`Home → Start Draft → Roll Team → Pick Player → Place in XI → (repeat ×11)
→ Simulate Season → League Table → Playoffs → Champion → Results → Share / Play Again`

- **Draft** — the first team auto-rolls. Each roll reveals a **random pack of 3
  players** (the rest of the franchise is hidden), so you can't always grab the
  top star — that randomness keeps your XI from becoming overpowered. Tap a card
  to draft, then choose a squad slot. Roll the next team for each pick.
- **Rerolls** — 1 per game. A reroll discards the current team/pack for a fresh draw.
- **No duplicates** — a drafted player never reappears in any pack.
- **Live strength** — batting / bowling / fantasy meters and a Team Power ring
  update as you build.

## Tech

React 18, TypeScript, Vite, TailwindCSS, Zustand (state), Framer Motion
(animation), React Router (HashRouter), TanStack Query (data access).

```
src/
  data/        players.json (source of truth), teams.ts, outcomes.ts, usePlayers.ts
  engine/      draftEngine · teamStrengthEngine · matchEngine · seasonEngine · playoffEngine
  store/       gameStore.ts (Zustand)
  components/  Shared · Draft · Squad · Simulation · Results
  pages/       Home · Draft · Simulation · Results
  types/       domain types
  utils/       rng + formatting helpers
```

## Ratings & balancing

All player ratings come **only** from `src/data/players.json` (the IPL 2026
top-100 set). The engine never invents or scrapes ratings.

- **Batting / Bowling / Overall strength** = average of the respective rating
  across the XI.
- **Fantasy strength** = average `fantasyWeight × 100`.
- **Base Power** = `overall·0.50 + batting·0.20 + bowling·0.20 + fantasy·0.10`.
- **Team Power** = `Base Power + fair-play composition modifier` (0–100).

### Fair-play composition rules (`src/engine/compositionEngine.ts`)

Strength is an **average**, so squad size never inflates it — every franchise
holds exactly 10 players and lands in a 69.7–76.3 power band, while a curated
user XI typically beats that. The lever that actually matters is **balance**, so
the same composition rules score the user's XI and every franchise identically:

| Rule | Requirement | Penalty if missing |
|------|-------------|--------------------|
| Wicket-keeper | ≥ 1 `WICKET_KEEPER` | −8 |
| Bowling attack | ≥ 5 bowling options (`BOWLER` + `ALL_ROUNDER`, to cover 20 overs) | −3 each short |
| Batting depth | ≥ 6 who bat (`BATTER` + `WICKET_KEEPER` + `ALL_ROUNDER`) | −2.5 each short |
| Specialist batter | ≥ 1 `BATTER` | −3 |

A complete side keeps full power; a broken one is penalised (capped at −18).
Net effect (Monte-Carlo verified): a balanced XI ≈ 69% league win rate, a
"top-11-by-rating" side that ignores bowling ≈ 31%, and 11 batters with no
keeper/bowlers ≈ 6%.

> **Spin vs pace** is *not* in the dataset (roles are only BATTER / BOWLER /
> ALL_ROUNDER / WICKET_KEEPER), so the engine judges bowling **depth** rather
> than inventing a spin/pace split. Franchises are always evaluated at full
> real strength (drafted stars are not removed from their club) — you're proving
> your XI can beat the actual IPL teams.

## Design decisions where the spec was open-ended

A few spec lines were interpreted to produce believable, fun results — noted
here for transparency:

1. **Team Power & match/net formulas** are written in the brief with `*`
   between weighted terms. Pure multiplication can't yield the stated 0–100
   range (and an additive ±12 swing that can go negative would erase the power
   advantage). They're implemented as **weighted sums / additive variance**,
   which is the only reading that matches the described behaviour
   (`matchScore = teamPower + random(-12, +12)`).
2. **League shape** — the user's Dream XI joins all **10 franchises → an
   11-team league**, and every team plays exactly **18 matches** via a balanced
   multi-round schedule (validated: each team = 18, 99 total fixtures). Franchise
   strength is computed from each club's real dataset squad.
3. **Net rating** is the aggregate score differential per match (a believable
   NRR proxy) used to break ties on equal points.

## Outcomes

`Champion · Runner-Up · Qualifier 2 Exit · Eliminator Exit · Failed To Qualify`
— every playoff path resolves to exactly one. **Share Result** renders the team
card to a 1080×1350 PNG (`src/utils/shareImage.ts`, Canvas 2D) and copies it to
the clipboard as an image; where that isn't supported it falls back to the native
share sheet (mobile) or a download. Every run differs: random rolls, draft
choices, reroll usage and match variance.
