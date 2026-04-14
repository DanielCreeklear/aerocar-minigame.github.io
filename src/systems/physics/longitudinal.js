import { getAeroStrategy } from "../aero.js";
import { clamp, lerp } from "../../utils/math.js";
import {
  BOOST_BASE_GAIN,
  BOOST_MIN_EFFECT,
  BOOST_SLIP_EFFECT_FACTOR,
  MANUAL_BRAKE_DECEL,
  SLIP_PENALTY_THRESHOLD,
  SLIP_SPEED_PENALTY_DRAG,
  CENTRIFUGAL_SCALE_C,
  SLIP_BLEND_START,
  SLIP_BLEND_RANGE,
  SLIP_GRIP_EROSION,
  GRIP_MIN_FLOOR,
} from "../../constants/index.js";

// Pré-calcula slip e isPenalized usando a velocidade do frame anterior (gameState.speed)
function precomputeSlip(gameState, effectiveCurvature) {
  const strategy = getAeroStrategy(gameState.aeroMode);
  const vz = gameState.speed || 0;

  const centrifugalForce = vz * vz * effectiveCurvature * CENTRIFUGAL_SCALE_C;
  const absCentrifugalForce = Math.abs(centrifugalForce);
  const safeGrip = Math.max(strategy.maxGrip, GRIP_MIN_FLOOR);
  const slipRatio = absCentrifugalForce / safeGrip;
  const slipBlend = clamp(
    (slipRatio - SLIP_BLEND_START) / SLIP_BLEND_RANGE,
    0,
    1,
  );
  const effectiveGrip = safeGrip * (1 - slipBlend * SLIP_GRIP_EROSION);

  gameState.currentSlip = Math.max(0, absCentrifugalForce - effectiveGrip);
  gameState.isPenalized = gameState.currentSlip > SLIP_PENALTY_THRESHOLD;
}

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

  // 4. Penalidade de slip
  if (gameState.isPenalized) {
    const slipMagnitude = clamp(
      gameState.currentSlip / SLIP_PENALTY_THRESHOLD,
      0,
      1,
    );
    const slipDrag = lerp(1.0, SLIP_SPEED_PENALTY_DRAG, slipMagnitude);
    vz *= Math.pow(slipDrag, dt);
  }

  return Math.max(0, vz);
}

export { computeForwardVelocity, precomputeSlip };
