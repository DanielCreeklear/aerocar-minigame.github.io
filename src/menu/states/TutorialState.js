import { GameState } from "../GameState.js";
import { TutorialManager } from "../../systems/tutorial-manager.js";
import { drawTutorialOverlay } from "../../rendering/hud/tutorial-overlay.js";
import { TUTORIAL_SEED } from "../../constants/tutorial.js";
import { Track } from "../../entities/track.js";
import {
  TRACK_TYPES,
  Z_RESOLUTION,
  YAW_FACTOR,
  CURVE_ENTRY_EXIT_PORTION,
} from "../../constants/index.js";

export class TutorialState extends GameState {
  constructor(deps) {
    super();
    this._deps = deps;
    this._tm = null;
    this._lastW = 0;
    this._lastH = 0;
    this._skipHitRect = null; // cache of skip button rect
  }

  onEnter() {
    // prepare a dedicated simple track for tutorial (hard-coded segments)
    try {
      const t = new Track();
      // build a simple, explicit segment list so the tutorial always behaves the same
      const segments = [];
      let zOffset = 0;
      const pushSeg = (index, type, length, curveStrength = 0, isChicane = false) => {
        const startZ = zOffset;
        const endZ = startZ + length;
        const entryPortion = isChicane ? CURVE_ENTRY_EXIT_PORTION : CURVE_ENTRY_EXIT_PORTION;
        const entryBoundary = type === TRACK_TYPES.CURVE ? startZ + length * entryPortion : startZ;
        const exitBoundary = type === TRACK_TYPES.CURVE ? endZ - length * entryPortion : endZ;
        const apexZ = (entryBoundary + exitBoundary) / 2;
        const direction = curveStrength > 0 ? "right" : curveStrength < 0 ? "left" : "none";
        const classification = type === TRACK_TYPES.STRAIGHT ? "straight" : Math.abs(curveStrength) >= 6 ? "tight-curve" : "fast-curve";
        segments.push({
          index,
          type,
          length,
          startZ,
          endZ,
          curveStrength,
          isChicane,
          isHairpin: false,
          direction,
          classification,
          entryBoundary,
          exitBoundary,
          apexZ,
        });
        zOffset = endZ;
      };

      // Layout: STRAIGHT 600 -> CURVE suave (right ~4) -> STRAIGHT 400 -> CURVE fechada (left ~-8) -> STRAIGHT 800
      pushSeg(1, TRACK_TYPES.STRAIGHT, 600, 0);
      pushSeg(2, TRACK_TYPES.CURVE, 480, 4);
      pushSeg(3, TRACK_TYPES.STRAIGHT, 400, 0);
      pushSeg(4, TRACK_TYPES.CURVE, 420, -8);
      pushSeg(5, TRACK_TYPES.STRAIGHT, 800, 0);

      // attach segments and lengths
      t.segments = segments;
      t.totalDistance = zOffset;
      t.lapLength = zOffset;

      // build track data by sampling (reuse Track helper methods)
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

      // copy computed data into the shared game track reference
      const dst = this._deps.track;
      dst.segments = t.segments;
      dst.trackData = t.trackData;
      dst.racingLine = t.racingLine;
      dst.racingLineData = t.racingLineData;
      dst.totalDistance = t.totalDistance;
      dst.lapLength = t.lapLength;
      dst.gridData = t.gridData;
      dst.gridCols = t.gridCols;
      dst.gridRows = t.gridRows;
      dst.gridMinX = t.gridMinX;
    } catch (e) {
      // silent fallback if anything goes wrong
    }

    this._tm = new TutorialManager(this._deps.getGameState());
    // expose tutorial manager to gameState for debug/inspection
    this._deps.getGameState().tutorial = this._tm;
  }

  onExit() {
    // cleanup
    if (this._deps.getGameState()) this._deps.getGameState().tutorial = null;
  }

  render(ctx, w, h) {
    this._lastW = w;
    this._lastH = h;
    // allow main renderer to draw the world; the renderer calls stateManager.render
    // now draw overlay
    const gs = this._deps.getGameState();
    const step = this._tm ? this._tm.getStep() : null;
    drawTutorialOverlay(ctx, step, w, h, (highlight) => {
      // highlight callback: set a flag on gameState that HUD can pick up and blink
      if (!gs) return;
      gs._tutorialHighlight = highlight;
    });

    // compute skip button area so pointer handler can detect it
    const pad = Math.max(12, Math.round(w * 0.03));
    const panelW = Math.min(460, w - pad * 2);
    const panelH = Math.min(160, h * 0.22);
    const x = Math.round((w - panelW) / 2);
    const y = Math.round(h * 0.06);
    const btnW = 80;
    const btnH = 28;
    const bx = x + panelW - btnW - pad;
    const by = y + pad;
    this._skipHitRect = { x: bx, y: by, w: btnW, h: btnH };
  }

  onPointerDown(x, y) {
    // skip button
    if (this._skipHitRect) {
      const r = this._skipHitRect;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        // mark tutorial complete and go to main menu
      this._tm.markComplete();
      if (this._deps.callbacks && this._deps.callbacks.backToMenu) {
        this._deps.callbacks.backToMenu();
      }
      return;
      }
    }
    // any other input should advance if step configured
    if (this._tm && this._tm.getStep() && this._tm.getStep().autoAdvanceOnInput) {
      // record lastInputAt on gameState for manager to see
      const gs = this._deps.getGameState();
      if (gs) gs.lastInputAt = Date.now();
    }
  }

  onPointerUp() {}

  update(dt) {
    if (!this._tm) return;
    this._tm.update(dt);
    if (this._tm.finished) {
      // go back to main menu when finished
      if (this._deps.callbacks && this._deps.callbacks.backToMenu) {
        this._deps.callbacks.backToMenu();
      }
    }
  }
}
