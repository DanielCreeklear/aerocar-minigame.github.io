import { clamp } from "../../utils/math.js";
import {
  HEADING_CURVE_FACTOR,
  STEER_YAW_RATE,
  SLIP_PENALTY_THRESHOLD,
  MAX_LATERAL_VX,
  OFF_TRACK_VZ_DRAG,
  OFF_TRACK_VX_DRAG,
  OFF_TRACK_MAX_SPEED,
  OFF_TRACK_MAX_OFFSET_MARGIN,
  OFF_TRACK_DUST_FRAMES,
  CURB_VZ_DRAG,
  CURB_HALF,
  SPIN_TRIGGER_SPEED,
  SPIN_EXIT_SPEED,
  SURFACE_TYPES,
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
  theta += curvature * HEADING_CURVE_FACTOR * vz * dt;

  theta += steerInput * STEER_YAW_RATE * dt;

  // Self-alignment: heading decays toward 0 when no curvature/steer input.
  // Uses the aero-mode grip factor so Mode Z (high downforce) re-aligns faster.
  theta *= Math.pow(lateralFriction, dt);

  gameState.carHeading = clamp(theta, -Math.PI / 2, Math.PI / 2);

  const vx = vz * Math.sin(theta);
  const x = (gameState.lateralOffset || 0) + vx * dt;

  return { x };
}

/**
 * Applies surface-dependent penalties based on the pre-computed grid surface type.
 * Damping is applied to gameState.carHeading (the true state variable) rather than
 * the ephemeral derived vx, so the force persists across frames.
 * @param {object} gameState
 * @param {number} x        - candidate next lateralOffset
 * @param {number} vz       - current forward speed
 * @param {number} surfaceType - SURFACE_TYPES value from grid lookup
 * @param {number} dt
 * @returns {{ nextVz: number, isOffTrack: boolean }}
 */
function applyOffTrackPenalties(gameState, x, vz, surfaceType, dt) {
  const isOffTrack = surfaceType === SURFACE_TYPES.GRASS;
  const isOnCurb = surfaceType === SURFACE_TYPES.CURB;
  let nextVz = vz;

  if (isOffTrack) {
    // Grass: hard speed cap, heading damping (kills lateral velocity next frame),
    // spin trigger, and dust timer.
    nextVz *= Math.pow(OFF_TRACK_VZ_DRAG, dt);
    nextVz = Math.min(nextVz, OFF_TRACK_MAX_SPEED);
    // Damp carHeading so vx = vz*sin(theta) decays on subsequent frames.
    gameState.carHeading *= Math.pow(OFF_TRACK_VX_DRAG, dt);
    gameState.offTrackDustTimer = OFF_TRACK_DUST_FRAMES;

    if (vz > SPIN_TRIGGER_SPEED) {
      gameState.isSpinning = true;
    }
    if (gameState.isSpinning && vz < SPIN_EXIT_SPEED) {
      gameState.isSpinning = false;
    }
  } else if (isOnCurb) {
    // Curb/zebra zone: mild longitudinal drag, no spin, no dust.
    nextVz *= Math.pow(CURB_VZ_DRAG, dt);
    gameState.isSpinning = false;
    gameState.offTrackDustTimer = Math.max(
      0,
      (gameState.offTrackDustTimer || 0) - dt,
    );
  } else {
    // On track: all clear.
    gameState.isSpinning = false;
    gameState.offTrackDustTimer = Math.max(
      0,
      (gameState.offTrackDustTimer || 0) - dt,
    );
  }

  return { nextVz, isOffTrack };
}

/**
 * Main lateral integration step.
 * @param {object} gameState
 * @param {number} curvature    - effective track curvature (deadzone already applied)
 * @param {number} vz           - forward speed (pre-computed)
 * @param {number} dt
 * @param {object} strategy     - aero strategy (lateralFriction, etc.)
 * @param {number} surfaceType  - SURFACE_TYPES value from track.getSurfaceType()
 */
function integrateLateralState(
  gameState,
  curvature,
  vz,
  dt,
  strategy,
  surfaceType,
) {
  const { x: rawX } = updateHeadingAndLateral(
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
  );

  // Hard positional wall: prevents infinite lateral drift on grass.
  // Only kill the outward heading component so inward steering is preserved.
  const wall = CURB_HALF + OFF_TRACK_MAX_OFFSET_MARGIN;
  let x = rawX;
  if (x > wall) {
    x = wall;
    if (gameState.carHeading > 0) gameState.carHeading = 0;
  } else if (x < -wall) {
    x = -wall;
    if (gameState.carHeading < 0) gameState.carHeading = 0;
  }

  // Recompute vx from the (possibly damped) heading so lateralVelocity stays consistent.
  const vx = vz * Math.sin(gameState.carHeading);

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
