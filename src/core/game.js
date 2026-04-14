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
} from "../constants/index.js";

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
        this.gameState.steerInput = v;
      },
      onTelemetryExport: () => this.telemetry.exportJSON(),
      onTelemetryHudToggle: () => this.telemetry.toggleHUD(),
    });

    this._handleViewportResize = this._handleViewportResize.bind(this);
    window.addEventListener("resize", this._handleViewportResize);
    window.addEventListener("orientationchange", () => {
      setTimeout(this._handleViewportResize, 100);
    });
    this._handleViewportResize();

    this.reset(SCREENS.START);
  }

  _handleViewportResize() {
    resizeCanvas(this.canvas);
  }

  _setScreen(screen) {
    this.gameState.currentScreen = screen;
    this.gameState.isWaitingToStart = screen === SCREENS.START;
    this.gameState.isRunning = screen === SCREENS.RACE;
    this.gameState.isGameOver = screen === SCREENS.GAME_OVER;
  }

  reset(initialScreen = SCREENS.START) {
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
    }
  }

  handleScreenTap(x, y) {
    const screen = this.gameState.currentScreen;
    if (screen === SCREENS.PREVIEW) return this._advanceIntroScreen();
    if (screen === SCREENS.START) return this._startRace();
    if (screen === SCREENS.GAME_OVER) return this.reset(SCREENS.START);
  }

  update(dt) {
    if (this.gameState.currentScreen !== SCREENS.RACE) return;

    this.gameState.currentTime = Date.now() - this.gameState.startTime;

    this.energyManager.update(this.gameState, dt);
    this.gameState.battery = this.energyManager.getCurrentCharge();

    const currentTrackPoint = this.track.getTrackPoint(this.gameState.currentZ);
    this.gameState.currentTrackPoint = currentTrackPoint;
    this.gameState.currentCurvature =
      currentTrackPoint.rawCurve ?? currentTrackPoint.curve ?? 0;
    this.gameState.isInModeXZone = currentTrackPoint.isModeXZone || false;

    const LOOKAHEAD_DISTANCE = 300;
    const lookaheadPoint = this.track.getTrackPoint(
      this.gameState.currentZ + LOOKAHEAD_DISTANCE,
    );
    this.gameState.upcomingCurvature =
      lookaheadPoint.rawCurve ?? lookaheadPoint.curve ?? 0;
    this.gameState.upcomingIsModeXZone = lookaheadPoint.isModeXZone || false;

    const { lapCompleted } = updateCarPhysics(
      this.gameState,
      this.track,
      dt,
      currentTrackPoint,
    );
    this.telemetry.log(this.gameState);

    if (lapCompleted) {
      this.gameState.lapCount += 1;
      if (this.gameState.lapCount >= this.gameState.targetLaps) {
        this._setScreen(SCREENS.GAME_OVER);
        this.gameState.finalTime = this.gameState.currentTime;
        this.gameState.speed = 0;
      }
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
