import {
  AERO_MODES,
  AUTO_BRAKE_EXCESS_FACTOR,
  AUTO_BRAKE_LOAD_FACTOR,
  AUTO_BRAKE_MIN_FACTOR,
  CENTRIFUGAL_SCALE_C,
  LATERAL_FRICTION_GRIP_X,
  LATERAL_FRICTION_GRIP_Z,
  MAX_GRIP_MODE_X,
  MAX_GRIP_MODE_Z,
  MAX_LATERAL_VX,
  OFF_TRACK_DUST_FRAMES,
  OFF_TRACK_CENTERING_BONUS,
  OFF_TRACK_VX_DRAG,
  OFF_TRACK_VZ_DRAG,
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

function getLapData(currentZ, lapLength) {
  let lapZ = lapLength > 0 ? currentZ % lapLength : 0;
  if (lapZ < 0) lapZ += lapLength;
  return { lapZ };
}

function getCurveState(gameState, currentTrackInfo) {
  gameState.trackType = currentTrackInfo.type;

  const curvature = currentTrackInfo.curve || 0;
  const curveForce = Math.abs(curvature);

  gameState.currentSlip = 0;
  gameState.curveForce = curveForce;

  return { curvature };
}

function updateCurrentSegmentIndex(gameState, track, lapZ) {
  const seg = track.segments.find((s) => lapZ >= s.startZ && lapZ < s.endZ);
  if (seg) gameState.currentSegmentIndex = seg.index;
}

function updateForwardVelocity(gameState) {
  const isModeX = gameState.aeroMode === AERO_MODES.X;
  const accel = isModeX ? VZ_ACCEL_MODE_X : VZ_ACCEL_MODE_Z;
  const drag = isModeX ? VZ_DRAG_MODE_X : VZ_DRAG_MODE_Z;
  const maxVz = isModeX ? VZ_MAX_MODE_X : VZ_MAX_MODE_Z;

  let vz = gameState.speed || 0;
  vz = Math.min(maxVz, Math.max(0, vz + accel));
  vz *= drag;

  return Math.max(0, Math.min(maxVz, vz));
}

function updateTrackSpaceLateral(gameState, curvature, vz) {
  let x = gameState.lateralOffset || 0;
  let vx = gameState.lateralVelocity || 0;
  const trackLimit = TRACK_WIDTH * 0.5;
  const isModeX = gameState.aeroMode === AERO_MODES.X;
  const maxGrip = isModeX ? MAX_GRIP_MODE_X : MAX_GRIP_MODE_Z;
  const underGripFriction = isModeX
    ? LATERAL_FRICTION_GRIP_X
    : LATERAL_FRICTION_GRIP_Z;
  const centeringForce = isModeX
    ? TRACK_CENTERING_FORCE_X
    : TRACK_CENTERING_FORCE_Z;

  const centrifugalForce = vz * vz * curvature * CENTRIFUGAL_SCALE_C;
  const absCentrifugalForce = Math.abs(centrifugalForce);
  const isWithinGrip = absCentrifugalForce <= maxGrip;
  vx += -x * centeringForce;

  if (isWithinGrip) {
    vx *= underGripFriction;
    if (Math.abs(vx) < 0.01) vx = 0;
  } else {
    const axleLimit = maxGrip * Math.sign(centrifugalForce);
    const ax = centrifugalForce - axleLimit;
    vx += ax;
  }

  vx = Math.max(-MAX_LATERAL_VX, Math.min(MAX_LATERAL_VX, vx));
  x += vx;

  const isOffTrack = Math.abs(x) > trackLimit;
  let nextVz = vz;

  const gripExcess = Math.max(0, absCentrifugalForce - maxGrip);
  const loadRatio = absCentrifugalForce / Math.max(maxGrip, 0.0001);
  const brakeFromLoad = 1 - Math.min(0.08, loadRatio * AUTO_BRAKE_LOAD_FACTOR);
  const brakeFromExcess = 1 - gripExcess * AUTO_BRAKE_EXCESS_FACTOR;
  const autoBrakeFactor = Math.max(
    AUTO_BRAKE_MIN_FACTOR,
    Math.min(brakeFromLoad, brakeFromExcess),
  );

  nextVz *= autoBrakeFactor;

  if (isOffTrack) {
    nextVz *= OFF_TRACK_VZ_DRAG;
    vx *= OFF_TRACK_VX_DRAG;
    vx += -Math.sign(x) * OFF_TRACK_CENTERING_BONUS;
    gameState.offTrackDustTimer = OFF_TRACK_DUST_FRAMES;
  } else {
    gameState.offTrackDustTimer = Math.max(
      0,
      (gameState.offTrackDustTimer || 0) - 1,
    );
  }

  gameState.currentSlip = Math.max(0, absCentrifugalForce - maxGrip);
  gameState.isPenalized = gameState.currentSlip > SLIP_PENALTY_THRESHOLD;
  gameState.isVirtualBraking = false;
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

  let vz = updateForwardVelocity(gameState);
  vz = updateTrackSpaceLateral(gameState, curvature, vz);

  gameState.speed = vz;
  return advanceCarPosition(gameState, lapLength);
}

export { updateCarPhysics };
