import { GameState } from "../GameState.js";
import { TutorialManager } from "../../systems/tutorial-manager.js";
import { drawTutorialOverlay, getContinuarButtonRect, getSkipButtonRect } from "../../rendering/hud/tutorial-overlay.js";
import { Track } from "../../entities/track.js";
import {
  TRACK_TYPES,
  Z_RESOLUTION,
  YAW_FACTOR,
  CURVE_ENTRY_EXIT_PORTION,
  SCREENS,
} from "../../constants/index.js";

export class TutorialState extends GameState {
  constructor(deps) {
    super();
    this._deps = deps;
    this._tm = null;
    this._lastW = 0;
    this._lastH = 0;
    this._skipHitRect = null;
    this._continuarHitRect = null;
  }

  onEnter() {
    
    try {
      const t = new Track();
      const segments = [];
      let zOffset = 0;
      const pushSeg = (index, type, length, curveStrength = 0) => {
        const startZ = zOffset;
        const endZ = startZ + length;
        const entryBoundary = type === TRACK_TYPES.CURVE ? startZ + length * CURVE_ENTRY_EXIT_PORTION : startZ;
        const exitBoundary  = type === TRACK_TYPES.CURVE ? endZ   - length * CURVE_ENTRY_EXIT_PORTION : endZ;
        const apexZ = (entryBoundary + exitBoundary) / 2;
        const direction = curveStrength > 0 ? "right" : curveStrength < 0 ? "left" : "none";
        const classification = type === TRACK_TYPES.STRAIGHT ? "straight" : Math.abs(curveStrength) >= 6 ? "tight-curve" : "fast-curve";
        segments.push({ index, type, length, startZ, endZ, curveStrength,
          isChicane: false, isHairpin: false, direction, classification,
          entryBoundary, exitBoundary, apexZ });
        zOffset = endZ;
      };

      
      pushSeg(1, TRACK_TYPES.STRAIGHT, 700, 0);
      pushSeg(2, TRACK_TYPES.CURVE,    480, 4);
      pushSeg(3, TRACK_TYPES.STRAIGHT, 500, 0);
      pushSeg(4, TRACK_TYPES.CURVE,    420, -8);
      pushSeg(5, TRACK_TYPES.STRAIGHT, 900, 0);

      t.segments = segments;
      t.totalDistance = zOffset;
      t.lapLength = zOffset;

      const pointCount = t.getPointCount();
      let currentX = 0;
      let currentYaw = 0;
      const rawData = [];
      for (let i = 0; i < pointCount; i++) {
        const z = i * Z_RESOLUTION;
        const seg = t.findSegmentForZ(z);
        const tSeg = t.getSegmentProgress(seg, z);
        const targetCurve = t.getTargetCurve(seg, tSeg);
        currentYaw += targetCurve * YAW_FACTOR;
        currentX += currentYaw;
        rawData.push({ z, x: currentX, yaw: currentYaw, type: seg.type, curve: targetCurve });
      }
      t.normalizeTrackData(rawData);
      t.markStartFinish();
      t._markModeXZones();
      t._buildGrid();
      t._buildRacingLine();

      const dst = this._deps.track;
      dst.segments       = t.segments;
      dst.trackData      = t.trackData;
      dst.racingLine     = t.racingLine;
      dst.racingLineData = t.racingLineData;
      dst.totalDistance  = t.totalDistance;
      dst.lapLength      = t.lapLength;
      dst.gridData       = t.gridData;
      dst.gridCols       = t.gridCols;
      dst.gridRows       = t.gridRows;
      dst.gridMinX       = t.gridMinX;
    } catch (e) {
      
    }

    
    const gs = this._deps.getGameState();
    gs.currentScreen   = SCREENS.RACE;
    gs.isRunning       = true;
    gs.isWaitingToStart = false;
    gs.isGameOver      = false;
    gs.isTutorial      = true;   
    gs.startTime       = Date.now();
    gs.lapStartTime    = Date.now();
    gs.lapCount        = 0;
    gs.currentZ        = 0;
    gs.speed           = 0;
    gs.lateralOffset   = 0;
    gs.lateralVelocity = 0;
    gs.carHeading      = 0;
    gs.rivals          = [];    
    gs.obstacles       = [];    

    this._tm = new TutorialManager(gs);
    gs.tutorial = this._tm;
  }

  onExit() {
    const gs = this._deps.getGameState();
    if (gs) {
      gs.isTutorial = false;
      gs.tutorial   = null;
      gs.isRunning  = false;
      gs.rivals     = [];
      gs.obstacles  = [];
    }
  }

  
  render(ctx, w, h) {
    this._lastW = w;
    this._lastH = h;

    const step = this._tm ? this._tm.getStep() : null;
    drawTutorialOverlay(ctx, step, w, h, (highlight) => {
      const gs = this._deps.getGameState();
      if (gs) gs._tutorialHighlight = highlight;
    });

    this._skipHitRect     = getSkipButtonRect(w, h);
    this._continuarHitRect = getContinuarButtonRect(step, w, h);
  }

  onPointerDown(x, y) {
    
    if (this._skipHitRect) {
      const r = this._skipHitRect;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        this._tm.markComplete();
        this._deps.callbacks?.backToMenu?.();
        return;
      }
    }
    
    if (this._continuarHitRect) {
      const r = this._continuarHitRect;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        this._tm?.advance();
        return;
      }
    }
    
    if (this._tm?.getStep()?.autoAdvanceOnInput) {
      const step = this._tm.getStep();
      if (step.id === "enable-gyro") {
        this._deps.callbacks?.requestGyroPermission?.();
      }
      this._tm.advance();
    }
  }

  onPointerUp() {}

  update(dt) {
    if (!this._tm) return;
    this._tm.update(dt);
    if (this._tm.finished) {
      
      const gs = this._deps.getGameState();
      if (gs) gs.currentScreen = SCREENS.START;
      this._deps.callbacks?.backToMenu?.();
    }
  }
}
