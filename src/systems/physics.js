import { getAeroStrategy } from "./aero.js";
import { clamp, lerp, getLapData } from "../utils/math.js";
import {
  BOOST_BASE_GAIN,
  BOOST_MIN_EFFECT,
  BOOST_OVERCAP_RATIO,
  BOOST_SLIP_EFFECT_FACTOR,
  CENTRIFUGAL_SCALE_C,
  CENTRIFUGAL_DIRECT_PUSH_X,
  EDGE_PRESSURE_RATIO_RANGE,
  EDGE_PRESSURE_RATIO_START,
  EDGE_RATIO_CLAMP_MAX,
  EDGE_VX_DAMPING_FACTOR,
  GRIP_MIN_FLOOR,
  LATERAL_VX_DEAD_ZONE,
  MANUAL_BRAKE_DECEL,
  MAX_LATERAL_VX,
  OFF_TRACK_CENTERING_BONUS,
  OFF_TRACK_DUST_FRAMES,
  OFF_TRACK_RECOVERY_PER_UNIT,
  OFF_TRACK_VX_DRAG,
  OFF_TRACK_VZ_DRAG,
  SLIP_BLEND_RANGE,
  SLIP_BLEND_START,
  SLIP_GRIP_EROSION,
  SLIP_PENALTY_THRESHOLD,
  COUNTERSTEER_DAMPING_BONUS,
  TRACK_WIDTH,
  AUTOSTEER_LOOKAHEAD_N,
  AUTOSTEER_FEEDFORWARD_K,
  AUTOSTEER_HEADING_KH,
  AUTOSTEER_MAX_HEADING,
  AUTOSTEER_HEADING_RATE,
  AUTOSTEER_KP,
  AUTOSTEER_KD,
  AUTOSTEER_EDGE_GUARD_RATIO,
  AUTOSTEER_OFFSET_DEADZONE,
  AUTOSTEER_SLIP_SUPPRESS,
  AUTOSTEER_SPEED_SENSITIVITY,
  AUTOSTEER_MIN_HEADING,
  AUTOSTEER_CURVATURE_REF,
  AUTOSTEER_VISUAL_LERP_RATE,
  AUTOSTEER_KP_FLOOR_RATIO,
  AUTOSTEER_RECOVERY_THRESHOLD,
  SLIP_LATERAL_KINETIC_DAMPING,
  CURVATURE_DEADZONE,
  OFF_TRACK_OUTWARD_VX_DAMP,
  RACING_LINE_STEP,
} from "../constants/index.js";

function resolveTrackType(gameState, currentTrackInfo) {
  gameState.trackType = currentTrackInfo.type;
  gameState.currentSlip = 0;
  gameState.curveForce = Math.abs(currentTrackInfo.curve || 0);
  return { curvature: currentTrackInfo.curve || 0 };
}

function resolveCurrentSegment(gameState, track, lapZ) {
  const seg = track.segments.find((s) => lapZ >= s.startZ && lapZ < s.endZ);
  if (seg) gameState.currentSegmentIndex = seg.index;
}

function computeForwardVelocity(gameState, curvature, dt) {
  const strategy = getAeroStrategy(gameState.aeroMode);

  let vz = gameState.speed || 0;
  vz = Math.min(strategy.maxVz, Math.max(0, vz + strategy.accel * dt));
  vz *= Math.pow(strategy.drag, dt);

  const battery = gameState.battery || 0;
  if (gameState.isBoosting && battery > 0) {
    const slip = Math.max(0, gameState.currentSlip || 0);
    const slipPenalty = clamp(
      slip * BOOST_SLIP_EFFECT_FACTOR,
      0,
      1 - BOOST_MIN_EFFECT,
    );
    const boostFactor = 1 + (BOOST_BASE_GAIN / 100) * (1 - slipPenalty);
    vz = Math.min(strategy.maxVz * BOOST_OVERCAP_RATIO, vz * boostFactor);
  }

  if (gameState.isBraking && vz > 0) {
    vz *= Math.pow(MANUAL_BRAKE_DECEL, dt);
  }

  return clamp(vz, 0, strategy.maxVz * BOOST_OVERCAP_RATIO);
}

function computeLateralForces(gameState, curvature, vz) {
  const strategy = getAeroStrategy(gameState.aeroMode);
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
  gameState._telCentrifugalForce = centrifugalForce;
  gameState._telEffectiveGrip = effectiveGrip;
  return {
    centrifugalForce,
    absCentrifugalForce,
    effectiveGrip,
    slipBlend,
    slipOutwardForce,
  };
}

