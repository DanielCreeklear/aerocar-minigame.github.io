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
} from "../../constants/index.js";

function updateHeadingAndLateral(
  gameState,
  curvature,
  vz,
  dt,
  lateralFriction,
) {
  const steerInput = gameState.steerInput || 0;
  let theta = gameState.carHeading || 0;

  const targetTheta = steerInput * MAX_STEER_HEADING;
  theta += (targetTheta - theta) * Math.min(1, HEADING_ALIGNMENT_RATE * dt);

  gameState.carHeading = clamp(theta, -Math.PI / 2, Math.PI / 2);

  const vxSteer = vz * Math.sin(theta);
  const vxCentrifugal = curvature * vz * CENTRIFUGAL_FACTOR;
  const x = (gameState.lateralOffset || 0) + (vxSteer - vxCentrifugal) * dt;

  return { x, vx: vxSteer - vxCentrifugal };
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
  const { x: rawX, vx: rawVx } = updateHeadingAndLateral(
    gameState,
    curvature,
    vz,
    dt,
    strategy.lateralFriction,
  );

  const { nextVz, isOffTrack } = applyOffTrackPenalties(
    gameState,
    rawX,
    vz,
    surfaceType,
    dt,
    curvature,
  );

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
    } else {
      x = x - Math.sign(x) * step;
    }
    rescuedVz = Math.min(nextVz, gameState.rescuePenaltySpeed || nextVz);
  } else if (Math.abs(x) > OFF_TRACK_RESCUE_THRESHOLD) {
    gameState.rescueInProgress = true;
    gameState.rescuePenaltySpeed = nextVz * OFF_TRACK_RESCUE_SPEED_FACTOR;
    gameState.carHeading = 0;
    rescuedVz = gameState.rescuePenaltySpeed;
    gameState.rescueFlashTimer = OFF_TRACK_RESCUE_FLASH_DURATION;
  }

  const vx =
    vz * Math.sin(gameState.carHeading) + curvature * vz * CENTRIFUGAL_FACTOR;

  gameState.currentSlip = clamp(Math.abs(rawVx) / MAX_LATERAL_VX, 0, 1);
  gameState.isPenalized = gameState.currentSlip > SLIP_PENALTY_THRESHOLD;
  gameState.lateralOffset = x;
  gameState.lateralVelocity = vx;
  gameState.isOffTrack = isOffTrack;

  return {
    nextVz: rescuedVz,
    forces: { centrifugalForce: 0, effectiveGrip: strategy.lateralFriction },
  };
}

export {
  updateHeadingAndLateral,
  applyOffTrackPenalties,
  integrateLateralState,
};
