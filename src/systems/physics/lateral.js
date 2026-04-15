import { getAeroStrategy } from "../aero.js";
import { clamp } from "../../utils/math.js";
import {
  CORNER_PUSH_K,
  SLIP_PENALTY_THRESHOLD,
  LATERAL_VX_DEAD_ZONE,
  MAX_LATERAL_VX,
  COUNTERSTEER_DAMPING_BONUS,
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

function applyLateralDynamics(
  gameState,
  steerForce,
  vx,
  vz,
  x,
  curvature,
  trackLimit,
  dt,
) {
  const strategy = getAeroStrategy(gameState.aeroMode);
  const wasOffTrack = Math.abs(x) > trackLimit;

  // Player steering: direct lateral force from input.
  vx += steerForce * dt;

  // Centrifugal force: always proportional to speed × curvature.
  // With no player input on a curve, the car drifts outward — steering is required.
  let centrifugalForce = 0;
  if (!wasOffTrack && Math.abs(curvature) > 0 && vz > 0) {
    centrifugalForce = vz * Math.abs(curvature) * CORNER_PUSH_K;
    vx += Math.sign(curvature) * centrifugalForce * dt;
  }

  // Amortecimento lateral (fricção dos pneus).
  vx *= Math.pow(strategy.lateralFriction, dt);

  // Countersteer: player steering opposite to lateral velocity → damping bonus.
  const steerInput = gameState.steerInput || 0;
  const isCountersteering =
    steerInput !== 0 &&
    Math.sign(steerInput) !== Math.sign(vx) &&
    Math.abs(vx) > LATERAL_VX_DEAD_ZONE;
  if (isCountersteering) {
    vx *= Math.pow(COUNTERSTEER_DAMPING_BONUS, dt);
  }

  if (Math.abs(vx) < LATERAL_VX_DEAD_ZONE) vx = 0;
  vx = clamp(vx, -MAX_LATERAL_VX, MAX_LATERAL_VX);
  x += vx * dt;

  return { x, vx, wasOffTrack, centrifugalForce };
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

function integrateLateralState(gameState, curvature, vz, steerForce, dt) {
  let x = gameState.lateralOffset || 0;
  let vx = gameState.lateralVelocity || 0;
  const trackLimit = PHYSICS_TRACK_HALF;

  const lateralResult = applyLateralDynamics(
    gameState,
    steerForce,
    vx,
    vz,
    x,
    curvature,
    trackLimit,
    dt,
  );
  x = lateralResult.x;
  vx = lateralResult.vx;
  const { wasOffTrack, centrifugalForce } = lateralResult;

  const surfaceResult = applyOffTrackPenalties(
    gameState,
    x,
    vx,
    vz,
    trackLimit,
    dt,
  );
  x = surfaceResult.x;
  vx = surfaceResult.vx;
  const { nextVz, isOffTrack } = surfaceResult;

  // currentSlip: proxy baseado em velocidade lateral — para efeitos visuais e HUD.
  gameState.currentSlip = clamp(Math.abs(vx) / MAX_LATERAL_VX, 0, 1);
  gameState.isPenalized = gameState.currentSlip > SLIP_PENALTY_THRESHOLD;
  gameState.lateralOffset = x;
  gameState.lateralVelocity = vx;
  gameState.isOffTrack = isOffTrack;

  const strategy = getAeroStrategy(gameState.aeroMode);
  return {
    nextVz,
    forces: { centrifugalForce, effectiveGrip: strategy.lateralFriction },
  };
}

export { applyLateralDynamics, applyOffTrackPenalties, integrateLateralState };
