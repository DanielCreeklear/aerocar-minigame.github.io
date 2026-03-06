import {
  AERO_MODES,
  AUTO_BRAKE_LOAD_THRESHOLD_X,
  AUTO_BRAKE_LOAD_THRESHOLD_Z,
  AUTO_BRAKE_MIN_FACTOR_X,
  AUTO_BRAKE_MIN_FACTOR_Z,
  AUTO_BRAKE_EXCESS_FACTOR,
  AUTO_BRAKE_LOAD_FACTOR,
  AUTO_BRAKE_MIN_FACTOR,
  BATTERY_MAX,
  BOOST_BASE_GAIN,
  BOOST_BATTERY_DRAIN,
  BOOST_BATTERY_REGEN_X,
  BOOST_BATTERY_REGEN_Z,
  BOOST_MIN_EFFECT,
  BOOST_OVERCAP_RATIO,
  BOOST_SLIP_EFFECT_FACTOR,
  CENTRIFUGAL_SCALE_C,
  CURVE_BRAKE_ENTRY_GAIN,
  CURVE_DRAG_FACTOR_X,
  CURVE_DRAG_FACTOR_Z,
  LATERAL_FRICTION_GRIP_X,
  LATERAL_FRICTION_GRIP_Z,
  MAX_GRIP_MODE_X,
  MAX_GRIP_MODE_Z,
  MAX_LATERAL_VX,
  OFF_TRACK_CENTERING_BONUS,
  OFF_TRACK_DUST_FRAMES,
  OFF_TRACK_MAX_OFFSET_MARGIN,
  OFF_TRACK_RECOVERY_PER_UNIT,
  OFF_TRACK_VX_DRAG,
  OFF_TRACK_VZ_DRAG,
  CENTRIFUGAL_DIRECT_PUSH_X,
  SLIP_BLEND_RANGE,
  SLIP_BLEND_START,
  SLIP_CURVE_RECOVERY_BONUS,
  SLIP_DAMPING_MODE_X,
  SLIP_DAMPING_MODE_Z,
  SLIP_PENALTY_THRESHOLD,
  TRACK_CENTERING_FORCE_X,
  TRACK_CENTERING_FORCE_Z,
  TRACK_WIDTH,
  VZ_ACCEL_MODE_X,
  VZ_ACCEL_MODE_Z,
  VZ_DRAG_MODE_X,
  VZ_DRAG_MODE_Z,
  VZ_MAX_MODE_X,
  VZ_MAX_MODE_Z,
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
  const isModeX = gameState.aeroMode === AERO_MODES.X;
  const accel = isModeX ? VZ_ACCEL_MODE_X : VZ_ACCEL_MODE_Z;
  const drag = isModeX ? VZ_DRAG_MODE_X : VZ_DRAG_MODE_Z;
  const curveDragFactor = isModeX ? CURVE_DRAG_FACTOR_X : CURVE_DRAG_FACTOR_Z;
  const maxVz = isModeX ? VZ_MAX_MODE_X : VZ_MAX_MODE_Z;
  const batteryRegen = isModeX ? BOOST_BATTERY_REGEN_X : BOOST_BATTERY_REGEN_Z;
  const absCurvature = Math.abs(curvature || 0);
  const curveLoad = clamp(absCurvature / 10, 0, 1);

  let vz = gameState.speed || 0;
  vz = Math.min(maxVz, Math.max(0, vz + accel));
  vz *= drag * (1 - curveLoad * curveDragFactor);

  const battery = gameState.battery || 0;
  if (gameState.isBoosting && battery > 0) {
    const slip = Math.max(0, gameState.currentSlip || 0);
    const slipPenalty = clamp(
      slip * BOOST_SLIP_EFFECT_FACTOR,
      0,
      1 - BOOST_MIN_EFFECT,
    );
    const boostFactor = 1 + (BOOST_BASE_GAIN / 100) * (1 - slipPenalty);
    vz = Math.min(maxVz * BOOST_OVERCAP_RATIO, vz * boostFactor);
    gameState.battery = Math.max(0, battery - BOOST_BATTERY_DRAIN);
  } else {
    gameState.battery = Math.min(BATTERY_MAX, battery + batteryRegen);
  }

  if (gameState.battery <= 0.001) {
    gameState.isBoosting = false;
  }

  return clamp(vz, 0, maxVz * BOOST_OVERCAP_RATIO);
}

