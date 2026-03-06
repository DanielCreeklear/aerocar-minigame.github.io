import {
  AERO_MODES,
  BATTERY_MAX,
  TRACK_TYPES,
} from "./constants/index.js";

function createCarStateFields() {
  return {
    aeroMode: AERO_MODES.X,
    isBoosting: false,
    isBraking: false,
    battery: BATTERY_MAX,
    speed: 0,
    currentZ: 0,
    trackType: TRACK_TYPES.STRAIGHT,
    isPenalized: false,
    currentSlip: 0,
    curveForce: 0,
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

function toggleCarMode(gameState) {
  const now = Date.now();
  const elapsed = now - (gameState.lastModeToggleAt || 0);

  if (elapsed >= MODE_TOGGLE_COOLDOWN_MS) {
    gameState.aeroMode =
      gameState.aeroMode === AERO_MODES.Z ? AERO_MODES.X : AERO_MODES.Z;
    gameState.lastModeToggleAt = now;
  }
}

function setCarBoost(gameState, isBoosting) {
  gameState.isBoosting = isBoosting;
}

function setCarBrake(gameState, isBraking) {
  gameState.isBraking = isBraking;
}

export { createCarStateFields, toggleCarMode, setCarBoost, setCarBrake };

