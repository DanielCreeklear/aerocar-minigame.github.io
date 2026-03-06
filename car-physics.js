import {
  AERO_MODES,
  BATTERY_MAX,
  BOOST_BASE_GAIN,
  BOOST_BATTERY_DRAIN,
  BOOST_MIN_EFFECT,
  BOOST_SLIP_EFFECT_FACTOR,
  CURVE_X_BASE_SPEED,
  CURVE_Z_BASE_SPEED,
  LATERAL_ACCEL_FACTOR_X,
  LATERAL_ACCEL_FACTOR_Z,
  LATERAL_DAMPING_X,
  LATERAL_DAMPING_Z,
  LATERAL_RECOVERY_Z,
  MAX_LATERAL_VELOCITY,
  MIN_CURVE_SPEED,
  MODE_X_GRIP_LIMIT,
  MODE_Z_GRIP_LIMIT,
  OFF_TRACK_DRAG,
  OFF_TRACK_DUST_FRAMES,
  OFF_TRACK_LATERAL_DAMPING,
  OFF_TRACK_MAX_OFFSET_MARGIN,
  OFF_TRACK_MIN_SPEED,
  SLIP_PENALTY_THRESHOLD,
  STRAIGHT_X_BASE_SPEED,
  STRAIGHT_Z_BASE_SPEED,
  TRACK_TYPES,
  TRACK_WIDTH,
  Z_BRAKE_CURVE_LOAD_FACTOR,
  Z_BRAKE_RECHARGE_FACTOR,
  Z_BRAKE_SLIP_LOAD_FACTOR,
} from "./constants/index.js";

function getLapData(currentZ, lapLength) {
  let lapZ = lapLength > 0 ? currentZ % lapLength : 0;
  if (lapZ < 0) lapZ += lapLength;
  return { lapZ };
}

function getCurveState(gameState, currentTrackInfo) {
  gameState.trackType = currentTrackInfo.type;

  const curve = currentTrackInfo.curve || 0;
  const curveDirection = Math.sign(curve);
  const curveForce = Math.abs(curve);
  const isCurve = gameState.trackType === TRACK_TYPES.CURVE;
  const currentGripLimit =
    gameState.aeroMode === AERO_MODES.Z ? MODE_Z_GRIP_LIMIT : MODE_X_GRIP_LIMIT;
  const slip = isCurve ? Math.max(0, curveForce - currentGripLimit) : 0;

  gameState.currentSlip = slip;
  gameState.curveForce = curveForce;

  return { curveDirection, curveForce, isCurve, slip };
}

function updateCurrentSegmentIndex(gameState, track, lapZ) {
  const seg = track.segments.find((s) => lapZ >= s.startZ && lapZ < s.endZ);
  if (seg) gameState.currentSegmentIndex = seg.index;
}

function calculateBaseSpeed(gameState, isCurve) {
  if (gameState.trackType === TRACK_TYPES.STRAIGHT) {
    return gameState.aeroMode === AERO_MODES.X
      ? STRAIGHT_X_BASE_SPEED
      : STRAIGHT_Z_BASE_SPEED;
  }

  if (isCurve) {
    const baseCurveSpeed =
      gameState.aeroMode === AERO_MODES.X
        ? CURVE_X_BASE_SPEED
        : CURVE_Z_BASE_SPEED;
    return Math.max(MIN_CURVE_SPEED, baseCurveSpeed);
  }

  return 0;
}

function applyBatteryAndBoost(
  gameState,
  baseSpeed,
  speedBeforeUpdate,
  isCurve,
  slip,
  curveForce,
) {
  gameState.isPenalized = slip > SLIP_PENALTY_THRESHOLD;

  const isVirtualBraking =
    isCurve &&
    gameState.aeroMode === AERO_MODES.Z &&
    !gameState.isBoosting &&
    speedBeforeUpdate > baseSpeed;
  gameState.isVirtualBraking = isVirtualBraking;

  if (isVirtualBraking && gameState.battery < BATTERY_MAX) {
    const brakeLoad = Math.max(
      0,
      curveForce * Z_BRAKE_CURVE_LOAD_FACTOR + slip * Z_BRAKE_SLIP_LOAD_FACTOR,
    );
    gameState.battery += brakeLoad * Z_BRAKE_RECHARGE_FACTOR;
  }

  if (gameState.isBoosting && gameState.battery > 0) {
    const boostEffect = Math.max(
      BOOST_MIN_EFFECT,
      1 - slip * BOOST_SLIP_EFFECT_FACTOR,
    );
    baseSpeed += BOOST_BASE_GAIN * boostEffect;
    gameState.battery -= BOOST_BATTERY_DRAIN;
  }

  gameState.battery = Math.max(0, Math.min(BATTERY_MAX, gameState.battery));
  return baseSpeed;
}

