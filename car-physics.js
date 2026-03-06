import { getAeroStrategy } from "./aero-strategy.js";
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
  OFF_TRACK_MAX_OFFSET_MARGIN,
  OFF_TRACK_RECOVERY_PER_UNIT,
  OFF_TRACK_VX_DRAG,
  OFF_TRACK_VZ_DRAG,
  SLIP_BLEND_RANGE,
  SLIP_BLEND_START,
  SLIP_FORCE_BASE_SCALE,
  SLIP_FORCE_BLEND_SCALE,
  SLIP_GRIP_EROSION,
  SLIP_PENALTY_THRESHOLD,
  STEERING_VX_FACTOR,
  TRACK_WIDTH,
  WALL_BOUNCE_DAMPING,
} from "./constants/index.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start, end, t) {
  return start + (end - start) * t;
}

function getLapData(currentZ, lapLength) {
  let lapZ = lapLength > 0 ? currentZ % lapLength : 0;
  if (lapZ < 0) lapZ += lapLength;
  return { lapZ };
}

function getCurveState(gameState, currentTrackInfo) {
  gameState.trackType = currentTrackInfo.type;

  const curvature = currentTrackInfo.curve || 0;
  gameState.currentSlip = 0;
  gameState.curveForce = Math.abs(curvature);

  return { curvature };
}

function updateCurrentSegmentIndex(gameState, track, lapZ) {
  const seg = track.segments.find((s) => lapZ >= s.startZ && lapZ < s.endZ);
  if (seg) gameState.currentSegmentIndex = seg.index;
}

function updateForwardVelocity(gameState, curvature) {
  const strategy = getAeroStrategy(gameState.aeroMode);

  let vz = gameState.speed || 0;
  vz = Math.min(strategy.maxVz, Math.max(0, vz + strategy.accel));
  vz *= strategy.drag;

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
    vz *= MANUAL_BRAKE_DECEL;
  }

  return clamp(vz, 0, strategy.maxVz * BOOST_OVERCAP_RATIO);
}

function calculateLateralForces(gameState, curvature, vz) {
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
  return { centrifugalForce, absCentrifugalForce, effectiveGrip, slipBlend, slipOutwardForce };
}

function applyLateralForces(gameState, vx, vz, x, trackLimit, forces) {
  const strategy = getAeroStrategy(gameState.aeroMode);
  const { centrifugalForce, slipBlend, slipOutwardForce } = forces;
  const wasOffTrack = Math.abs(x) > trackLimit;

  vx += (gameState.steeringInput || 0) * vz * STEERING_VX_FACTOR;

  if (!wasOffTrack) {
    if (strategy.useCentrifugalPush) {
      vx += centrifugalForce * CENTRIFUGAL_DIRECT_PUSH_X;
    }
    vx += slipOutwardForce * (SLIP_FORCE_BASE_SCALE + slipBlend * SLIP_FORCE_BLEND_SCALE);
  }

  const edgeRatio = clamp(Math.abs(x) / Math.max(trackLimit, 1), 0, EDGE_RATIO_CLAMP_MAX);
  const edgePressure = clamp(
    (edgeRatio - EDGE_PRESSURE_RATIO_START) / EDGE_PRESSURE_RATIO_RANGE,
    0,
    1,
  );
  const damping = lerp(strategy.lateralFriction, strategy.slipDamping, slipBlend);
  vx *= damping * (1 - edgePressure * EDGE_VX_DAMPING_FACTOR);

  if (wasOffTrack) {
    if (Math.sign(vx) === Math.sign(x)) vx = 0;
    const overflow = Math.abs(x) - trackLimit;
    vx +=
      -Math.sign(x) *
      (OFF_TRACK_CENTERING_BONUS + overflow * OFF_TRACK_RECOVERY_PER_UNIT);
  }

  if (Math.abs(vx) < LATERAL_VX_DEAD_ZONE) vx = 0;
  vx = clamp(vx, -MAX_LATERAL_VX, MAX_LATERAL_VX);
  x += vx;

  return { x, vx, wasOffTrack };
}

function applyOffTrackBehavior(gameState, x, vx, vz, trackLimit, wasOffTrack) {
  // Forward velocity is only reduced by off-track drag or manual braking — never by
  // edge proximity.  Removing the edgePressure vz multiplier eliminates the "ghost
  // brake" that bled forward speed whenever centrifugal force pushed the car near
  // the track edge during a corner.
  const maxOffset = trackLimit + OFF_TRACK_MAX_OFFSET_MARGIN;
  if (Math.abs(x) > maxOffset) {
    x = Math.sign(x) * maxOffset;
    vx *= WALL_BOUNCE_DAMPING;
  }

  const isOffTrack = Math.abs(x) > trackLimit;
  let nextVz = vz;

  if (isOffTrack) {
    nextVz *= OFF_TRACK_VZ_DRAG;
    if (!wasOffTrack) vx *= OFF_TRACK_VX_DRAG;
    gameState.offTrackDustTimer = OFF_TRACK_DUST_FRAMES;
  } else {
    gameState.offTrackDustTimer = Math.max(
      0,
      (gameState.offTrackDustTimer || 0) - 1,
    );
  }

  return { x, vx, nextVz, isOffTrack };
}

function updateTrackSpaceLateral(gameState, curvature, vz) {
  let x = gameState.lateralOffset || 0;
  let vx = gameState.lateralVelocity || 0;
  const trackLimit = TRACK_WIDTH * 0.5;

  const forces = calculateLateralForces(gameState, curvature, vz);

  const lateralResult = applyLateralForces(gameState, vx, vz, x, trackLimit, forces);
  x = lateralResult.x;
  vx = lateralResult.vx;
  const { wasOffTrack } = lateralResult;

  const offTrackResult = applyOffTrackBehavior(gameState, x, vx, vz, trackLimit, wasOffTrack);
  x = offTrackResult.x;
  vx = offTrackResult.vx;
  const { nextVz, isOffTrack } = offTrackResult;

  gameState.currentSlip = Math.max(0, forces.absCentrifugalForce - forces.effectiveGrip);
  gameState.isPenalized = gameState.currentSlip > SLIP_PENALTY_THRESHOLD;
  gameState.curveForce = Math.abs(curvature);
  gameState.lateralOffset = x;
  gameState.lateralVelocity = vx;
  gameState.isOffTrack = isOffTrack;

  return nextVz;
}

function advanceCarPosition(gameState, lapLength) {
  const { lapZ: previousLapZ } = getLapData(gameState.currentZ, lapLength);

  gameState.currentZ += gameState.speed;

  const { lapZ: nextLapZ } = getLapData(gameState.currentZ, lapLength);
  const lapCompleted = lapLength > 0 && nextLapZ < previousLapZ;

  return { lapCompleted };
}

function updateCarPhysics(gameState, track, sampledTrackPoint = null) {
  const lapLength = track.lapLength || track.totalDistance;

  const currentTrackInfo =
    sampledTrackPoint || track.getTrackPoint(gameState.currentZ);
  const { lapZ } = getLapData(gameState.currentZ, lapLength);
  const { curvature } = getCurveState(gameState, currentTrackInfo);

  gameState.currentTrackPoint = currentTrackInfo;
  gameState.currentCurvature = curvature;

  updateCurrentSegmentIndex(gameState, track, lapZ);

  let vz = updateForwardVelocity(gameState, curvature);
  vz = updateTrackSpaceLateral(gameState, curvature, vz);

  gameState.speed = vz;
  gameState.previousCurvature = curvature;

  return advanceCarPosition(gameState, lapLength);
}

export { updateCarPhysics };
