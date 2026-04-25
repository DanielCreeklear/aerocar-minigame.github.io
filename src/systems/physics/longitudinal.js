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
  BOOST_BATTERY_DRAIN,
} from "../../constants/index.js";
import { getPhysicsValue } from "../../constants/physics-overrides.js";
function computeForwardVelocity(gameState, dt, strategy) {
  
  const accelX = getPhysicsValue("VZ_ACCEL_MODE_X", strategy.name === 'X' ? strategy.accel : undefined);
  const accelZ = getPhysicsValue("VZ_ACCEL_MODE_Z", strategy.name === 'Z' ? strategy.accel : undefined);
  const dragX = getPhysicsValue("VZ_DRAG_MODE_X", strategy.name === 'X' ? strategy.drag : undefined);
  const dragZ = getPhysicsValue("VZ_DRAG_MODE_Z", strategy.name === 'Z' ? strategy.drag : undefined);
  const maxX = getPhysicsValue("VZ_MAX_MODE_X", strategy.name === 'X' ? strategy.maxVz : undefined);
  const maxZ = getPhysicsValue("VZ_MAX_MODE_Z", strategy.name === 'Z' ? strategy.maxVz : undefined);
  const boostGain = getPhysicsValue("BOOST_BASE_GAIN", BOOST_BASE_GAIN);
  
  const boostDrain = getPhysicsValue("BOOST_BATTERY_DRAIN", BOOST_BATTERY_DRAIN);
  const boostMin = getPhysicsValue("BOOST_MIN_EFFECT", BOOST_MIN_EFFECT);
  const boostSlipFactor = getPhysicsValue("BOOST_SLIP_EFFECT_FACTOR", BOOST_SLIP_EFFECT_FACTOR);
  const offTrackAccelFactor = getPhysicsValue("OFF_TRACK_ACCEL_FACTOR", OFF_TRACK_ACCEL_FACTOR);
  const overspeedDrag = getPhysicsValue("OVERSPEED_DRAG", OVERSPEED_DRAG);

  let vz = gameState.speed || 0;
  if (!gameState.isSpinning) {
    const accelFactor = gameState.isOffTrack ? offTrackAccelFactor : 1;
    
    const maxVz = strategy.name === 'X' ? maxX ?? strategy.maxVz : maxZ ?? strategy.maxVz;
    const accel = strategy.name === 'X' ? accelX ?? strategy.accel : accelZ ?? strategy.accel;
    const drag = strategy.name === 'X' ? dragX ?? strategy.drag : dragZ ?? strategy.drag;
    const speedRatio = maxVz > 0 ? vz / maxVz : 0;
    const accelTaper = Math.max(0, 1 - speedRatio * speedRatio);
    vz = Math.max(0, vz + accel * accelFactor * accelTaper * dt);
    vz *= Math.pow(drag, dt);
  }
  const battery = gameState.battery || 0;
  if (gameState.isBoosting && battery > 0) {
    const slip = Math.max(0, gameState.currentSlip || 0);
    const slipPenalty = clamp(slip * boostSlipFactor, 0, 1 - boostMin);
    const maxVz = strategy.name === 'X' ? (maxX ?? strategy.maxVz) : (maxZ ?? strategy.maxVz);
    const maxBoostVz = maxVz * getPhysicsValue("BOOST_OVERCAP_RATIO", BOOST_OVERCAP_RATIO);
    if (vz < maxBoostVz) {
      const boostAccel = (strategy.accel || 0) * (boostGain / 100) * (1 - slipPenalty);
      const boostRatio = vz / maxBoostVz;
      const boostTaper = Math.max(0, 1 - boostRatio * boostRatio);
      vz = Math.min(maxBoostVz, vz + boostAccel * boostTaper * dt);
    }
    
    
  }
  if (gameState.isBraking && vz > 0) {
    
    
    gameState.brakeRamp = Math.min(1, (gameState.brakeRamp || 0) + dt * BRAKE_RAMP_RATE);
    const expRamp = (gameState.brakeRamp || 0) * (gameState.brakeRamp || 0);
    const effectiveDecel =
      MANUAL_BRAKE_DECEL_SOFT + (MANUAL_BRAKE_DECEL - MANUAL_BRAKE_DECEL_SOFT) * expRamp;
    vz *= Math.pow(effectiveDecel, dt);
  } else {
    gameState.brakeRamp = 0;
  }
  
  const maxVzActive = strategy.name === 'X' ? (maxX ?? strategy.maxVz) : (maxZ ?? strategy.maxVz);
  if (vz > maxVzActive) {
    vz = maxVzActive + (vz - maxVzActive) * Math.pow(overspeedDrag, dt);
  }
  return Math.max(0, vz);
}
export { computeForwardVelocity };