function computeAutoSteer(gameState, track, vz, dt) {
  const rl = track.racingLine;
  const lapLength = track.lapLength || track.totalDistance;
  const lapZ = ((gameState.currentZ % lapLength) + lapLength) % lapLength;

  let idx = gameState.wpIdx || 0;

  if (lapZ + RACING_LINE_STEP < rl[idx].z) {
    idx = 0;
  }

  while (idx < rl.length - 1 && rl[idx + 1].z <= lapZ) {
    idx++;
  }
  gameState.wpIdx = idx;

  const la = rl[(idx + AUTOSTEER_LOOKAHEAD_N) % rl.length];

  const safeCurve = Math.abs(la.curve) < CURVATURE_DEADZONE ? 0 : la.curve;
  const feedfwd = -safeCurve * AUTOSTEER_FEEDFORWARD_K * vz;

  const trackHalf = TRACK_WIDTH * 0.5;
  const currentOffset = gameState.lateralOffset || 0;
  const edgeBlend = clamp(
    (Math.abs(currentOffset) / trackHalf - AUTOSTEER_EDGE_GUARD_RATIO) /
      (1 - AUTOSTEER_EDGE_GUARD_RATIO),
    0,
    1,
  );

  if (
    Math.abs(currentOffset - la.targetX) < AUTOSTEER_OFFSET_DEADZONE &&
    Math.abs(currentOffset) < AUTOSTEER_OFFSET_DEADZONE
  ) {
    const pushingOutwardFwd =
      currentOffset !== 0 && Math.sign(feedfwd) === Math.sign(currentOffset);
    const earlyForce = feedfwd * (pushingOutwardFwd ? 1 - edgeBlend : 1.0);
    gameState._telTargetHeading = 0;
    gameState._telKpForce = 0;
    gameState._telAutoSteerForce = earlyForce;
    return earlyForce;
  }

  const offsetError = la.targetX - currentOffset;

  const curvatureScale = clamp(
    Math.abs(la.curve) / AUTOSTEER_CURVATURE_REF,
    0,
    1,
  );
  let effectiveMaxHeading = lerp(
    AUTOSTEER_MIN_HEADING,
    AUTOSTEER_MAX_HEADING,
    curvatureScale,
  );

  // Recovery Authority: when the car is far from the racing line (large |offsetError|),
  // expand the heading cap toward AUTOSTEER_MAX_HEADING regardless of track curvature.
  // This prevents the curvature-based cap from blocking recovery after going off-track.
  const recoveryBlend = clamp(
    (Math.abs(offsetError) - AUTOSTEER_RECOVERY_THRESHOLD) /
      AUTOSTEER_RECOVERY_THRESHOLD,
    0,
    1,
  );
  effectiveMaxHeading = lerp(
    effectiveMaxHeading,
    AUTOSTEER_MAX_HEADING,
    recoveryBlend,
  );
  const targetHeading = clamp(
    offsetError * AUTOSTEER_HEADING_KH,
    -effectiveMaxHeading,
    effectiveMaxHeading,
  );
  const currentHeading = gameState.carHeadingDelta || 0;
  const headingError = targetHeading - currentHeading;
  const speedFactor = 1 / (1 + vz * vz * AUTOSTEER_SPEED_SENSITIVITY);
  const maxDelta = AUTOSTEER_HEADING_RATE * speedFactor * dt;
  const dHeading = clamp(headingError, -maxDelta, maxDelta);
  gameState.carHeadingDelta = clamp(
    currentHeading + dHeading,
    -effectiveMaxHeading,
    effectiveMaxHeading,
  );
  const effectiveKp =
    AUTOSTEER_KP *
    lerp(AUTOSTEER_KP_FLOOR_RATIO, 1.0, curvatureScale) *
    speedFactor;
  const rawForce = gameState.carHeadingDelta * vz * effectiveKp;

  const dampingForce = -(gameState.lateralVelocity || 0) * AUTOSTEER_KD;

  const totalForce = rawForce + feedfwd + dampingForce;
  const pushingOutward =
    currentOffset !== 0 && Math.sign(totalForce) === Math.sign(currentOffset);
  const finalForce = totalForce * (pushingOutward ? 1 - edgeBlend : 1.0);
  gameState._telTargetHeading = targetHeading;
  gameState._telKpForce = rawForce;
  gameState._telAutoSteerForce = finalForce;
  return finalForce;
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

  vx += autoSteerForce * (1 - forces.slipBlend * AUTOSTEER_SLIP_SUPPRESS) * dt;

  if (!wasOffTrack) {
    if (strategy.useCentrifugalPush) {
      vx += centrifugalForce * CENTRIFUGAL_DIRECT_PUSH_X * dt;
    }
    vx += slipOutwardForce * strategy.slipForceScale * dt;
  }

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

  // Slip lateral kinetic damping: applies additional exponential decay to vx
  // proportional to slip intensity. Models kinetic friction energy dissipation
  // during a slide — prevents unbounded vx accumulation ("lateral cannon" bug).
  if (slipBlend > 0) {
    vx *= Math.pow(lerp(1.0, SLIP_LATERAL_KINETIC_DAMPING, slipBlend), dt);
  }

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

  return { x, vx, wasOffTrack };
}