function updateLateralAndOffTrack(
  gameState,
  baseSpeed,
  speedBeforeUpdate,
  slip,
  curveDirection,
) {
  let lateralOffset = gameState.lateralOffset || 0;
  let lateralVelocity = gameState.lateralVelocity || 0;
  const trackLimit = TRACK_WIDTH * 0.5;
  const maxLateralOffset = trackLimit + OFF_TRACK_MAX_OFFSET_MARGIN;
  const wasOffTrack = Math.abs(lateralOffset) > trackLimit;
  const isModeX = gameState.aeroMode === AERO_MODES.X;
  const lateralAccelFactor = isModeX
    ? LATERAL_ACCEL_FACTOR_X
    : LATERAL_ACCEL_FACTOR_Z;
  const lateralDamping = isModeX ? LATERAL_DAMPING_X : LATERAL_DAMPING_Z;

  if (slip > 0 && curveDirection !== 0) {
    lateralVelocity +=
      slip *
      Math.max(speedBeforeUpdate, 1) *
      lateralAccelFactor *
      -curveDirection;
  }

  if (!isModeX && lateralOffset !== 0) {
    const recovery = LATERAL_RECOVERY_Z * Math.max(baseSpeed, 1);
    if (Math.abs(lateralOffset) <= recovery) {
      lateralOffset = 0;
      lateralVelocity *= 0.5;
    } else {
      lateralVelocity += lateralOffset > 0 ? -recovery : recovery;
    }
  }

  lateralVelocity *= lateralDamping;
  if (wasOffTrack) {
    lateralVelocity *= OFF_TRACK_LATERAL_DAMPING;
  }

  lateralVelocity = Math.max(
    -MAX_LATERAL_VELOCITY,
    Math.min(MAX_LATERAL_VELOCITY, lateralVelocity),
  );
  lateralOffset += lateralVelocity;

  lateralOffset = Math.max(
    -maxLateralOffset,
    Math.min(maxLateralOffset, lateralOffset),
  );
  if (
    (lateralOffset >= maxLateralOffset && lateralVelocity > 0) ||
    (lateralOffset <= -maxLateralOffset && lateralVelocity < 0)
  ) {
    lateralVelocity = 0;
  }

  const isOffTrack = Math.abs(lateralOffset) > trackLimit;
  if (isOffTrack) {
    lateralVelocity *= OFF_TRACK_LATERAL_DAMPING;
  }

  if (
    !isModeX &&
    Math.abs(lateralOffset) < 0.2 &&
    Math.abs(lateralVelocity) < 0.2
  ) {
    lateralOffset = 0;
    lateralVelocity = 0;
  }

  if (isOffTrack) {
    const draggedSpeed = Math.max(
      OFF_TRACK_MIN_SPEED,
      Math.max(speedBeforeUpdate, OFF_TRACK_MIN_SPEED) * OFF_TRACK_DRAG,
    );
    baseSpeed = Math.min(baseSpeed, draggedSpeed);
    gameState.offTrackDustTimer = OFF_TRACK_DUST_FRAMES;
  } else {
    gameState.offTrackDustTimer = Math.max(
      0,
      (gameState.offTrackDustTimer || 0) - 1,
    );
  }

  gameState.lateralOffset = lateralOffset;
  gameState.lateralVelocity = lateralVelocity;
  gameState.isOffTrack = isOffTrack;

  return baseSpeed;
}

function advanceCarPosition(gameState, lapLength) {
  const { lapZ: previousLapZ } = getLapData(gameState.currentZ, lapLength);

  gameState.currentZ += gameState.speed;

  const { lapZ: nextLapZ } = getLapData(gameState.currentZ, lapLength);
  const lapCompleted = lapLength > 0 && nextLapZ < previousLapZ;

  return { lapCompleted };
}

function updateCarPhysics(gameState, track) {
  gameState.isPenalized = false;
  const lapLength = track.lapLength || track.totalDistance;
  const speedBeforeUpdate = gameState.speed;

  const currentTrackInfo = track.getTrackPoint(gameState.currentZ);
  const { lapZ } = getLapData(gameState.currentZ, lapLength);
  const { curveDirection, curveForce, isCurve, slip } = getCurveState(
    gameState,
    currentTrackInfo,
  );

  updateCurrentSegmentIndex(gameState, track, lapZ);

  let baseSpeed = calculateBaseSpeed(gameState, isCurve);
  baseSpeed = applyBatteryAndBoost(
    gameState,
    baseSpeed,
    speedBeforeUpdate,
    isCurve,
    slip,
    curveForce,
  );
  baseSpeed = updateLateralAndOffTrack(
    gameState,
    baseSpeed,
    speedBeforeUpdate,
    slip,
    curveDirection,
  );

  gameState.speed = baseSpeed;
  return advanceCarPosition(gameState, lapLength);
}

export { updateCarPhysics };
