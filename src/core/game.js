import { resizeCanvas } from "../utils/canvas.js";
import { Track } from "../entities/track.js";
import { InputController } from "../systems/input.js";
import { Renderer } from "../rendering/renderer.js";
import {
  createCarStateFields,
  toggleCarMode,
  setCarBoost,
  setCarBrake,
} from "../entities/car.js";
import { updateCarPhysics } from "../systems/physics/index.js";
import { EnergyManager } from "../systems/energy.js";
import { GameLoop } from "./game-loop.js";
import { TelemetryManager } from "../telemetry/telemetry-manager.js";
import {
  SCREENS,
  TARGET_LAPS,
  TOTAL_SEGMENTS,
  TRACK_SEED,
  STEER_RATE,
  LATERAL_RENDER_SCALE,
  OFF_TRACK_RESCUE_SPEED_FACTOR,
  OFF_TRACK_RESCUE_FLASH_DURATION,
} from "../constants/index.js";
import { clamp } from "../utils/math.js";
import { createRankingService } from "../ranking/index.js";

// How long (ms) to poll after an orientationchange before giving up waiting
// for the browser to update its dimensions.  iOS Safari can be slow here.
const ORIENTATION_POLL_INTERVAL = 50;
const ORIENTATION_POLL_MAX_MS = 500;

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.track = new Track();
    this.renderer = new Renderer(this.canvas, this.ctx);
    this.energyManager = new EnergyManager();
    this.gameLoop = new GameLoop();
    this.telemetry = new TelemetryManager();

    this.trackSeed = TRACK_SEED;
    this.totalSegments = TOTAL_SEGMENTS;
    this.track.init(this.totalSegments, this.trackSeed);

    this._screenChangeTime = Date.now();
    this._gyroscopeWarning = false;
    this.rankingService = createRankingService();
    this.rankings = [];

    this.rankingService
      .load()
      .then((entries) => {
        this.rankings = entries;
        if (this.gameState) this.gameState.rankings = entries;
      })
      .catch(() => {});

    this._nameInput = document.createElement("input");
    this._nameInput.type = "text";
    this._nameInput.maxLength = 8;
    this._nameInput.autocomplete = "off";
    this._nameInput.spellcheck = false;
    this._nameInput.enterKeyHint = "done";
    this._nameInput.inputMode = "text";
    this._nameInput.setAttribute("autocapitalize", "characters");
    // Start as readonly so that accidental focus (e.g. browser autofill or
    // touch mis-tap) does not open the virtual keyboard until the ranking
    // name-entry phase is active.  readOnly is removed in _showNameInput().
    this._nameInput.readOnly = true;
    Object.assign(this._nameInput.style, {
      position: "fixed",
      background: "transparent",
      border: "none",
      outline: "none",
      color: "#F0EAE0",
      fontFamily: "'Barlow Condensed', 'Segoe UI', sans-serif",
      fontWeight: "700",
      letterSpacing: "4px",
      textTransform: "uppercase",
      caretColor: "#CC001E",
      display: "none",
      zIndex: "10",
      padding: "0",
      margin: "0",
    });
    document.body.appendChild(this._nameInput);
    this._nameInput.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        const raw = this._nameInput.value
          .trim()
          .replace(/[^A-Z0-9]/gi, "")
          .toUpperCase();
        const name = raw.substring(0, 8) || "ACE";
        this._hideNameInput();
        this.gameState.rankingPhase = "results";
        this.rankingService
          .save(name, this.gameState.finalTime)
          .then(({ rankings, newEntryIndex }) => {
            this.rankings = rankings;
            this.gameState.rankings = rankings;
            this.gameState.newEntryIndex = newEntryIndex;
          })
          .catch(() => {});
      }
    });
    this._nameInput.addEventListener("input", () => {
      this._nameInput.value = this._nameInput.value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
    });

    this.input = new InputController(canvas, {
      onBrakeChange: (active) => {
        if (this.gameState.currentScreen === SCREENS.RACE) {
          setCarBrake(this.gameState, active);
        } else if (!active) {
          setCarBrake(this.gameState, false);
        }
      },
      onBoostChange: (active) => {
        if (this.gameState.currentScreen === SCREENS.RACE) {
          setCarBoost(this.gameState, active);
        } else if (!active) {
          setCarBoost(this.gameState, false);
        }
      },
      onModeToggle: () => {
        if (this.gameState.currentScreen === SCREENS.RACE) {
          toggleCarMode(this.gameState);
        }
      },
      onScreenTap: (x, y) => {
        this.handleScreenTap(x, y);
      },
      onSteerChange: (v) => {
        this.gameState.steerTarget = v;
      },
      onTelemetryExport: () => this.telemetry.exportJSON(),
      onTelemetryHudToggle: () => this.telemetry.toggleHUD(),
      isRaceActive: () => this.gameState.currentScreen === SCREENS.RACE,
      onGyroscopeUnavailable: () => {
        this._gyroscopeWarning = true;
      },
    });

    this._handleViewportResize = this._handleViewportResize.bind(this);
    window.addEventListener("resize", this._handleViewportResize);
    window.addEventListener("orientationchange", () => {
      // Poll until the browser has settled on its new dimensions (iOS Safari
      // can take up to ~300 ms after orientationchange fires).
      const deadline = Date.now() + ORIENTATION_POLL_MAX_MS;
      const poll = () => {
        this._handleViewportResize();
        if (Date.now() < deadline) {
          setTimeout(poll, ORIENTATION_POLL_INTERVAL);
        }
      };
      setTimeout(poll, ORIENTATION_POLL_INTERVAL);
    });

    // visualViewport resize fires when the on-screen keyboard appears or
    // disappears on Android Chrome, keeping the canvas in sync without
    // erroneously resizing while the keyboard is open.
    if (typeof window !== "undefined" && window.visualViewport) {
      window.visualViewport.addEventListener(
        "resize",
        this._handleViewportResize,
      );
    }

    this._handleViewportResize();

    this.reset(SCREENS.START);
  }

  _handleViewportResize() {
    // When the virtual keyboard is visible on Android Chrome, visualViewport
    // height shrinks significantly.  Avoid resizing the canvas in that state
    // so the game layout doesn't get squashed while the player types their
    // name.
    const vv = typeof window !== "undefined" && window.visualViewport;
    if (vv && this._nameInput && this._nameInput.style.display !== "none") {
      const keyboardVisible = window.innerHeight - vv.height > 100;
      if (keyboardVisible) return;
    }

    resizeCanvas(this.canvas);
    if (this._nameInput && this._nameInput.style.display !== "none") {
      this._showNameInput();
    }
  }

  _setScreen(screen) {
    this.gameState.currentScreen = screen;
    this.gameState.isWaitingToStart = screen === SCREENS.START;
    this.gameState.isRunning = screen === SCREENS.RACE;
    this.gameState.isGameOver = screen === SCREENS.GAME_OVER;
    this._screenChangeTime = Date.now();
    if (screen !== SCREENS.GAME_OVER) {
      this._hideNameInput();
    }
  }

  reset(initialScreen = SCREENS.START) {
    this._screenChangeTime = Date.now();
    this._hideNameInput();
    const carState = createCarStateFields();

    this.gameState = {
      currentScreen: initialScreen,
      isWaitingToStart: initialScreen === SCREENS.START,
      isRunning: initialScreen === SCREENS.RACE,
      isGameOver: false,
      ...carState,
      segments: [],
      trackData: [],
      totalDistance: 0,
      lapCount: 0,
      targetLaps: TARGET_LAPS,
      totalSegments: this.track.segments.length || this.totalSegments,
      startTime: Date.now(),
      currentTime: 0,
      finalTime: 0,
      bestLapTime: Infinity,
      lastLapTime: null,
      lastLapFlashTimer: 0,
      lapStartTime: Date.now(),
      rankingPhase: null,
      rankings: this.rankings,
      newEntryIndex: -1,
      screenAge: 0,
      pendingName: "",
      gyroscopeWarning: this._gyroscopeWarning,
    };

    this.energyManager.reset();
    this.telemetry.reset();
    this.gameState.battery = this.energyManager.getCurrentCharge();

    if (initialScreen === SCREENS.GAME_OVER) {
      this._setScreen(SCREENS.GAME_OVER);
    }

    this.renderer.resetHud();
  }

  _advanceIntroScreen() {
    if (this.gameState.currentScreen === SCREENS.PREVIEW) {
      this._setScreen(SCREENS.START);
    }
  }

  _startRace() {
    if (this.gameState.currentScreen === SCREENS.START) {
      this._setScreen(SCREENS.RACE);
      this.gameState.startTime = Date.now();
      this.gameState.lapStartTime = Date.now();
    }
  }

  handleScreenTap(x, y) {
    const screen = this.gameState.currentScreen;
    if (screen === SCREENS.PREVIEW) return this._advanceIntroScreen();
    if (screen === SCREENS.START) return this._startRace();
    if (screen === SCREENS.GAME_OVER) {
      if (this.gameState.rankingPhase === "entering") {
        // Called from a touch/click handler — valid user gesture, so
        // focus() will show the virtual keyboard on mobile too.
        this._nameInput.focus();
        return;
      }
      if (this.gameState.rankingPhase === "results") {
        return this.reset(SCREENS.START);
      }
      return;
    }
  }

  update(dt) {
    this.gameState.screenAge = (Date.now() - this._screenChangeTime) / 1000;
    this.gameState.pendingName = this._nameInput
      ? this._nameInput.value.toUpperCase()
      : "";

    if (this.gameState.currentScreen !== SCREENS.RACE) return;

    if (this.gameState.lastLapFlashTimer > 0) {
      this.gameState.lastLapFlashTimer -= dt;
    }
    if (this.gameState.rescueFlashTimer > 0) {
      this.gameState.rescueFlashTimer -= dt;
    }

    this.gameState.currentTime = Date.now() - this.gameState.startTime;

    this.energyManager.update(this.gameState, dt);
    this.gameState.battery = this.energyManager.getCurrentCharge();

    const currentTrackPoint = this.track.getTrackPoint(this.gameState.currentZ);
    this.gameState.currentTrackPoint = currentTrackPoint;
    this.gameState.currentCurvature =
      currentTrackPoint.rawCurve ?? currentTrackPoint.curve ?? 0;
    this.gameState.isInModeXZone = currentTrackPoint.isModeXZone || false;

    const CURVE_LOOKAHEAD = 400;
    const upcomingFeatures = this.track.getUpcomingFeatures(
      this.gameState.currentZ,
      CURVE_LOOKAHEAD,
    );
    const nextCurveFeature = upcomingFeatures.find(
      (f) => f.classification !== "straight",
    );
    this.gameState.upcomingCurvature = nextCurveFeature
      ? nextCurveFeature.segment.curveStrength
      : 0;
    const lookaheadPoint = this.track.getTrackPoint(
      this.gameState.currentZ + 300,
    );
    this.gameState.upcomingIsModeXZone = lookaheadPoint.isModeXZone || false;

    {
      const target = this.gameState.steerTarget || 0;
      const current = this.gameState.steerInput || 0;
      const dir = Math.sign(target - current);
      this.gameState.steerInput = clamp(current + dir * STEER_RATE * dt, -1, 1);

      if (
        target === 0 &&
        Math.sign(this.gameState.steerInput) !== Math.sign(current) &&
        current !== 0
      ) {
        this.gameState.steerInput = 0;
      }
    }

    const { lapCompleted, physicsTelemetry } = updateCarPhysics(
      this.gameState,
      this.track,
      dt,
      currentTrackPoint,
    );
    this.telemetry.log(this.gameState, physicsTelemetry);

    // Rescue the car when it goes off the visible screen (important on mobile
    // where the viewport is narrow enough that the car can disappear before the
    // regular off-track rescue threshold is reached).
    if (!this.gameState.rescueInProgress) {
      const offScreenThreshold =
        this.canvas.width / 2 / LATERAL_RENDER_SCALE;
      if (Math.abs(this.gameState.lateralOffset || 0) >= offScreenThreshold) {
        this.gameState.rescueInProgress = true;
        this.gameState.rescuePenaltySpeed =
          (this.gameState.speed || 0) * OFF_TRACK_RESCUE_SPEED_FACTOR;
        this.gameState.carHeading = 0;
        this.gameState.rescueFlashTimer = OFF_TRACK_RESCUE_FLASH_DURATION;
      }
    }

    if (lapCompleted) {
      const now = Date.now();
      const lapTime = now - this.gameState.lapStartTime;
      this.gameState.lapStartTime = now;
      if (lapTime < this.gameState.bestLapTime) {
        this.gameState.bestLapTime = lapTime;
      }
      this.gameState.lastLapTime = lapTime;
      this.gameState.lastLapFlashTimer = 3.0;

      this.gameState.lapCount += 1;
      if (this.gameState.lapCount >= this.gameState.targetLaps) {
        this._setScreen(SCREENS.GAME_OVER);
        this.gameState.finalTime = this.gameState.currentTime;
        this.gameState.speed = 0;
        this.gameState.rankingPhase = "entering";
        this._showNameInput();
      }
    }
  }

  _showNameInput() {
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const isPortrait = ch > cw;
    const x = isPortrait ? Math.round(cw * 0.22) : Math.round(cw * 0.565);
    const y = isPortrait ? Math.round(ch * 0.832) : Math.round(ch * 0.838);
    const w = isPortrait ? Math.round(cw * 0.52) : Math.round(cw * 0.2);
    const fs = Math.max(14, Math.min(22, cw * 0.022));
    Object.assign(this._nameInput.style, {
      left: `${x}px`,
      top: `${y}px`,
      width: `${w}px`,
      fontSize: `${fs}px`,
      display: "block",
    });
    this._nameInput.value = "";
    // Remove readonly so the virtual keyboard opens on focus.
    this._nameInput.readOnly = false;
    // setTimeout allows the display change to apply first.
    // On desktop this is enough; on mobile, focus() called here
    // (outside a gesture) won't open the keyboard — the user must
    // tap the screen, which routes through handleScreenTap → focus().
    setTimeout(() => this._nameInput.focus(), 80);
  }

  _hideNameInput() {
    if (this._nameInput) {
      this._nameInput.style.display = "none";
      this._nameInput.blur();
      // Re-add readonly so accidental focus (e.g. browser autofill) never
      // triggers the virtual keyboard when the input is not in use.
      this._nameInput.readOnly = true;
    }
  }

  start() {
    this.gameLoop.start((dt) => {
      this.update(dt);
      this.renderer.draw(this.gameState, this.track, this.telemetry);
    });
  }
}

export { Game };
