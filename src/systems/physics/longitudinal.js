import { getAeroStrategy } from "../aero.js";
import { clamp } from "../../utils/math.js";
import {
  BOOST_BASE_GAIN,
  BOOST_MIN_EFFECT,
  BOOST_SLIP_EFFECT_FACTOR,
  MANUAL_BRAKE_DECEL,
} from "../../constants/index.js";

function computeForwardVelocity(gameState, dt) {
  const strategy = getAeroStrategy(gameState.aeroMode);

  // 1. Empuxo + arrasto aerodinâmico
  let vz = gameState.speed || 0;
  if (!gameState.isOffTrack && !gameState.isSpinning) {
    vz = Math.max(0, vz + strategy.accel * dt);
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

  return Math.max(0, Math.min(vz, strategy.maxVz));
}

export { computeForwardVelocity };
