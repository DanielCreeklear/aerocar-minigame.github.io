import { getAeroStrategy } from "../aero.js";
import { clamp } from "../../utils/math.js";
import {
  CORNER_PUSH_K,
  SLIP_PENALTY_THRESHOLD,
  LATERAL_VX_DEAD_ZONE,
  MAX_LATERAL_VX,
  COUNTERSTEER_DAMPING_BONUS,
  OFF_TRACK_CENTERING_BONUS,
  OFF_TRACK_RECOVERY_PER_UNIT,
  OFF_TRACK_OUTWARD_VX_DAMP,
  OFF_TRACK_VZ_DRAG,
  OFF_TRACK_VX_DRAG,
  OFF_TRACK_MAX_SPEED,
  OFF_TRACK_DUST_FRAMES,
  AUTOSTEER_SLIP_SUPPRESS,
  PHYSICS_TRACK_HALF,
  CURB_HALF,
  SPIN_TRIGGER_SPEED,
  SPIN_EXIT_SPEED,
} from "../../constants/index.js";

function applyLateralDynamics(
  gameState,
  autoSteerForce,
  vx,
  vz,
  x,
  curvature,
  trackLimit,
  dt,
) {
  const strategy = getAeroStrategy(gameState.aeroMode);
  const wasOffTrack = Math.abs(x) > trackLimit;

  // AutoSteer: cede autoridade proporcional à deriva lateral atual (currentSlip do frame anterior).
  const driftBlend = clamp((gameState.currentSlip || 0) / 0.5, 0, 1);
  vx += autoSteerForce * (1 - driftBlend * AUTOSTEER_SLIP_SUPPRESS) * dt;

  // Corner push: excesso de velocidade acima do limite seguro empurra o carro para fora.
  // safeSpeed = cornerSafeSpeed / |κ| — curvas fechadas exigem velocidades menores.
  let centrifugalForce = 0;
  if (!wasOffTrack && Math.abs(curvature) > 0 && vz > 0) {
    const safeSpeed = strategy.cornerSafeSpeed / Math.abs(curvature);
    const excess = Math.max(0, vz - safeSpeed);
    centrifugalForce = excess * CORNER_PUSH_K;
    vx += Math.sign(curvature) * centrifugalForce * dt;
  }

  // Amortecimento lateral (fricção dos pneus).
  vx *= Math.pow(strategy.lateralFriction, dt);

  // Contra-esterço: heading oposto a vx → bônus de amortecimento.
  const headingDelta = gameState.carHeadingDelta || 0;
  const isCountersteering =
    headingDelta !== 0 &&
    Math.sign(headingDelta) !== Math.sign(vx) &&
    Math.abs(vx) > LATERAL_VX_DEAD_ZONE;
  if (isCountersteering) {
    vx *= Math.pow(COUNTERSTEER_DAMPING_BONUS, dt);
  }

  // Mola de recuperação: quando fora da pista física, puxa de volta ao centro.
  if (wasOffTrack) {
    if (Math.sign(vx) === Math.sign(x)) vx *= OFF_TRACK_OUTWARD_VX_DAMP;
    const overflow = Math.abs(x) - trackLimit;
    vx +=
      -Math.sign(x) *
      (OFF_TRACK_CENTERING_BONUS + overflow * OFF_TRACK_RECOVERY_PER_UNIT) *
      dt;
  }

  if (Math.abs(vx) < LATERAL_VX_DEAD_ZONE) vx = 0;
  vx = clamp(vx, -MAX_LATERAL_VX, MAX_LATERAL_VX);
  x += vx * dt;

  return { x, vx, wasOffTrack, centrifugalForce };
}

function applyOffTrackPenalties(gameState, x, vx, vz, trackLimit, dt) {
  // isOffTrack usa CURB_HALF: a zebra (trackLimit..CURB_HALF) não tem penalidade.
  const isOffTrack = Math.abs(x) > CURB_HALF;
  let nextVz = vz;

  if (isOffTrack) {
    nextVz *= Math.pow(OFF_TRACK_VZ_DRAG, dt);
    nextVz = Math.min(nextVz, OFF_TRACK_MAX_SPEED);
    vx *= Math.pow(OFF_TRACK_VX_DRAG, dt);
    gameState.offTrackDustTimer = OFF_TRACK_DUST_FRAMES;

    // Spin: entrada em alta velocidade no gramado aciona rotação visual.
    if (vz > SPIN_TRIGGER_SPEED) {
      gameState.isSpinning = true;
    }
    // Sai do spin quando freou o suficiente.
    if (gameState.isSpinning && vz < SPIN_EXIT_SPEED) {
      gameState.isSpinning = false;
    }
  } else {
    // De volta à pista/zebra: spin termina imediatamente (spin é só penalidade do gramado).
    gameState.isSpinning = false;
    gameState.offTrackDustTimer = Math.max(
      0,
      (gameState.offTrackDustTimer || 0) - dt,
    );
  }

  return { x, vx, nextVz, isOffTrack };
}

function integrateLateralState(gameState, curvature, vz, autoSteerForce, dt) {
  let x = gameState.lateralOffset || 0;
  let vx = gameState.lateralVelocity || 0;
  const trackLimit = PHYSICS_TRACK_HALF;

  const lateralResult = applyLateralDynamics(
    gameState,
    autoSteerForce,
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
