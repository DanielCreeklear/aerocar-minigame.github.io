import { getAeroStrategy } from "../aero.js";
import { clamp, lerp } from "../../utils/math.js";
import {
  CENTRIFUGAL_SCALE_C,
  SLIP_BLEND_START,
  SLIP_BLEND_RANGE,
  SLIP_GRIP_EROSION,
  GRIP_MIN_FLOOR,
  SLIP_PENALTY_THRESHOLD,
  LATERAL_VX_DEAD_ZONE,
  MAX_LATERAL_VX,
  COUNTERSTEER_DAMPING_BONUS,
  EDGE_PRESSURE_RATIO_START,
  EDGE_PRESSURE_RATIO_RANGE,
  EDGE_RATIO_CLAMP_MAX,
  EDGE_VX_DAMPING_FACTOR,
  SLIP_LATERAL_KINETIC_DAMPING,
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

function computeTireSlipForces(gameState, curvature, vz) {
  const strategy = getAeroStrategy(gameState.aeroMode);

  // F_centrif = vz² × κ × C  (constante C calibrada empiricamente — ver constants/physics.js)
  const centrifugalForce = vz * vz * curvature * CENTRIFUGAL_SCALE_C;
  const absCentrifugalForce = Math.abs(centrifugalForce);

  const safeGrip = Math.max(strategy.maxGrip, GRIP_MIN_FLOOR);
  const slipRatio = absCentrifugalForce / safeGrip;

  const slipBlend = clamp(
    (slipRatio - SLIP_BLEND_START) / SLIP_BLEND_RANGE,
    0,
    1,
  );

  const effectiveGrip = safeGrip * (1 - slipBlend * SLIP_GRIP_EROSION);

  const slipOutwardForce =
    Math.sign(centrifugalForce) *
    Math.max(0, absCentrifugalForce - effectiveGrip);

  return {
    centrifugalForce,
    absCentrifugalForce,
    effectiveGrip,
    slipBlend,
    slipOutwardForce,
  };
}

function applyLateralDynamics(
  gameState,
  autoSteerForce,
  vx,
  vz,
  x,
  trackLimit,
  forces,
  dt,
) {
  const strategy = getAeroStrategy(gameState.aeroMode);
  const { centrifugalForce, slipBlend, slipOutwardForce } = forces;
  const wasOffTrack = Math.abs(x) > trackLimit;

  // AutoSteer: suprimido em proporção ao slip (em derrapagem plena, só 15% da força).
  vx += autoSteerForce * (1 - slipBlend * AUTOSTEER_SLIP_SUPPRESS) * dt;

  if (!wasOffTrack) {
    // Força centrífuga lateral por modo: X empurra mais (0.12), Z resiste melhor mas ainda sente (0.04).
    vx += centrifugalForce * strategy.centrifugalPushFactor * dt;
    // Slip residual: excesso de centrífuga além do grip. Escala varia por modo (1,2 X / 0,65 Z).
    vx += slipOutwardForce * strategy.slipForceScale * dt;
  }

  // --- Pressão de borda (meio-fio) ---
  const edgeRatio = clamp(
    Math.abs(x) / Math.max(trackLimit, 1),
    0,
    EDGE_RATIO_CLAMP_MAX,
  );
  const edgePressure = clamp(
    (edgeRatio - EDGE_PRESSURE_RATIO_START) / EDGE_PRESSURE_RATIO_RANGE,
    0,
    1,
  );

  const damping = lerp(
    strategy.lateralFriction,
    strategy.slipDamping,
    slipBlend,
  );

  // Contra-esterço: heading oposto a vx → pneu trabalha melhor → bônus de amortecimento.
  const headingDelta = gameState.carHeadingDelta || 0;
  const isCountersteering =
    headingDelta !== 0 &&
    Math.sign(headingDelta) !== Math.sign(vx) &&
    Math.abs(vx) > LATERAL_VX_DEAD_ZONE;
  const effectiveDamping = isCountersteering
    ? damping * COUNTERSTEER_DAMPING_BONUS
    : damping;

  vx *= Math.pow(
    effectiveDamping * (1 - edgePressure * EDGE_VX_DAMPING_FACTOR),
    dt,
  );

  // Amortecimento cinético: impede vx ilimitado em slip pleno (bug "lateral cannon").
  if (slipBlend > 0) {
    vx *= Math.pow(lerp(1.0, SLIP_LATERAL_KINETIC_DAMPING, slipBlend), dt);
  }

  // Mola de recuperação: amortece vx de saída e aplica spring F = BASE + overflow × PER_UNIT.
  if (wasOffTrack) {
    if (Math.sign(vx) === Math.sign(x)) vx *= OFF_TRACK_OUTWARD_VX_DAMP;
    const overflow = Math.abs(x) - trackLimit;
    vx +=
      -Math.sign(x) *
      (OFF_TRACK_CENTERING_BONUS + overflow * OFF_TRACK_RECOVERY_PER_UNIT) *
      dt;
  }

  // Zona morta: suprime micro-jitter em velocidades laterais muito baixas.
  if (Math.abs(vx) < LATERAL_VX_DEAD_ZONE) vx = 0;
  vx = clamp(vx, -MAX_LATERAL_VX, MAX_LATERAL_VX);
  x += vx * dt;

  return { x, vx, wasOffTrack };
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

  const forces = computeTireSlipForces(gameState, curvature, vz);

  const lateralResult = applyLateralDynamics(
    gameState,
    autoSteerForce,
    vx,
    vz,
    x,
    trackLimit,
    forces,
    dt,
  );
  x = lateralResult.x;
  vx = lateralResult.vx;
  const { wasOffTrack } = lateralResult;

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

  // --- Grava estado lateral ---
  gameState.currentSlip = Math.max(
    0,
    forces.absCentrifugalForce - forces.effectiveGrip,
  );
  gameState.isPenalized = gameState.currentSlip > SLIP_PENALTY_THRESHOLD;
  gameState.lateralOffset = x;
  gameState.lateralVelocity = vx;
  gameState.isOffTrack = isOffTrack;

  return { nextVz, forces };
}

export {
  computeTireSlipForces,
  applyLateralDynamics,
  applyOffTrackPenalties,
  integrateLateralState,
};
