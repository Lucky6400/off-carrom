# Off Carrom

A landscape-only arcade carrom game built on the Off Pool engine: Vite + TypeScript, Canvas 2D (everything drawn in code, no image assets), a pure-TS carrom physics engine,
synthesised WebAudio, Capacitor for Android / iOS. Wooden theme.

## Run
```bash
npm install
npm run dev      # http://localhost:5178
npm run build    # typecheck + production build in dist/
npm run sim      # headless AI vs AI games for every rule set (npm run sim classic 5)
```

## Controls
- **Left arrows** (or A / D): slide the striker along your baseline. You can also drag the striker.
- **Right arrows** (or the arrow keys): turn the aim. Drag anywhere on the board to aim too (tap = aim at that point).
- **Power bar** (drag, or Up / Down), then the big striker button (Space / Enter) flicks. The bolt opens the power-up tray.

## Games
Career: 10 venues, each with a boss and four games: **Classic** (whites vs blacks, cover the queen), **Freestyle** (any coin, first to 100) and **B&W Duel** (7 each, no queen, shot clock),
plus one saved random special: Rapid Fire, Knockout, Queen's Gambit, Target Practice, Bank Shots, Sprint or Combo Chain. Quick Match, Tournament, Shop, Tutorial and Profile as in Off Pool.

## Code map
```
src/game/   physics.ts (carrom sim)  rules.ts (10 rule sets + racks)  ai.ts  match.ts  finish.ts
src/gfx/    board (wooden board)  coins (coins + strikers)  gearfx  halls (venue art)  portrait  ui  hud  cards
src/data/   locations modes characters items
src/scenes/ play (the match) career quick tournament shop options loading result title
```
AdMob currently uses Google test units; create Off Carrom units before a Play release.
