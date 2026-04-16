import { clamp } from "../../utils/math.js";
import {
  BOOST_BASE_GAIN,
  BOOST_MIN_EFFECT,
  BOOST_SLIP_EFFECT_FACTOR,
  BOOST_OVERCAP_RATIO,
  MANUAL_BRAKE_DECEL,
  MANUAL_BRAKE_DECEL_SOFT,
  BRAKE_RAMP_RATE,
  OFF_TRACK_ACCEL_FACTOR,
  OVERSPEED_DRAG,
} from "../../constants/index.js";

let _brakeRamp = 0;

function computeForwardVelocity(gameState, dt, strategy) {
  let vz = gameState.speed || 0;
  if (!gameState.isSpinning) {
    const accelFactor = gameState.isOffTrack ? OFF_TRACK_ACCEL_FACTOR : 1;
    const speedRatio = strategy.maxVz > 0 ? vz / strategy.maxVz : 0;
    const accelTaper = Math.max(0, 1 - speedRatio * speedRatio);
    vz = Math.max(0, vz + strategy.accel * accelFactor * accelTaper * dt);
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
    const maxBoostVz = strategy.maxVz * BOOST_OVERCAP_RATIO;
    if (vz < maxBoostVz) {
      const boostAccel = strategy.accel * (BOOST_BASE_GAIN / 100) * (1 - slipPenalty);
      const boostRatio = vz / maxBoostVz;
      const boostTaper = Math.max(0, 1 - boostRatio * boostRatio);
      vz = Math.min(maxBoostVz, vz + boostAccel * boostTaper * dt);
    }
  }

  if (gameState.isBraking && vz > 0) {
    _brakeRamp = Math.min(1, _brakeRamp + dt * BRAKE_RAMP_RATE);
    
    const expRamp = _brakeRamp * _brakeRamp;
    const effectiveDecel =
      MANUAL_BRAKE_DECEL_SOFT +
      (MANUAL_BRAKE_DECEL - MANUAL_BRAKE_DECEL_SOFT) * expRamp;
    vz *= Math.pow(effectiveDecel, dt);
  } else {
    _brakeRamp = 0;
  }

  if (vz > strategy.maxVz) {
    vz = strategy.maxVz + (vz - strategy.maxVz) * Math.pow(OVERSPEED_DRAG, dt);
  }

  return Math.max(0, vz);
}

export { computeForwardVelocity };
