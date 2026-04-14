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
    roadSampleStep: profile.isCompactWidth ? 4 : ROAD_SAMPLE_STEP,
    trackWidth: Math.min(TRACK_WIDTH, width * 0.86),
  };
}

class Renderer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.hud = new HudRenderer();
  }

  draw(gameState, track, telemetry = null) {
    const { ctx, canvas } = this;
    const width = canvas.width;
    const height = canvas.height;

    if (gameState.currentScreen === SCREENS.PREVIEW) {
      drawTrackPreviewScreen(ctx, width, height, track);
      return;
    }

    if (gameState.currentScreen === SCREENS.START) {
      drawStartScreen(ctx, width, height);
      return;
    }

    if (gameState.currentScreen === SCREENS.GAME_OVER) {
      drawGameOverScreen(ctx, width, height, gameState.finalTime);
      return;
    }

    const metrics = buildRenderMetrics(width, height);
    drawTrack(ctx, gameState, track, metrics);
    drawCar(ctx, gameState, track, metrics);
    this.hud.draw(ctx, gameState, width, height);
    if (telemetry) telemetry.drawHUD(ctx, width, height, metrics.isPortrait);
  }

  resetHud() {
    this.hud.reset();
  }
}

export { Renderer };
