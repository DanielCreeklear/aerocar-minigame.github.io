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
    currentTrackPoint: null,
    isOffTrack: false,
    offTrackDustTimer: 0,
  };
}

function applyCarRaceInput(gameState, x, isDown, canvasWidth, canvasHeight) {
  const ratios = getInputRatios(canvasWidth, canvasHeight);
  const leftBoundary = canvasWidth * ratios.left;
  const rightBoundary = canvasWidth * ratios.right;

  if (x <= leftBoundary && isDown) {
    gameState.aeroMode =
      gameState.aeroMode === AERO_MODES.Z ? AERO_MODES.X : AERO_MODES.Z;
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
