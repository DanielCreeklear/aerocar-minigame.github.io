import { drawTrack } from "./track-renderer.js";
import { drawCar } from "./car-renderer.js";
import { drawRivals } from "./rival-renderer.js";
import { drawObstacles } from "./obstacle-renderer.js";
import { HudRenderer } from "./hud-renderer.js";
import {
  drawStartScreen,
  drawGameOverScreen,
  drawLeaderboardScreen,
  drawTrackPreviewScreen,
} from "./screen-renderer.js";
import {
  BORDER_WIDTH,
  CAR_HEIGHT,
  CAR_WIDTH,
  CAR_Y_RATIO,
  ROAD_SAMPLE_STEP,
  SCREENS,
  TRACK_WIDTH,
  getViewportProfile,
} from "../constants/index.js";
import { isMobile } from "../utils/platform.js";
const PORTRAIT_SCALE_COMPACT = 0.68;
const PORTRAIT_SCALE_TABLET = 0.8;
const CAMERA_SHAKE_SPEED_KMH_SCALE = 17;
const CAMERA_SHAKE_SPEED_MIN = 325;
const CAMERA_SHAKE_SPEED_MAX = 375;
const CAMERA_SHAKE_MAX_PX = 2.8;

// ─── Rain camera-flash state ────────────────────────────────────────────────
const RAIN_FLASH_INTERVAL_MS = 1800;
const RAIN_FLASH_DURATION_MS = 16; // ~1 frame
let _nextRainFlashAt = 0;
let _rainFlashActive = false;
function getCameraShakeOffset(gameState) {
  const rawSpeed = gameState?.speed || 0;
  const speedKmh = rawSpeed * CAMERA_SHAKE_SPEED_KMH_SCALE;
  if (speedKmh <= CAMERA_SHAKE_SPEED_MIN) return { x: 0, y: 0 };
  const t = Math.min(
    1,
    (speedKmh - CAMERA_SHAKE_SPEED_MIN) /
      (CAMERA_SHAKE_SPEED_MAX - CAMERA_SHAKE_SPEED_MIN),
  );
  const amp = CAMERA_SHAKE_MAX_PX * t;
  const jitter = amp * 0.1;
  const time = performance.now() * 0.028;
  return {
    x: Math.sin(time * 1.7) * amp + (Math.random() * 2 - 1) * jitter,
    y:
      Math.cos(time * 2.3 + 0.9) * amp * 0.72 +
      (Math.random() * 2 - 1) * jitter * 0.8,
  };
}
function buildRenderMetrics(width, height) {
  const profile = getViewportProfile(width, height);
  if (!profile.isPortrait) {
    return {
      width,
      height,
      scale: 1,
      isPortrait: false,
      carY: height * CAR_Y_RATIO,
      borderWidth: BORDER_WIDTH,
      carHeight: CAR_HEIGHT,
      carWidth: CAR_WIDTH,
      roadSampleStep: ROAD_SAMPLE_STEP,
      trackWidth: TRACK_WIDTH,
    };
  }
  const scale = profile.isCompactWidth
    ? PORTRAIT_SCALE_COMPACT
    : PORTRAIT_SCALE_TABLET;
  const logW = width / scale;
  const logH = height / scale;
  return {
    width: logW,
    height: logH,
    scale,
    isPortrait: true,
    carY: logH * CAR_Y_RATIO,
    borderWidth: Math.max(12, Math.min(BORDER_WIDTH, logW * 0.045)),
    carHeight: Math.max(78, Math.min(CAR_HEIGHT, logH * 0.14)),
    carWidth: Math.max(38, Math.min(CAR_WIDTH, logW * 0.12)),
    roadSampleStep: profile.isCompactWidth || isMobile ? 4 : ROAD_SAMPLE_STEP,
    trackWidth: Math.min(TRACK_WIDTH, logW * 0.86),
  };
}
class Renderer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.hud = new HudRenderer();
    this._screenRenderers = {
      [SCREENS.PREVIEW]: (ctx, w, h, gs, track) =>
        drawTrackPreviewScreen(ctx, w, h, track, gs),
      [SCREENS.START]: (ctx, w, h, gs, track) =>
        drawStartScreen(ctx, w, h, gs, track),
      [SCREENS.LEADERBOARD]: (ctx, w, h, gs, track) =>
        drawLeaderboardScreen(ctx, w, h, gs, track),
      [SCREENS.GAME_OVER]: (ctx, w, h, gs) => drawGameOverScreen(ctx, w, h, gs),
    };
  }
  draw(gameState, track, telemetry = null, dt = 1 / 60, stateManager = null) {
    const { ctx, canvas } = this;
    const width = canvas.width;
    const height = canvas.height;
    if (gameState.currentScreen !== SCREENS.RACE) {
      if (stateManager) {
        stateManager.render(ctx, width, height);
      } else {
        const screenFn = this._screenRenderers[gameState.currentScreen];
        if (screenFn) screenFn(ctx, width, height, gameState, track);
      }
      return;
    }
    const metrics = buildRenderMetrics(width, height);
    const { scale } = metrics;
    const logW = metrics.width;
    const logH = metrics.height;
    const shake = getCameraShakeOffset(gameState);
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    if (scale !== 1) ctx.scale(scale, scale);
    ctx.translate(shake.x, shake.y);
    drawTrack(ctx, gameState, track, metrics);
    drawObstacles(ctx, gameState, track, metrics);
    drawRivals(ctx, gameState, track, metrics);
    drawCar(ctx, gameState, track, metrics);
    ctx.restore();
    ctx.save();
    if (scale !== 1) ctx.scale(scale, scale);
    this.hud.draw(ctx, gameState, logW, logH);
    if (telemetry) telemetry.drawHUD(ctx, logW, logH, metrics.isPortrait);

    // ── Rain camera-flash VFX ──────────────────────────────────────────────
    const now = performance.now();
    if (now >= _nextRainFlashAt) {
      _rainFlashActive = true;
      _nextRainFlashAt = now + RAIN_FLASH_INTERVAL_MS + Math.random() * 1200;
    }
    if (_rainFlashActive) {
      // Scatter 4-8 bright white spots to simulate raindrops hitting lens
      const count = 4 + Math.floor(Math.random() * 5);
      for (let i = 0; i < count; i++) {
        const fx = Math.random() * logW;
        const fy = Math.random() * logH;
        const fr = 2 + Math.random() * 5;
        ctx.beginPath();
        ctx.arc(fx, fy, fr, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fill();
      }
      _rainFlashActive = false;
    }

    ctx.restore();
  }
  resetHud() {
    this.hud.reset();
  }
}
export { Renderer };