function applyBoundaryAndSurface(
  gameState,
  x,
  vx,
  vz,
  trackLimit,
  wasOffTrack,
  dt,
) {
  const isOffTrack = Math.abs(x) > trackLimit;
  let nextVz = vz;

  if (isOffTrack) {
    nextVz *= Math.pow(OFF_TRACK_VZ_DRAG, dt);
    vx *= Math.pow(OFF_TRACK_VX_DRAG, dt);
    gameState.offTrackDustTimer = OFF_TRACK_DUST_FRAMES;
  } else {
    gameState.offTrackDustTimer = Math.max(
      0,
      (gameState.offTrackDustTimer || 0) - dt,
    );
  }

  return { x, vx, nextVz, isOffTrack };
}

function integrateLateralState(gameState, track, curvature, vz, dt) {
  let x = gameState.lateralOffset || 0;
  let vx = gameState.lateralVelocity || 0;
  const trackLimit = TRACK_WIDTH * 0.5;

  const effectiveCurvature =
    Math.abs(curvature) < CURVATURE_DEADZONE ? 0 : curvature;

  const forces = computeLateralForces(gameState, effectiveCurvature, vz);
  const autoSteerForce = computeAutoSteer(gameState, track, vz, dt);

  const currentVisual = gameState.carVisualHeading || 0;
  gameState.carVisualHeading = lerp(
    currentVisual,
    gameState.carHeadingDelta || 0,
    clamp(AUTOSTEER_VISUAL_LERP_RATE * dt, 0, 1),
  );

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

  const surfaceResult = applyBoundaryAndSurface(
    gameState,
    x,
    vx,
    vz,
    trackLimit,
    wasOffTrack,
    dt,
  );
  x = surfaceResult.x;
  vx = surfaceResult.vx;
  const { nextVz, isOffTrack } = surfaceResult;

  gameState.currentSlip = Math.max(
    0,
    forces.absCentrifugalForce - forces.effectiveGrip,
  );
  gameState.isPenalized = gameState.currentSlip > SLIP_PENALTY_THRESHOLD;
  gameState.curveForce = Math.abs(curvature);
  gameState.lateralOffset = x;
  gameState.lateralVelocity = vx;
  gameState.isOffTrack = isOffTrack;

  return nextVz;
}

function advanceAlongTrack(gameState, lapLength, dt) {
  const { lapZ: previousLapZ } = getLapData(gameState.currentZ, lapLength);

  gameState.currentZ += gameState.speed * dt;

  const { lapZ: nextLapZ } = getLapData(gameState.currentZ, lapLength);
  const lapCompleted = lapLength > 0 && nextLapZ < previousLapZ;

  return { lapCompleted };
}

function updateCarPhysics(gameState, track, dt = 1, sampledTrackPoint = null) {
  const lapLength = track.lapLength || track.totalDistance;
  const currentTrackInfo =
    sampledTrackPoint || track.getTrackPoint(gameState.currentZ);
  const { lapZ } = getLapData(gameState.currentZ, lapLength);
  const { curvature } = resolveTrackType(gameState, currentTrackInfo);

  gameState.currentTrackPoint = currentTrackInfo;
  gameState.currentCurvature = curvature;

  resolveCurrentSegment(gameState, track, lapZ);

  let vz = computeForwardVelocity(gameState, curvature, dt);
  vz = integrateLateralState(gameState, track, curvature, vz, dt);

  gameState.speed = vz;
  gameState.previousCurvature = curvature;

  return advanceAlongTrack(gameState, lapLength, dt);
}

export { updateCarPhysics };