function updateTrackSpaceLateral(gameState, curvature, vz) {
  let x = gameState.lateralOffset || 0;
  let vx = gameState.lateralVelocity || 0;
  const absCurvature = Math.abs(curvature);
  const previousAbsCurvature = Math.abs(gameState.previousCurvature || 0);
  const deltaCurvature = absCurvature - previousAbsCurvature;
  const isCurveEntryPhase = deltaCurvature > 0.0001;
  const trackLimit = TRACK_WIDTH * 0.5;
  const isModeX = gameState.aeroMode === AERO_MODES.X;
  const maxGrip = isModeX ? MAX_GRIP_MODE_X : MAX_GRIP_MODE_Z;
  const underGripFriction = isModeX
    ? LATERAL_FRICTION_GRIP_X
    : LATERAL_FRICTION_GRIP_Z;
  const centeringForce = isModeX
    ? TRACK_CENTERING_FORCE_X
    : TRACK_CENTERING_FORCE_Z;
  const slipDamping = isModeX ? SLIP_DAMPING_MODE_X : SLIP_DAMPING_MODE_Z;

  const centrifugalForce = vz * vz * curvature * CENTRIFUGAL_SCALE_C;
  const absCentrifugalForce = Math.abs(centrifugalForce);
  const safeGrip = Math.max(maxGrip, 0.0001);
  const slipRatio = absCentrifugalForce / safeGrip;
  const slipBlend = clamp(
    (slipRatio - SLIP_BLEND_START) / SLIP_BLEND_RANGE,
    0,
    1,
  );

  const effectiveGrip = safeGrip * (1 - slipBlend * 0.28);
  const slipOutwardForce =
    Math.sign(centrifugalForce) *
    Math.max(0, absCentrifugalForce - effectiveGrip);
  const centeringAssist = 1 + slipBlend * SLIP_CURVE_RECOVERY_BONUS;
  const edgeRatio = clamp(Math.abs(x) / Math.max(trackLimit, 1), 0, 1.2);
  const edgePressure = clamp((edgeRatio - 0.82) / 0.18, 0, 1);
  const wasOffTrack = Math.abs(x) > trackLimit;

  const centeringMult = isModeX ? 1.0 : centeringAssist;
  vx += -x * centeringForce * centeringMult;

  if (!wasOffTrack) {
    if (isModeX) {
      vx += centrifugalForce * CENTRIFUGAL_DIRECT_PUSH_X;
    }

    vx += slipOutwardForce * (0.45 + slipBlend * 0.25);
    vx += -Math.sign(x || 1) * edgePressure * (0.3 + slipBlend * 0.5);
  }

  const damping = lerp(underGripFriction, slipDamping, slipBlend);
  vx *= damping * (1 - edgePressure * 0.18);

  if (wasOffTrack) {
    if (Math.sign(vx) === Math.sign(x)) vx = 0;
    const overflow = Math.abs(x) - trackLimit;
    vx +=
      -Math.sign(x) *
      (OFF_TRACK_CENTERING_BONUS + overflow * OFF_TRACK_RECOVERY_PER_UNIT);
  }

  if (Math.abs(vx) < 0.01) vx = 0;
  vx = clamp(vx, -MAX_LATERAL_VX, MAX_LATERAL_VX);
  x += vx;

  const maxOffset = trackLimit + OFF_TRACK_MAX_OFFSET_MARGIN;
  if (Math.abs(x) > maxOffset) {
    x = Math.sign(x) * maxOffset;
    vx *= 0.35;
  }

  const isOffTrack = Math.abs(x) > trackLimit;
  let nextVz = vz;

  const loadRatio = absCentrifugalForce / safeGrip;
  const gripExcessRatio = Math.max(0, loadRatio - 1);
  const entryAggression = clamp(deltaCurvature / 0.003, 0, 1);
  const autobrakeThreshold = isModeX
    ? AUTO_BRAKE_LOAD_THRESHOLD_X
    : AUTO_BRAKE_LOAD_THRESHOLD_Z;
  const minBrakeFactor = isModeX
    ? AUTO_BRAKE_MIN_FACTOR_X
    : AUTO_BRAKE_MIN_FACTOR_Z;
  let autoBrakeFactor = 1;

  if (loadRatio > autobrakeThreshold || (!isModeX && isCurveEntryPhase) || edgePressure > 0) {
    const entryWeight = isCurveEntryPhase
      ? 1 + entryAggression * CURVE_BRAKE_ENTRY_GAIN
      : 0.72;
    const brakeFromLoad =
      1 - Math.min(0.22, loadRatio * AUTO_BRAKE_LOAD_FACTOR * entryWeight);
    const brakeFromExcess =
      1 -
      Math.min(
        0.35,
        gripExcessRatio *
          AUTO_BRAKE_EXCESS_FACTOR *
          (0.7 + entryAggression * 0.7),
      );

    autoBrakeFactor = Math.max(
      minBrakeFactor,
      Math.min(brakeFromLoad, brakeFromExcess),
    );
  }

  nextVz *= 1 - edgePressure * 0.07;
  nextVz *= autoBrakeFactor;

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

  gameState.currentSlip = Math.max(0, absCentrifugalForce - effectiveGrip);
  gameState.isPenalized = gameState.currentSlip > SLIP_PENALTY_THRESHOLD;
  gameState.isVirtualBraking = autoBrakeFactor < 0.985;
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
