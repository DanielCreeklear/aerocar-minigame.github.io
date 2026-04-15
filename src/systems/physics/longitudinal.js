import { clamp } from "../../utils/math.js";
import {
  BOOST_BASE_GAIN,
  BOOST_MIN_EFFECT,
  BOOST_SLIP_EFFECT_FACTOR,
  MANUAL_BRAKE_DECEL,
  OFF_TRACK_ACCEL_FACTOR,
  OVERSPEED_DRAG,
} from "../../constants/index.js";

function computeForwardVelocity(gameState, dt, strategy) {
  
  
  
  let vz = gameState.speed || 0;
  if (!gameState.isSpinning) {
    const accelFactor = gameState.isOffTrack ? OFF_TRACK_ACCEL_FACTOR : 1;
    vz = Math.max(0, vz + strategy.accel * accelFactor * dt);
  }
  vz *= Math.pow(strategy.drag, dt);

  
  const battery = gameState.battery || 0;
  if (gameState.isBoosting && battery > 0) {
    const slip = Math.max(0, gameState.currentSlip || 0);
    const slipPenalty = clamp(
      slip * BOOST_SLIP_EFFECT_FACTOR,
      0,
      1 - BOOST_MIN_EFFECT,
    );
    const boostFactor = 1 + (BOOST_BASE_GAIN / 100) * (1 - slipPenalty);
    vz *= boostFactor;
  }

  
  if (gameState.isBraking && vz > 0) {
    vz *= Math.pow(MANUAL_BRAKE_DECEL, dt);
  }

  
  
  if (vz > strategy.maxVz) {
    vz =
      strategy.maxVz +
      (vz - strategy.maxVz) * Math.pow(OVERSPEED_DRAG, dt);
  }

  return Math.max(0, vz);
}

export { computeForwardVelocity };
