# F1 2026 Minigame

A browser-based F1-inspired racing minigame built with vanilla JavaScript and the Canvas API. Race through a procedurally generated circuit, manage your ERS battery, and master the dual aerodynamic modes inspired by the 2026 Formula 1 technical regulations.

---

## Screenshots

...

---

## Features

- **Pseudo-3D track renderer** — horizon-projected road with depth scaling, curbs, and racing-line markings
- **Procedural circuit generation** — seeded RNG produces a unique layout of straights, curves, chicanes, and hairpins every run
- **Dual aerodynamic modes (X / Z)** — switchable mid-race with dedicated physics for each mode
- **ERS energy system** — boost costs battery; braking and coasting regenerate it
- **Physics simulation** — longitudinal speed, lateral velocity, slip, off-track penalties, and wall bouncing
- **Lookahead HUD** — real-time curve-direction indicator that changes colour by corner severity
- **Responsive canvas** — adapts to any viewport; supports keyboard, touch, and device-tilt steering
- **3-lap race format** with lap timer

---

## Aero Modes

The core strategic mechanic of the game, mirroring the 2026 F1 regulations:

|                    | **Mode X** — Low Drag               | **Mode Z** — High Downforce |
| ------------------ | ----------------------------------- | --------------------------- |
| **Top speed**      | High                                | Lower                       |
| **Cornering grip** | Low — spins out in hard corners     | High — safe at full speed   |
| **Acceleration**   | Fast                                | Slower                      |
| **Best used on**   | Long straights (blue asphalt zones) | Curves, hairpins, chicanes  |
| **Badge colour**   | Blue (`#4870a8`)                    | Red (`#c00020`)             |

Switching at the wrong moment — e.g. entering a hairpin in Mode X — will cause the car to lose grip and spin.

---

## Controls

### Keyboard

| Key            | Action                              |
| -------------- | ----------------------------------- |
| `↑` / `↑ held` | Accelerate / Boost (drains battery) |
| `↓`            | Brake (regenerates battery)         |
| `←` / `→`      | Steer left / right                  |
| `A` / `D`      | Steer left / right (alternative)    |
| `S` / `Z`      | Brake (alternative)                 |
| `X`            | Toggle Aero Mode (X ↔ Z)            |
| `T`            | Toggle mode (alias)                 |
| `Space`        | Start / confirm                     |
| `Enter`        | Start / confirm                     |

### Touch (Mobile)

| Zone              | Action           |
| ----------------- | ---------------- |
| Tap left half     | Steer left       |
| Tap right half    | Steer right      |
| Tap bottom-center | Toggle Aero Mode |
| Hold upper area   | Boost            |

### Device Tilt (Gyroscope)

Tilt the device left/right to steer. A ±3° dead zone prevents drift; full authority at ±35°.

---

## HUD Elements

| Element             | Location      | Description                                                                          |
| ------------------- | ------------- | ------------------------------------------------------------------------------------ |
| **Speedometer**     | Bottom-right  | Current speed in km/h, parallelogram panel                                           |
| **Battery bar**     | Bottom-left   | ERS charge level; drains on boost, fills on brake/coast                              |
| **Aero badge**      | Bottom-center | Current mode (X = blue / Z = red); tap/press to toggle                               |
| **Lap panel**       | Top-right     | Current lap time and lap count (`X/3`)                                               |
| **Curve indicator** | Top-center    | Arrow (← / →) showing the next corner's direction; white → orange → red by intensity |
| **Grip warning**    | On-screen     | Flashes when the car is close to losing traction                                     |

---

## Getting Started

### Prerequisites

- A modern browser (Chrome, Firefox, Edge, Safari)
- [Node.js](https://nodejs.org/) (only for the dev server convenience script)

### Run locally

```bash
npx http-server -p 8080 -c-1
```

Then open [http://localhost:8080](http://localhost:8080).

Alternatively, use the VS Code task **"Start local server"** included in the workspace.

### No build step required

The project is pure ES modules — no bundler, no transpiler, no dependencies. Every file is loaded directly by the browser.

---

## Project Structure

```
index.html              Entry point
style.css               Global styles (full-screen canvas)
src/
  main.js               Bootstrap — creates Game instance
  constants/            Tuning values (physics, rendering, UI, track gen)
  core/
    game.js             Main update loop, state machine
    game-loop.js        requestAnimationFrame wrapper
  entities/
    car.js              Car state (position, speed, battery, aero mode)
    track.js            Procedural track data & sampling
  systems/
    aero.js             Aero mode profiles (drag, downforce, grip)
    energy.js           ERS battery management (boost, regen)
    input.js            Keyboard / touch / gyroscope input
    physics/
      index.js          Physics orchestration
      longitudinal.js   Forward speed, boost, drag
      lateral.js        Lateral forces, slip, wall bounce
      telemetry.js      Debug telemetry extraction
  rendering/
    renderer.js         Top-level render dispatcher
    track-renderer.js   Pseudo-3D road projection
    car-renderer.js     Car sprite and heading
    hud-renderer.js     HUD orchestration
    screen-renderer.js  Start / preview / game-over screens
    hud/                Individual HUD widget renderers
  telemetry/
    telemetry-manager.js  In-game telemetry overlay (debug)
  utils/
    math.js             Clamp, lerp, formatTime, seeded RNG
    canvas.js           Responsive font/size helpers
```

---

## Physics Overview

The simulation uses a **track-local coordinate system**:

- **Z axis** — longitudinal progress along the track (0 → lap length, wraps)
- **Lateral offset** — car's deviation from the track centreline (clamped to ±100 units)

Each frame:

1. Curve state and slip are calculated from the upcoming track segment
2. Longitudinal speed is updated (acceleration, drag, boost, off-track penalty)
3. Lateral velocity is integrated (centrifugal force, auto-steer, slip, damping)
4. Boundary checks apply wall bounce or off-track grass penalty
5. Car Z position advances; lap counter increments on wrap

Off-track severely limits top speed (drag cap: `OFF_TRACK_MAX_SPEED`) and triggers a dust particle timer.

---

## License

See [LICENSE](LICENSE).
