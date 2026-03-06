import {
  AERO_MODES,
  BATTERY_MAX,
  getInputRatios,
  TRACK_TYPES,
} from "./constants/index.js";

function createCarStateFields() {
  return {
    aeroMode: AERO_MODES.X,
    isBoosting: false,
    battery: BATTERY_MAX,
    speed: 0,
    currentZ: 0,
    trackType: TRACK_TYPES.STRAIGHT,
    isPenalized: false,
    currentSlip: 0,
    curveForce: 0,
    isVirtualBraking: false,
    currentSegmentIndex: 1,
    lateralOffset: 0,
    lateralVelocity: 0,
    currentCurvature: 0,
    previousCurvature: 0,
    currentTrackPoint: null,
    lastModeToggleAt: 0,
    isOffTrack: false,
    offTrackDustTimer: 0,
  };
}

const MODE_TOGGLE_COOLDOWN_MS = 220;

function applyCarRaceInput(gameState, x, isDown, canvasWidth, canvasHeight) {
  const ratios = getInputRatios(canvasWidth, canvasHeight);
  const leftBoundary = canvasWidth * ratios.left;
  const rightBoundary = canvasWidth * ratios.right;

  if (x <= leftBoundary && isDown) {
    const now = Date.now();
    const elapsed = now - (gameState.lastModeToggleAt || 0);

    if (elapsed >= MODE_TOGGLE_COOLDOWN_MS) {
      gameState.aeroMode =
        gameState.aeroMode === AERO_MODES.Z ? AERO_MODES.X : AERO_MODES.Z;
      gameState.lastModeToggleAt = now;
    }
  } else if (x >= rightBoundary) {
    gameState.isBoosting = isDown;
  } else if (!isDown) {
    gameState.isBoosting = false;
  }
}

function setCarBoost(gameState, isBoosting) {
  gameState.isBoosting = isBoosting;
}

export { applyCarRaceInput, createCarStateFields, setCarBoost };
