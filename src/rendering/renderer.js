import { drawTrack } from "./track-renderer.js";
import { drawCar } from "./car-renderer.js";
import { HudRenderer } from "./hud-renderer.js";
import {
  drawStartScreen,
  drawGameOverScreen,
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

const CAMERA_SHAKE_SPEED_KMH_SCALE = 17;
const CAMERA_SHAKE_SPEED_MIN = 300;
const CAMERA_SHAKE_SPEED_MAX = 340;
const CAMERA_SHAKE_MAX_PX = 2.8;

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
      isPortrait: profile.isPortrait,
      carY: height * CAR_Y_RATIO,
      borderWidth: BORDER_WIDTH,
      carHeight: CAR_HEIGHT,
      carWidth: CAR_WIDTH,
      roadSampleStep: ROAD_SAMPLE_STEP,
      trackWidth: TRACK_WIDTH,
    };
  }

  return {
    width,
    height,
    isPortrait: true,
    carY: height * CAR_Y_RATIO,
    borderWidth: Math.max(12, Math.min(BORDER_WIDTH, width * 0.045)),
    carHeight: Math.max(78, Math.min(CAR_HEIGHT, height * 0.14)),
    carWidth: Math.max(38, Math.min(CAR_WIDTH, width * 0.12)),
    // On compact or generic mobile viewports use a coarser sample step to
    // reduce the number of draw calls per frame and keep the frame rate
    // stable on low-end Android devices.
    roadSampleStep:
      profile.isCompactWidth || isMobile ? 4 : ROAD_SAMPLE_STEP,
    trackWidth: Math.min(TRACK_WIDTH, width * 0.86),
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
      [SCREENS.GAME_OVER]: (ctx, w, h, gs) => drawGameOverScreen(ctx, w, h, gs),
    };
  }

  draw(gameState, track, telemetry = null) {
    const { ctx, canvas } = this;
    const width = canvas.width;
    const height = canvas.height;

    const screenFn = this._screenRenderers[gameState.currentScreen];
    if (screenFn) {
      screenFn(ctx, width, height, gameState, track);
      return;
    }

    const metrics = buildRenderMetrics(width, height);
    const shake = getCameraShakeOffset(gameState);
    ctx.imageSmoothingEnabled = false;

    ctx.save();
    ctx.translate(shake.x, shake.y);
    drawTrack(ctx, gameState, track, metrics);
    drawCar(ctx, gameState, track, metrics);
    ctx.restore();

    this.hud.draw(ctx, gameState, width, height);
    if (telemetry) telemetry.drawHUD(ctx, width, height, metrics.isPortrait);
  }

  resetHud() {
    this.hud.reset();
  }
}

export { Renderer };
