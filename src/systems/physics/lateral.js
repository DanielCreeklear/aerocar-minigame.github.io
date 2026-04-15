import { clamp } from "../../utils/math.js";
import {
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
) {
  const steerInput = gameState.steerInput || 0;
  let theta = gameState.carHeading || 0;

  theta += steerInput * STEER_YAW_RATE * dt;

  gameState.carHeading = clamp(theta, -Math.PI / 2, Math.PI / 2);

  const vx = vz * Math.sin(theta);
  const x = (gameState.lateralOffset || 0) + vx * dt;

  return { x };
}



function applyOffTrackPenalties(gameState, x, vz, surfaceType, dt) {
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
  const { x: rawX } = updateHeadingAndLateral(
    gameState,
    curvature,
    vz,
    dt,
  );

  const { nextVz, isOffTrack } = applyOffTrackPenalties(
    gameState,
    rawX,
    vz,
    surfaceType,
    dt,
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
