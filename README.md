# Apex Type Z — F1 2026 Minigame

A browser-based, pseudo-3D racing minigame inspired by the 2026 Formula 1 technical regulations. Race through a procedurally generated circuit over 3 laps, managing your ERS battery and switching between two aerodynamic modes to set the fastest time.

---

## Features

- **2D road projection renderer** — scanline horizon projection with depth scaling, curbs, and racing-line markings
- **Procedural circuit generation** — seeded LCG produces a fixed layout of straights, curves, chicanes, and hairpins
- **Dual aerodynamic modes (X / Z)** — switchable mid-race with distinct physics profiles for each mode
- **ERS energy system** — boost drains the battery; braking, coasting, and drifting regenerate it
- **Full physics simulation** — longitudinal speed, lateral forces, slip, drift state, off-track penalties, and wall bouncing
- **5 rival cars** — each with unique liveries and speeds, lateral sway, and collision detection
- **Cone obstacles** — clusters on long straights with collision speed penalties
- **Skid marks** — persistent skid layer rendered on a separate canvas, colour-coded by aero mode
- **Global leaderboard** — race times saved to Firebase Firestore with a localStorage fallback
- **Interactive tutorial** — 5-step condition-based tutorial on first run
- **Physics sandbox** — dedicated state for testing physics parameters
- **Camera effects** — speed-triggered shake, Mode Z braking zoom, lateral lookahead
- **Telemetry overlay** — in-game debug HUD with JSON/CSV export
- **Responsive canvas** — adapts to any viewport; supports keyboard, touch, and gyroscope steering

---

## Aero Modes

The core strategic mechanic, mirroring the 2026 F1 regulations:

|                    | **Mode X** — Low Drag            | **Mode Z** — High Downforce     |
| ------------------ | -------------------------------- | ------------------------------- |
| **Top speed**      | High (23 units/s)                | Lower (19 units/s)              |
| **Acceleration**   | Fast (0.25)                      | Slower (0.20)                   |
| **Lateral grip**   | Low (0.82) — spins in corners    | High (0.97) — stable at speed   |
| **Drag**           | 0.996 (less drag)                | 0.993 (more drag)               |
| **Best used on**   | Long straights (blue-tinted zones) | Curves, hairpins, chicanes    |
| **Badge colour**   | Blue (`#4870a8`)                 | Red (`#c00020`)                 |

Entering a hairpin in Mode X will cause the car to lose grip and spin out. Switching at the right moment is key to a fast lap.

---

## Controls

### Keyboard

| Key                | Action                               |
| ------------------ | ------------------------------------ |
| `↑` / `↑` (held)   | Accelerate / Boost (drains battery)  |
| `↓`                | Brake (regenerates battery)          |
| `←` / `→`          | Steer left / right                   |
| `A` / `D`          | Steer left / right (alternative)     |
| `S` / `W`          | Brake / Accelerate (alternative)     |
| `X` / `T`          | Toggle Aero Mode (X ↔ Z)             |
| `Space` / `Enter`  | Start / confirm                      |

### Touch (Mobile)

| Zone               | Action            |
| ------------------ | ----------------- |
| Tap left half      | Steer left        |
| Tap right half     | Steer right       |
| Tap bottom-center  | Toggle Aero Mode  |
| Hold upper area    | Boost             |

### Device Tilt (Gyroscope)

Tilt left/right to steer. A ±3° dead zone prevents drift; full steering authority at ±35°. On iOS, the browser will request motion permission on first interaction.

---

## HUD Elements

| Element              | Location       | Description                                                                          |
| -------------------- | -------------- | ------------------------------------------------------------------------------------ |
| **Speedometer**      | Bottom-right   | Current speed in km/h, parallelogram panel                                           |
| **Battery bar**      | Bottom-left    | ERS charge level; drains on boost, fills on brake / coast / drift                   |
| **Aero badge**       | Bottom-center  | Current mode (X = blue / Z = red); tap or press to toggle                           |
| **Lap panel**        | Top-right      | Current lap time and lap count (`X / 3`)                                             |
| **Curve indicator**  | Top-center     | Arrow showing the next corner's direction; white → orange → red by severity          |
| **Grip warning**     | On-screen      | Flashes when the car is approaching the traction limit                               |

---

## Getting Started

### Prerequisites

