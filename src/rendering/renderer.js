import { drawTrack } from "./track-renderer.js";
import { drawCar, computeCarDrawPosition, createTrailState } from "./car-renderer.js";
import { createSkidLayer } from "./skid-layer.js";
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
  CAMERA_LOOKAHEAD_Z,
  CAMERA_LOOKAHEAD_FACTOR,
  CAMERA_LATERAL_VEL_LOOKAHEAD,
  CAMERA_LERP,
  ZOOM_BASE,
  ZOOM_MIN,
  ZOOM_LERP,
  BRAKE_ZOOM_BONUS,
  SKID_SLIP_THRESHOLD,
  SKID_LATERAL_VEL_THRESHOLD,
} from "../constants/index.js";
import { AERO_MODES } from "../constants/index.js";
import { isMobile } from "../utils/platform.js";
const PORTRAIT_SCALE_COMPACT = 0.68;
const PORTRAIT_SCALE_TABLET = 0.8;
const CAMERA_SHAKE_SPEED_KMH_SCALE = 17;
const CAMERA_SHAKE_SPEED_MIN = 325;
const CAMERA_SHAKE_SPEED_MAX = 375;
const CAMERA_SHAKE_MAX_PX = 2.8;


const RAIN_FLASH_INTERVAL_MS = 1800;
const RAIN_FLASH_DURATION_MS = 16;
function getCameraShakeOffset(gameState, out) {
  const rawSpeed = gameState?.speed || 0;
  const speedKmh = rawSpeed * CAMERA_SHAKE_SPEED_KMH_SCALE;
  if (speedKmh <= CAMERA_SHAKE_SPEED_MIN) {
    out.x = 0;
    out.y = 0;
    return out;
  }
  const t = Math.min(1, (speedKmh - CAMERA_SHAKE_SPEED_MIN) / (CAMERA_SHAKE_SPEED_MAX - CAMERA_SHAKE_SPEED_MIN));
  const amp = CAMERA_SHAKE_MAX_PX * t;
  const jitter = amp * 0.1;
  const time = performance.now() * 0.028;
  out.x = Math.sin(time * 1.7) * amp + (Math.random() * 2 - 1) * jitter;
  out.y = Math.cos(time * 2.3 + 0.9) * amp * 0.72 + (Math.random() * 2 - 1) * jitter * 0.8;
  return out;
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
  const scale = profile.isCompactWidth ? PORTRAIT_SCALE_COMPACT : PORTRAIT_SCALE_TABLET;
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
    
    this._cameraX = 0;
    this._worldZoom = ZOOM_BASE;
    
    this._skidLayer = null;
    
    this._nextRainFlashAt = 0;
    this._rainFlashActive = false;
    this._screenRenderers = {
      [SCREENS.PREVIEW]: (ctx, w, h, gs, track) =>
        drawTrackPreviewScreen(ctx, w, h, track, gs),
      [SCREENS.START]: (ctx, w, h, gs, track) =>
        drawStartScreen(ctx, w, h, gs, track),
      [SCREENS.LEADERBOARD]: (ctx, w, h, gs, track) =>
        drawLeaderboardScreen(ctx, w, h, gs, track),
      [SCREENS.GAME_OVER]: (ctx, w, h, gs) => drawGameOverScreen(ctx, w, h, gs),
    };
    
    
    
    
    this._trailState = createTrailState();
    
    this._renderCaches = {
      barrierCache: new Map(),
      boostGradCache: {},
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
    
    if (!this._metricsCache || this._metricsCache.w !== width || this._metricsCache.h !== height) {
      this._metricsCache = {
        w: width,
        h: height,
        metrics: buildRenderMetrics(width, height),
      };
    }
    const metrics = this._metricsCache.metrics;
    const { scale } = metrics;
    const logW = metrics.width;
    const logH = metrics.height;
    
    if (!this._shake) this._shake = { x: 0, y: 0 };
    getCameraShakeOffset(gameState, this._shake);
    this._shake.x = Math.round(this._shake.x);
    this._shake.y = Math.round(this._shake.y);
    ctx.imageSmoothingEnabled = false; 
    
    if (!this._skidLayer) {
      this._skidLayer = createSkidLayer();
    }

    
    
    
    
    const carTrackInfo = gameState.currentTrackPoint || track.getTrackPoint(gameState.currentZ);
    const desiredCameraX =
      carTrackInfo.x + (gameState.lateralVelocity || 0) * CAMERA_LATERAL_VEL_LOOKAHEAD;
    this._cameraX += (desiredCameraX - this._cameraX) * Math.min(1, CAMERA_LERP * dt);
    const roundedCameraX = Math.round(this._cameraX);

    
    let targetZoom = ZOOM_BASE;
    if (gameState.aeroMode === AERO_MODES.Z) {
      targetZoom = ZOOM_BASE - (gameState.isBraking ? BRAKE_ZOOM_BONUS : 0);
      targetZoom = Math.max(ZOOM_MIN, targetZoom);
    }
    this._worldZoom += (targetZoom - this._worldZoom) * Math.min(1, ZOOM_LERP * dt);

    
    const carDrawPos = computeCarDrawPosition(gameState, metrics.width, metrics.height);

    const slipVal = gameState.currentSlip || 0;
    const latV = Math.abs(gameState.lateralVelocity || 0);
    if (this._prevCarZ !== undefined && this._skidLayer) {
      const shouldSkid = slipVal >= SKID_SLIP_THRESHOLD || latV >= SKID_LATERAL_VEL_THRESHOLD;
      if (shouldSkid) {
        const intensity = Math.min(1, Math.max(slipVal, latV / 20));
        const color = gameState.aeroMode === AERO_MODES.X ? 'rgba(30,30,30,0.9)' : 'rgba(60,60,60,0.65)';
        this._skidLayer.addSkid(
          this._prevCarZ, this._prevCarLat,
          gameState.currentZ, gameState.lateralOffset || 0,
          intensity, color,
        );
      }
    }
    this._prevCarZ = gameState.currentZ;
    this._prevCarLat = gameState.lateralOffset || 0;

    
    ctx.save();
    if (scale !== 1) ctx.scale(scale, scale);
    if (this._worldZoom !== ZOOM_BASE) {
      
      ctx.translate(logW * 0.5, logH * 0.5);
      ctx.scale(this._worldZoom, this._worldZoom);
      ctx.translate(-logW * 0.5, -logH * 0.5);
    }
    ctx.translate(this._shake.x, this._shake.y);

    
    drawTrack(ctx, gameState, track, metrics, roundedCameraX, this._renderCaches);
    
    if (this._skidLayer) {
      this._skidLayer.drawTo(ctx, gameState, track, metrics, roundedCameraX);
    }
    drawObstacles(ctx, gameState, track, metrics);
    drawRivals(ctx, gameState, track, metrics);
    
    
    drawCar(ctx, gameState, track, metrics, this._trailState, this._renderCaches);
    ctx.restore();
    ctx.save();
    if (scale !== 1) ctx.scale(scale, scale);
    this.hud.draw(ctx, gameState, logW, logH);
    if (telemetry) telemetry.drawHUD(ctx, logW, logH, metrics.isPortrait);

    
    const now = performance.now();
    if (now >= this._nextRainFlashAt) {
      this._rainFlashActive = true;
      this._nextRainFlashAt = now + RAIN_FLASH_INTERVAL_MS + Math.random() * 1200;
    }
    if (this._rainFlashActive) {
      
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
      this._rainFlashActive = false;
    }

    ctx.restore();

    
    if (gameState.isTutorial && stateManager) {
      stateManager.render(ctx, width, height);
    }
  }
  resetHud() {
    this.hud.reset();
  }
}
export { Renderer };
