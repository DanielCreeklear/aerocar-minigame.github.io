import { getAeroStrategy } from "../aero.js";
import { clamp, lerp } from "../../utils/math.js";
import {
  BOOST_BASE_GAIN,
  BOOST_MIN_EFFECT,
  BOOST_OVERCAP_RATIO,
  BOOST_SLIP_EFFECT_FACTOR,
  MANUAL_BRAKE_DECEL,
  SLIP_PENALTY_THRESHOLD,
  SLIP_SPEED_PENALTY_DRAG,
} from "../../constants/index.js";

function computeForwardVelocity(gameState, dt) {
  const strategy = getAeroStrategy(gameState.aeroMode);

  // 1. Empuxo + arrasto aerodinâmico
  let vz = gameState.speed || 0;
  vz = Math.min(strategy.maxVz, Math.max(0, vz + strategy.accel * dt));
  vz *= Math.pow(strategy.drag, dt);

  // 2. Boost ERS
  // BOOST_BASE_GAIN é expresso em percentual (ex: 16 = +16% de velocidade).
  // SlipPenalty degrada a eficácia enquanto o carro está derrapando em curva.
  const battery = gameState.battery || 0;
  if (gameState.isBoosting && battery > 0) {
    const slip = Math.max(0, gameState.currentSlip || 0);
    const slipPenalty = clamp(
      slip * BOOST_SLIP_EFFECT_FACTOR,
      0,
      1 - BOOST_MIN_EFFECT,
    );
    const boostFactor = 1 + (BOOST_BASE_GAIN / 100) * (1 - slipPenalty);
    vz = Math.min(strategy.maxVz * BOOST_OVERCAP_RATIO, vz * boostFactor);
  }

  // 3. Frenagem manual
  if (gameState.isBraking && vz > 0) {
    vz *= Math.pow(MANUAL_BRAKE_DECEL, dt);
  }

  // 4. Penalidade de slip — queda de velocidade proporcional ao excesso de slip
  if (gameState.isPenalized) {
    const slipMagnitude = clamp(gameState.currentSlip / SLIP_PENALTY_THRESHOLD, 0, 1);
    const slipDrag = lerp(1.0, SLIP_SPEED_PENALTY_DRAG, slipMagnitude);
    vz *= Math.pow(slipDrag, dt);
  }

  return clamp(vz, 0, strategy.maxVz * BOOST_OVERCAP_RATIO);
}

export { computeForwardVelocity };