- A modern browser (Chrome, Firefox, Edge, Safari)
- [Node.js](https://nodejs.org/) — required for the Vite dev server; optional if using `http-server`

### Run locally (no build)

```bash
npx http-server -p 8080 -c-1
```

Open [http://localhost:8080](http://localhost:8080). No bundler or build step required for basic use — the project uses native ES modules loaded directly by the browser.

Alternatively, use the VS Code task **"Start local server"** included in the workspace.

### Run with Vite (dev server + HMR)

```bash
npm install
npm run dev
```

### Build for production

```bash
npm run build    # outputs to /dist
npm run preview  # preview the production build locally
```

### Environment variables

Create a `.env.local` file based on `.env.example`:

```
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
```

Without this key the ranking system gracefully falls back to `localStorage` only — the game is fully playable offline.

---

## Deployment

The project is automatically deployed to **GitHub Pages** on every push to `main` via `.github/workflows/deploy.yml`:

1. `npm run build` is executed with the `FIREBASEAPIKEY` GitHub secret injected.
2. The `dist/` folder is published to GitHub Pages.
3. **semantic-release** (`.releaserc.json`) bumps the version and creates a GitHub release based on [Conventional Commits](https://www.conventionalcommits.org/).

The Vite config defines two entry points: `index.html` (landing page) and `play/index.html` (the game).

---

## Project Structure

```
f1-2026-minigame/
├── index.html                  Landing page
├── play/
│   └── index.html              Game entry point
├── style.css                   Global styles (full-screen canvas)
├── vite.config.js              Vite config (two entry points, base URL)
├── .env.example                Environment variable reference
└── src/
    ├── main.js                 Bootstrap — creates Game instance
    ├── landing.js              Landing page JS
    ├── constants/              All tuning values (physics, rendering, UI, track gen)
    ├── core/
    │   ├── game.js             Main Game class (state machine, update loop, I/O wiring)
    │   └── game-loop.js        requestAnimationFrame wrapper
    ├── entities/
    │   ├── car.js              Car state and helpers (toggle, boost, brake)
    │   ├── track.js            Procedural track generation and sampling
    │   ├── rival-car.js        5 rival cars with liveries and staggered positions
    │   └── obstacle.js         Cone obstacle clusters
    ├── systems/
    │   ├── aero.js             Aero mode profiles (LowDragMode X, HighDownforceMode Z)
    │   ├── energy.js           ERS battery manager (boost drain, regen)
    │   ├── input.js            Keyboard / touch / gyroscope input controller
    │   ├── rival-physics.js    Rival car movement and lateral sway
    │   ├── tutorial-manager.js Tutorial step progression
    │   └── physics/
    │       ├── index.js        Physics orchestration
    │       ├── longitudinal.js Forward speed, boost, drag, off-track penalties
    │       ├── lateral.js      Lateral forces, slip, drift, wall bounce
    │       └── telemetry.js    Debug telemetry data extraction
    ├── rendering/
    │   ├── renderer.js         Top-level renderer (camera, zoom, shake, draw order)
    │   ├── track-renderer.js   2D road projection renderer
    │   ├── car-renderer.js     Car sprite, heading, boost trail
    │   ├── hud-renderer.js     HUD orchestration
    │   ├── screen-renderer.js  Start / preview / game-over / leaderboard screens
    │   ├── rival-renderer.js   Rival car rendering
    │   ├── obstacle-renderer.js Cone rendering
    │   ├── skid-layer.js       Persistent skid mark canvas layer
    │   └── hud/                Individual HUD widget renderers
    ├── menu/
    │   ├── StateManager.js     State machine (transition, update, render, pointer events)
    │   └── states/             Screen state classes (StartMenu, Race, GameOver, etc.)
    ├── ranking/
    │   ├── RankingService.js           Load, save, and sort leaderboard entries
    │   ├── HybridRankingRepository.js  Firebase-first with localStorage fallback
    │   ├── FirebaseRankingRepository.js Firebase Firestore CRUD
    │   └── LocalStorageRankingRepository.js localStorage CRUD
    ├── telemetry/
    │   └── telemetry-manager.js  In-game debug overlay and CSV/JSON export
    └── utils/
        ├── math.js             clamp, lerp, formatTime, seeded RNG
        ├── canvas.js           Responsive canvas sizing and font scale helpers
        └── platform.js         Mobile detection, iOS permission handling
```

---

## Physics Overview

The simulation uses a **track-local coordinate system**:

- **Z axis** — longitudinal progress along the track (0 → lap length, wraps on completion)
- **Lateral offset** — car's deviation from the track centreline (clamped to ±100 units)

Each frame:

1. Curve state and upcoming curvature are sampled from the track data
2. **Longitudinal**: speed is updated (acceleration, drag, boost drain, off-track penalty)
3. **Lateral**: centrifugal force is applied; steering input adjusts heading → lateral velocity; slip is calculated; drift state is evaluated
4. Boundary checks apply wall bounce or grass-surface drag cap
5. Car Z position advances; lap counter increments on wrap

Off-track severely limits top speed and triggers a dust particle timer. Drifting (slip between 0.18–0.65) rewards the player with ERS regen at 6.0/s.

---

## License

See [LICENSE](LICENSE).
