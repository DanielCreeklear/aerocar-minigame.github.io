import { clamp } from "../../utils/math.js";
import {
  HEADING_CURVE_FACTOR,
  STEER_YAW_RATE,
  SLIP_PENALTY_THRESHOLD,
  MAX_LATERAL_VX,
  OFF_TRACK_VZ_DRAG,
  OFF_TRACK_VX_DRAG,
  OFF_TRACK_MAX_SPEED,
  OFF_TRACK_DUST_FRAMES,
  CURB_VZ_DRAG,
  PHYSICS_TRACK_HALF,
  CURB_HALF,
  SPIN_TRIGGER_SPEED,
  SPIN_EXIT_SPEED,
} from "../../constants/index.js";

function updateHeadingAndLateral(gameState, curvature, vz, dt) {
  const steerInput = gameState.steerInput || 0;
  let theta = gameState.carHeading || 0;
  theta += curvature * HEADING_CURVE_FACTOR * vz * dt;

  theta += steerInput * STEER_YAW_RATE * dt;

  // No self-alignment damping: heading only changes via curvature or player steer.
  // Clamp to ±90° to prevent degenerate states after large collisions / spin.
  gameState.carHeading = clamp(theta, -Math.PI / 2, Math.PI / 2);

  const vx = vz * Math.sin(theta);
  const x = (gameState.lateralOffset || 0) + vx * dt;

  return { x, vx };
}

function applyOffTrackPenalties(gameState, x, vx, vz, trackLimit, dt) {
  const absX = Math.abs(x);
  const isOnCurb = absX > PHYSICS_TRACK_HALF && absX <= CURB_HALF;
  const isOffTrack = absX > CURB_HALF;
  let nextVz = vz;

  if (isOffTrack) {
    // Fully off-track (grass): hard speed cap + spin + dust
    nextVz *= Math.pow(OFF_TRACK_VZ_DRAG, dt);
    nextVz = Math.min(nextVz, OFF_TRACK_MAX_SPEED);
    vx *= Math.pow(OFF_TRACK_VX_DRAG, dt);
    gameState.offTrackDustTimer = OFF_TRACK_DUST_FRAMES;

    if (vz > SPIN_TRIGGER_SPEED) {
      gameState.isSpinning = true;
    }
    if (gameState.isSpinning && vz < SPIN_EXIT_SPEED) {
      gameState.isSpinning = false;
    }
  } else if (isOnCurb) {
    // Curb/zebra zone: mild drag, no spin, no dust
    nextVz *= Math.pow(CURB_VZ_DRAG, dt);
    gameState.isSpinning = false;
    gameState.offTrackDustTimer = Math.max(
      0,
      (gameState.offTrackDustTimer || 0) - dt,
    );
  } else {
    // On track
    gameState.isSpinning = false;
    gameState.offTrackDustTimer = Math.max(
      0,
      (gameState.offTrackDustTimer || 0) - dt,
    );
  }

  return { x, vx, nextVz, isOffTrack };
}

function integrateLateralState(gameState, curvature, vz, dt, strategy) {
  const trackLimit = PHYSICS_TRACK_HALF;

  const { x: rawX, vx } = updateHeadingAndLateral(gameState, curvature, vz, dt);

  const surfaceResult = applyOffTrackPenalties(
    gameState,
    rawX,
    vx,
    vz,
    trackLimit,
    dt,
  );
  const x = surfaceResult.x;
  const { nextVz, isOffTrack } = surfaceResult;

  gameState.currentSlip = clamp(Math.abs(vx) / MAX_LATERAL_VX, 0, 1);
  gameState.isPenalized = gameState.currentSlip > SLIP_PENALTY_THRESHOLD;
  gameState.lateralOffset = x;
  gameState.lateralVelocity = vx;
  gameState.isOffTrack = isOffTrack;

  return {
    nextVz,
    forces: { centrifugalForce: 0, effectiveGrip: strategy.lateralFriction },
  };
}

export {
  updateHeadingAndLateral,
  applyOffTrackPenalties,
  integrateLateralState,
};
