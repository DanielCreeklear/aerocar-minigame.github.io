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
  // 1. Empuxo + arrasto aerodinâmico
  // Off-track: allow reduced accel so the car can steer itself back to the track.
  // Spinning: no accel until spin exits.
  let vz = gameState.speed || 0;
  if (!gameState.isSpinning) {
    const accelFactor = gameState.isOffTrack ? OFF_TRACK_ACCEL_FACTOR : 1;
    vz = Math.max(0, vz + strategy.accel * accelFactor * dt);
  }
  vz *= Math.pow(strategy.drag, dt);

  // 2. Boost ERS
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

  // 3. Frenagem manual
  if (gameState.isBraking && vz > 0) {
    vz *= Math.pow(MANUAL_BRAKE_DECEL, dt);
  }

  // 4. Gradual overspeed decay: instead of hard-clamping to maxVz (which causes
  // a jarring instant snap when switching modes), bleed off excess speed smoothly.
  if (vz > strategy.maxVz) {
    vz =
      strategy.maxVz +
      (vz - strategy.maxVz) * Math.pow(OVERSPEED_DRAG, dt);
  }

  return Math.max(0, vz);
}

export { computeForwardVelocity };
