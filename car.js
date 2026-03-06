import {
  AERO_MODES,
  BATTERY_MAX,
  SCREEN_HALF_RATIO,
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

function applyCarRaceInput(gameState, x, isDown, canvasWidth) {
  const halfScreen = canvasWidth * SCREEN_HALF_RATIO;

  if (x < halfScreen && isDown) {
    gameState.aeroMode =
      gameState.aeroMode === AERO_MODES.Z ? AERO_MODES.X : AERO_MODES.Z;
  } else if (x >= halfScreen) {
    gameState.isBoosting = isDown;
  }
}

function setCarBoost(gameState, isBoosting) {
  gameState.isBoosting = isBoosting;
}

export { applyCarRaceInput, createCarStateFields, setCarBoost };
