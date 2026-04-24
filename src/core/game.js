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
import {
  requiresOrientationPermission,
  requiresMotionPermission,
} from "../utils/platform.js";
import { createRankingService } from "../ranking/index.js";
import { createRivals } from "../entities/rival-car.js";
import { createObstacles } from "../entities/obstacle.js";
import { updateRivals } from "../systems/rival-physics.js";
import { RIVAL_COUNT } from "../constants/index.js";
import { StateManager } from "../menu/StateManager.js";
import { TrackPreviewState } from "../menu/states/TrackPreviewState.js";
import { StartMenuState } from "../menu/states/StartMenuState.js";
import { LeaderboardState } from "../menu/states/LeaderboardState.js";
import { RaceState } from "../menu/states/RaceState.js";
import { GameOverState } from "../menu/states/GameOverState.js";
import { SettingsState } from "../menu/states/SettingsState.js";
import PhysicsSandboxState from "../menu/states/PhysicsSandboxState.js";
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
    
    window.__AEROCAR_GAME__ = this;
    
    
    this._prevScreenBeforeSandbox = null;
    this.trackSeed = TRACK_SEED;
    this.totalSegments = TOTAL_SEGMENTS;
    this.track.init(this.totalSegments, this.trackSeed);
    this._screenChangeTime = Date.now();
    this._gyroscopeWarning = false;
    this._iosPermissionStatus = requiresOrientationPermission ? "prompt" : null;
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
    this._nameInput.readOnly = true;
    Object.assign(this._nameInput.style, {
      position: "fixed",
      background: "transparent",
      border: "none",
      outline: "none",
      color: "transparent",
      fontFamily: "'Barlow Condensed', 'Segoe UI', sans-serif",
      fontWeight: "700",
      letterSpacing: "4px",
      textTransform: "uppercase",
      caretColor: "transparent",
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
          .catch((err) => {
            console.error("[Ranking] Failed to save entry:", err);
          });
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
      onPointerDown: (x, y) => {
        this.stateManager?.onPointerDown(x, y);
      },
      onPointerUp: (x, y) => {
        this.stateManager?.onPointerUp(x, y);
      },
      onPointerMove: (x, y) => {
        this.stateManager?.onPointerMove(x, y);
      },
      onSteerChange: (v) => {
        this.gameState.steerTarget = v;
      },
      onTelemetryExport: () => this.telemetry.exportJSON(),
        onTelemetryExportCSV: () => this.telemetry.exportCSV(),
      onTelemetryHudToggle: () => this.telemetry.toggleHUD(),
      isRaceActive: () => this.gameState.currentScreen === SCREENS.RACE,
      onGyroscopeUnavailable: () => {
        this._gyroscopeWarning = true;
      },
      onGyroPermissionChange: (status) => {
        this._iosPermissionStatus = status;
        if (this.gameState) this.gameState.iosPermissionStatus = status;
        this._updateIosTapOverlay();
      },
    });
    this._iosTapOverlay = document.createElement("button");
    this._iosTapOverlay.type = "button";
    this._iosTapOverlay.setAttribute("aria-hidden", "true");
    Object.assign(this._iosTapOverlay.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      background: "transparent",
      border: "none",
      outline: "none",
      padding: "0",
      margin: "0",
      cursor: "pointer",
      display: "none",
      zIndex: "5",
      WebkitTapHighlightColor: "transparent",
    });
    document.body.appendChild(this._iosTapOverlay);
    this._iosTapOverlay.addEventListener("click", (e) =>
      this._handleIosTapOverlayClick(e),
    );
    this._handleViewportResize = this._handleViewportResize.bind(this);
    window.addEventListener("resize", this._handleViewportResize);
    window.addEventListener("orientationchange", () => {
      const deadline = Date.now() + ORIENTATION_POLL_MAX_MS;
      const poll = () => {
        this._handleViewportResize();
        if (Date.now() < deadline) {
          setTimeout(poll, ORIENTATION_POLL_INTERVAL);
        }
      };
      setTimeout(poll, ORIENTATION_POLL_INTERVAL);
    });
    if (typeof window !== "undefined" && window.visualViewport) {
      window.visualViewport.addEventListener(
        "resize",
        this._handleViewportResize,
      );
    }
    this._handleViewportResize();
    this.reset(SCREENS.START);
    this._initStateManager();
  }
  _makeStateDeps() {
    return {
      getGameState: () => this.gameState,
      canvas: this.canvas,
      track: this.track,
      callbacks: {
        advance: () => this._advanceIntroScreen(),
        startRace: () => this._startRace(),
        retry: () => this.reset(SCREENS.START),
        focusNameInput: () => this._nameInput.focus(),
        onRaceEnter: () => {},
        onRaceExit: () => {},
        openSettings: () => this._setScreen(SCREENS.SETTINGS),
        openPhysicsSandbox: () => {
          
          try { this._prevScreenBeforeSandbox = this.gameState ? this.gameState.currentScreen : null; } catch (e) {}
          this._setScreen(SCREENS.PHYSICS_SANDBOX);
        },
        openLeaderboard: () => {
          
          if (this.gameState) this.gameState.leaderboardPage = 0;
          this._setScreen(SCREENS.LEADERBOARD);
        },
      changeLeaderboardPage: (delta) => {
        
        if (!this.gameState) return;
        const PAGE_SIZE = 10;
        const total = (this.gameState.rankings || []).length;
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        const cur = typeof this.gameState.leaderboardPage === 'number' ? this.gameState.leaderboardPage : 0;
        let next = cur + (delta || 0);
        if (next < 0) next = 0;
        if (next >= totalPages) next = totalPages - 1;
        this.gameState.leaderboardPage = next;
      },
        backToMenu: () => {
          
          const target = this._prevScreenBeforeSandbox || SCREENS.START;
          this._prevScreenBeforeSandbox = null;
          this._setScreen(target);
        },
        requestGyroPermission: () => this.input.requestOrientationPermission(),
      },
    };
  }
  _createState(screen) {
    const deps = this._makeStateDeps();
    switch (screen) {
      case SCREENS.PREVIEW:
        return new TrackPreviewState(deps);
      case SCREENS.START:
        return new StartMenuState(deps);
      case SCREENS.RACE:
        return new RaceState(deps);
      case SCREENS.GAME_OVER:
        return new GameOverState(deps);
      case SCREENS.LEADERBOARD:
        return new LeaderboardState(deps);
      case SCREENS.SETTINGS:
        return new SettingsState(deps);
      case SCREENS.PHYSICS_SANDBOX:
        return new PhysicsSandboxState(deps);
      default:
        return null;
    }
  }
  _initStateManager() {
    this.stateManager = new StateManager();
    this.stateManager.transition(
      this._createState(this.gameState.currentScreen),
    );
  }
  _handleViewportResize() {
    const vv = typeof window !== "undefined" && window.visualViewport;
    if (vv && this._nameInput && this._nameInput.style.display !== "none") {
      const keyboardVisible = window.innerHeight - vv.height > 100;
      if (keyboardVisible) {
        this.canvas.style.width = `${this.canvas.width}px`;
        this.canvas.style.height = `${this.canvas.height}px`;
        return;
      }
    }
    this.canvas.style.width = "";
    this.canvas.style.height = "";
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
    this.input?.resetInputState();
    this.stateManager?.transition(this._createState(screen));
    this._updateIosTapOverlay();
  }
  _updateIosTapOverlay() {
    if (!this._iosTapOverlay) return;
    const show =
      this._iosPermissionStatus === "prompt" &&
      this.gameState?.currentScreen === SCREENS.START;
    this._iosTapOverlay.style.display = show ? "block" : "none";
  }
  _handleIosTapOverlayClick(e) {
    this._iosTapOverlay.style.display = "none";
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width ? this.canvas.width / rect.width : 1;
    const scaleY = rect.height ? this.canvas.height / rect.height : 1;
    const cx = Math.max(
      0,
      Math.min(this.canvas.width, (e.clientX - rect.left) * scaleX),
    );
    const cy = Math.max(
      0,
      Math.min(this.canvas.height, (e.clientY - rect.top) * scaleY),
    );
    const forwardClick = () => {
      this.stateManager?.onPointerDown(cx, cy);
      requestAnimationFrame(() => this.stateManager?.onPointerUp(cx, cy));
    };
    if (requiresMotionPermission) {
      DeviceMotionEvent.requestPermission()
        .then((state) => {
          const status = state === "granted" ? "granted" : "denied";
          this._iosPermissionStatus = status;
          if (this.gameState) this.gameState.iosPermissionStatus = status;
          if (state === "granted") this.input._bindDeviceMotionEvent();
          forwardClick();
        })
        .catch(() => {
          this._iosPermissionStatus = "denied";
          if (this.gameState) this.gameState.iosPermissionStatus = "denied";
          forwardClick();
        });
    } else if (requiresOrientationPermission) {
      DeviceOrientationEvent.requestPermission()
        .then((state) => {
          const status = state === "granted" ? "granted" : "denied";
          this._iosPermissionStatus = status;
          if (this.gameState) this.gameState.iosPermissionStatus = status;
          if (state === "granted") this.input._bindDeviceOrientationEvent();
          forwardClick();
        })
        .catch(() => {
          this._iosPermissionStatus = "denied";
          if (this.gameState) this.gameState.iosPermissionStatus = "denied";
          forwardClick();
        });
    } else {
      forwardClick();
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
      leaderboardPage: 0,
      newEntryIndex: -1,
      screenAge: 0,
      pendingName: "",
      gyroscopeWarning: this._gyroscopeWarning,
      iosPermissionStatus: this._iosPermissionStatus,
      rivals: createRivals(RIVAL_COUNT, this.track),
      obstacles: createObstacles(this.track),
      collisionCooldown: 0,
    };
    this.energyManager.reset();
    this.telemetry.reset();
    this.gameState.battery = this.energyManager.getCurrentCharge();
    this._setScreen(initialScreen);
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
    this.stateManager?.onPointerDown(x, y);
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
    updateRivals(this.gameState, this.track, dt);
    if (!this.gameState.rescueInProgress) {
      const offScreenThreshold = this.canvas.width / 2 / LATERAL_RENDER_SCALE;
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
    const pad = Math.max(20, cw * 0.05);
    let entryX, entryY, entryW, rowH;
    if (isPortrait) {
      const rkY = ch * 0.36;
      const rkAvail = ch - 40 - (rkY + 14) - 8;
      rowH = Math.max(24, Math.min(34, rkAvail / 5 - 4));
      const rkStart = rkY + 14;
      entryX = pad + 34;
      entryY = rkStart + 4 * (rowH + 4);
      entryW = cw - pad * 2 - 34;
    } else {
      const divX = Math.round(cw * 0.5);
      const rightX = divX + 20;
      const rightW = cw - rightX - pad;
      const rkAvail = ch - 40 - (pad + 22) - 8;
      rowH = Math.max(24, Math.min(42, rkAvail / 5 - 4));
      const rkStart = pad + 22;
      entryX = rightX + 34;
      entryY = rkStart + 4 * (rowH + 4);
      entryW = rightW - 34;
    }
    
    const fs = Math.max(16, Math.min(22, cw * 0.022));
    Object.assign(this._nameInput.style, {
      left: `${Math.round(entryX)}px`,
      top: `${Math.round(entryY)}px`,
      width: `${Math.round(entryW)}px`,
      height: `${Math.round(rowH)}px`,
      lineHeight: `${Math.round(rowH)}px`,
      fontSize: `${fs}px`,
      display: "block",
    });
    this._nameInput.value = "";
    this._nameInput.readOnly = false;
    setTimeout(() => this._nameInput.focus(), 80);
  }
  _hideNameInput() {
    if (this._nameInput) {
      this._nameInput.style.display = "none";
      this._nameInput.blur();
      this._nameInput.readOnly = true;
    }
    
    this.canvas.style.width = "";
    this.canvas.style.height = "";
  }
  start() {
    this.gameLoop.start((dt) => {
      this.update(dt);
      this.renderer.draw(
        this.gameState,
        this.track,
        this.telemetry,
        dt,
        this.stateManager,
      );
    });
  }
}
export { Game };
