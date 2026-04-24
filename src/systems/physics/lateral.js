import { clamp } from "../../utils/math.js";
import {
  MAX_STEER_HEADING,
  HEADING_ALIGNMENT_RATE,
  SLIP_PENALTY_THRESHOLD,
  MAX_LATERAL_VX,
  OFF_TRACK_VZ_DRAG,
  OFF_TRACK_MAX_SPEED,
  OFF_TRACK_MAX_OFFSET_MARGIN,
  OFF_TRACK_RESCUE_THRESHOLD,
  OFF_TRACK_RESCUE_SPEED_FACTOR,
  OFF_TRACK_RESCUE_FLASH_DURATION,
  OFF_TRACK_RESCUE_RETURN_SPEED,
  OFF_TRACK_DUST_FRAMES,
  CURB_VZ_DRAG,
  CURB_HALF,
  SPIN_TRIGGER_SPEED,
  SPIN_EXIT_SPEED,
  SURFACE_TYPES,
  CENTRIFUGAL_FACTOR,
  CENTRIFUGAL_SLIDE_CURVE_THRESHOLD,
  CENTRIFUGAL_SLIDE_DURATION,
  LATERAL_ACCEL_SCALE,
  OFF_TRACK_LATERAL_FRICTION,
  DRIFT_RECOVERY_RATE,
  CENTRIFUGAL_DRIFT_BUILD_RATE,
  UNDERSTEER_FACTOR,
  // drift tuning
  DRIFT_MIN_FRICTION_FACTOR,
  DRIFT_FRICTION_SCALE,
  DRIFT_HEADING_AID,
  DRIFT_VX_REDUCTION,
  DRIFT_ERS_MIN_SLIP,
  DRIFT_REWARD_DELAY_S,
  MAX_OVERDRIVE_FACTOR,
  TELEMETRY_LATERAL_WARN_ENABLED,
  TELEMETRY_LATERAL_WARN_GRIP_RATIO,
  TELEMETRY_LATERAL_WARN_OVERDRIVE,
} from "../../constants/index.js";
import { getPhysicsValue } from "../../constants/physics-overrides.js";
function updateHeadingAndLateral(
  gameState,
  curvature,
  vz,
  dt,
  lateralFriction,
  aeroGripFactor,
  understeerFactor,
) {
  const steerInput = gameState.steerInput || 0;
  let theta = gameState.carHeading || 0;
  const targetTheta = steerInput * MAX_STEER_HEADING;
  // theta alignment will be applied after driftIntensity is computed so
  // we can increase heading alignment during drift (see below)
  const centrifugalFactorRuntime = getPhysicsValue("CENTRIFUGAL_FACTOR", CENTRIFUGAL_FACTOR);
  const vxDemand = (curvature + theta * 0.5) * vz * centrifugalFactorRuntime;
  // base grip estimate including aero contribution
  const baseGrip = lateralFriction + (aeroGripFactor || 0) * vz;
  const safeBaseGrip = Math.max(0.001, Number.isFinite(baseGrip) ? baseGrip : 0.001);
  const naiveGripRatio = Number.isFinite(vxDemand) ? Math.abs(vxDemand) / safeBaseGrip : 0;
  const rawOverdrive = Math.max(0, naiveGripRatio - 1);
  const frictionDrop = clamp(rawOverdrive * DRIFT_FRICTION_SCALE, 0, 0.95);
  const effectiveGripLimit = Math.max(
    lateralFriction * DRIFT_MIN_FRICTION_FACTOR,
    safeBaseGrip * (1 - frictionDrop),
  );
  const safeEffectiveGrip = Math.max(0.001, effectiveGripLimit);
  const gripRatio = Number.isFinite(vxDemand) ? Math.abs(vxDemand) / safeEffectiveGrip : 0;
  const overDriveFactor = Math.max(0, gripRatio - 1);
  // store the computed value
  gameState.overDriveFactor = overDriveFactor;

  // Conservative runtime guard
  const clampedOverDrive = Math.min(overDriveFactor, MAX_OVERDRIVE_FACTOR);
  const usedOverDrive = clampedOverDrive;
  const usf = understeerFactor ?? getPhysicsValue("UNDERSTEER_FACTOR", UNDERSTEER_FACTOR);
  const driftIntensity = Math.max(0, gripRatio - 1);
  // reduce steering effectiveness during heavy drift to decouple heading from trajectory
  const steerEffectiveness = clamp(
    1 - usedOverDrive * usf * (1 + driftIntensity * getPhysicsValue("DRIFT_VX_REDUCTION", DRIFT_VX_REDUCTION)),
    0,
    1,
  );
  const vxSteer = vz * Math.sin(theta) * steerEffectiveness;
  // increase heading alignment rate while drifting to allow stronger visual rotation
  const alignmentRate = HEADING_ALIGNMENT_RATE * (1 + driftIntensity * (DRIFT_HEADING_AID || 0));
  theta += (targetTheta - theta) * Math.min(1, alignmentRate * dt);
  gameState.carHeading = clamp(theta, -Math.PI / 2, Math.PI / 2);
  let drift = gameState.centrifugalDrift || 0;
  if (gripRatio <= 1) {
    drift *= Math.pow(getPhysicsValue("DRIFT_RECOVERY_RATE", DRIFT_RECOVERY_RATE), dt);
  } else {
    const buildRate = getPhysicsValue("CENTRIFUGAL_DRIFT_BUILD_RATE", CENTRIFUGAL_DRIFT_BUILD_RATE) * overDriveFactor * dt;
    const rawDelta = vxDemand - drift;
    drift += Math.sign(rawDelta) * Math.min(Math.abs(rawDelta), buildRate);
  }
  gameState.centrifugalDrift = drift;
  const vx = vxSteer - drift;
  const x = (gameState.lateralOffset || 0) + vx * dt;
  // return diagnostic information so callers (telemetry) can report it
  return {
    x,
    vx,
    diag: {
      vxDemand,
      gripLimit: safeEffectiveGrip,
      gripRatio,
      overDriveFactor,
      steerEffectiveness,
      drift,
      // expose the clamped value used for steering so we can correlate
      // DT behaviour with what we adjusted at runtime
      runtime: { usedOverDrive },
    },
  };
}
function applyOffTrackPenalties(gameState, x, vz, surfaceType, dt, curvature) {
  const isOffTrack = surfaceType === SURFACE_TYPES.GRASS;
  const isOnCurb = surfaceType === SURFACE_TYPES.CURB;
  let nextVz = vz;
  if (isOffTrack) {
    nextVz *= Math.pow(OFF_TRACK_VZ_DRAG, dt);
    nextVz = Math.min(nextVz, OFF_TRACK_MAX_SPEED);
    gameState.offTrackDustTimer = OFF_TRACK_DUST_FRAMES;
    if (vz > SPIN_TRIGGER_SPEED) {
      gameState.isSpinning = true;
    }
    if (gameState.isSpinning && vz < SPIN_EXIT_SPEED) {
      gameState.isSpinning = false;
    }
    if (Math.abs(curvature) >= CENTRIFUGAL_SLIDE_CURVE_THRESHOLD) {
      gameState.centrifugalSlideTimer = CENTRIFUGAL_SLIDE_DURATION;
    }
  } else if (isOnCurb) {
    nextVz *= Math.pow(CURB_VZ_DRAG, dt);
    gameState.isSpinning = false;
    gameState.offTrackDustTimer = Math.max(
      0,
      (gameState.offTrackDustTimer || 0) - dt,
    );
  } else {
    gameState.isSpinning = false;
    gameState.offTrackDustTimer = Math.max(
      0,
      (gameState.offTrackDustTimer || 0) - dt,
    );
  }
  if (!isOffTrack) {
    gameState.centrifugalSlideTimer = Math.max(
      0,
      (gameState.centrifugalSlideTimer || 0) - dt,
    );
  }
  return { nextVz, isOffTrack };
}
function integrateLateralState(
  gameState,
  curvature,
  vz,
  dt,
  strategy,
  surfaceType,
) {
  const lateralFriction =
    surfaceType === SURFACE_TYPES.GRASS
      ? OFF_TRACK_LATERAL_FRICTION
      : strategy.lateralFriction;
  const offTrack = surfaceType === SURFACE_TYPES.GRASS;
  const effectiveCurvatureForLateral = offTrack ? 0 : curvature;
  if (offTrack) {
    gameState.centrifugalDrift =
      (gameState.centrifugalDrift || 0) * Math.pow(0.12, dt);
  }
  const { x: rawX, vx: rawVx, diag } = updateHeadingAndLateral(
    gameState,
    effectiveCurvatureForLateral,
    vz,
    dt,
    lateralFriction,
    offTrack ? 0 : strategy.aeroGripFactor,
    offTrack ? 0 : strategy.understeerFactor,
  );
  const { nextVz: vzAfterOffTrack, isOffTrack } = applyOffTrackPenalties(
    gameState,
    rawX,
    vz,
    surfaceType,
    dt,
    curvature,
  );

  const overDrive = gameState.overDriveFactor || 0;
  const nextVz = !offTrack && overDrive > 0
    ? vzAfterOffTrack * Math.pow(1 - clamp(overDrive * 0.008, 0, 0.008), dt)
    : vzAfterOffTrack;
  const wall = CURB_HALF + OFF_TRACK_MAX_OFFSET_MARGIN;
  let x = rawX;
  if (x > wall) {
    x = wall;
    if (gameState.carHeading > 0) gameState.carHeading = 0;
  } else if (x < -wall) {
    x = -wall;
    if (gameState.carHeading < 0) gameState.carHeading = 0;
  }
  let rescuedVz = nextVz;
  if (gameState.rescueInProgress) {
    const step = OFF_TRACK_RESCUE_RETURN_SPEED * dt;
    if (Math.abs(x) <= step) {
      x = 0;
      gameState.rescueInProgress = false;
      gameState.lateralVelocity = 0;
      gameState.centrifugalDrift = 0;
    } else {
      x = x - Math.sign(x) * step;
    }
    rescuedVz = Math.min(nextVz, gameState.rescuePenaltySpeed || nextVz);
  } else if (Math.abs(x) > OFF_TRACK_RESCUE_THRESHOLD) {
    gameState.rescueInProgress = true;
    gameState.rescuePenaltySpeed = nextVz * OFF_TRACK_RESCUE_SPEED_FACTOR;
    gameState.carHeading = 0;
    gameState.centrifugalDrift = 0;
    rescuedVz = gameState.rescuePenaltySpeed;
    gameState.rescueFlashTimer = OFF_TRACK_RESCUE_FLASH_DURATION;
  }
  gameState.currentSlip = clamp(Math.abs(rawVx) / MAX_LATERAL_VX, 0, 1);
  gameState.isPenalized = gameState.currentSlip > SLIP_PENALTY_THRESHOLD;
  gameState.lateralOffset = x;
  gameState.lateralVelocity = rawVx;
  gameState.isOffTrack = isOffTrack;
  // drift timing & flag (sustain requirement before rewarded)
  if (!gameState.isSpinning && gameState.currentSlip >= DRIFT_ERS_MIN_SLIP && (gameState.overDriveFactor || 0) > 0) {
    gameState.driftTimer = (gameState.driftTimer || 0) + dt;
  } else {
    gameState.driftTimer = 0;
  }
  gameState.isDrifting = !gameState.isSpinning && (gameState.driftTimer || 0) >= DRIFT_REWARD_DELAY_S && gameState.currentSlip >= DRIFT_ERS_MIN_SLIP;
  // expose computed diagnostics and forces for telemetry consumers
  const forces = {
    // surface-level effective grip
    effectiveGrip: strategy.lateralFriction,
    // expose a centrifugal-like force for telemetry/UI (use vxDemand when available)
    centrifugalForce: diag && Number.isFinite(diag.vxDemand) ? Math.abs(diag.vxDemand) : 0,
  };

  return {
    nextVz: rescuedVz,
    forces,
    diag: diag || null,
  };
}
export {
  updateHeadingAndLateral,
  applyOffTrackPenalties,
  integrateLateralState,
};
