import { resizeCanvas } from "./utils.js";
import { Track } from "./track.js";
import { InputController } from "./input.js";
import { Renderer } from "./renderer.js";
import { createCarStateFields, toggleCarMode, setCarBoost, setCarBrake } from "./car.js";
import { updateCarPhysics } from "./car-physics.js";
import { EnergyManager } from "./energy.js";
import {
  SCREENS,
  TARGET_LAPS,
  TOTAL_SEGMENTS,
  TRACK_SEED,
} from "./constants/index.js";

class Game {
  constructor(canvas, statusText) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.statusText = statusText;

    this.track = new Track();
    this.renderer = new Renderer(this.canvas, this.ctx, this.statusText);
    this.energyManager = new EnergyManager();

    this.trackSeed = TRACK_SEED;
    this.totalSegments = TOTAL_SEGMENTS;
    this.track.init(this.totalSegments, this.trackSeed);

    this.input = new InputController(canvas, {
      onBrakeChange: (active) => {
        if (this.gameState.currentScreen === SCREENS.RACE) {
          setCarBrake(this.gameState, active);
        } else if (!active) {
          // Always release on key-up so state doesn't leak across screen transitions.
          setCarBrake(this.gameState, false);
        }
      },
      onBoostChange: (active) => {
        if (this.gameState.currentScreen === SCREENS.RACE) {
          setCarBoost(this.gameState, active);
        } else if (!active) {
          // Always release on key-up so state doesn't leak across screen transitions.
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
    });

    this.handleViewportResize = this.handleViewportResize.bind(this);
    window.addEventListener("resize", this.handleViewportResize);
    window.addEventListener("orientationchange", () => {
      setTimeout(this.handleViewportResize, 100);
    });
    this.handleViewportResize();

    this.reset(SCREENS.START);
    this.gameLoop = this.gameLoop.bind(this);
  }

  handleViewportResize() {
    resizeCanvas(this.canvas);
  }

  setScreen(screen) {
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
    this.gameState.battery = this.energyManager.battery;

    if (initialScreen === SCREENS.GAME_OVER) {
      this.setScreen(SCREENS.GAME_OVER);
    }

    if (this.renderer) {
      this.renderer.displayedSpeedKmh = 0;
    }

    this.statusText.innerText = "";
  }

  advanceIntroScreen() {
    if (this.gameState.currentScreen === SCREENS.PREVIEW) {
      this.setScreen(SCREENS.START);
    }
  }

  start() {
    if (this.gameState.currentScreen === SCREENS.START) {
      this.setScreen(SCREENS.RACE);
      this.gameState.startTime = Date.now();
    }
  }

  handleScreenTap(x, y) {
    const screen = this.gameState.currentScreen;
    if (screen === SCREENS.PREVIEW) return this.advanceIntroScreen();
    if (screen === SCREENS.START) return this.start();
    if (screen === SCREENS.GAME_OVER) return this.reset(SCREENS.START);
  }

  update() {
    if (this.gameState.currentScreen !== SCREENS.RACE) return;

    this.gameState.currentTime = Date.now() - this.gameState.startTime;

    this.energyManager.update(this.gameState);
    this.gameState.battery = this.energyManager.battery;

    const currentTrackPoint = this.track.getTrackPoint(this.gameState.currentZ);
    this.gameState.currentTrackPoint = currentTrackPoint;
    this.gameState.currentCurvature = currentTrackPoint.curve || 0;

    const { lapCompleted } = updateCarPhysics(
      this.gameState,
      this.track,
      currentTrackPoint,
    );

    if (lapCompleted) {
      this.gameState.lapCount += 1;
      if (this.gameState.lapCount >= this.gameState.targetLaps) {
        this.setScreen(SCREENS.GAME_OVER);
        this.gameState.finalTime = this.gameState.currentTime;
        this.gameState.speed = 0;
      }
    }
  }

  gameLoop() {
    this.update();
    this.renderer.draw(this.gameState, this.track);
    requestAnimationFrame(this.gameLoop);
  }
}

export { Game };

