import { clamp, lerp } from "../../utils/math.js";
import { getAeroStrategy } from "../aero.js";
import {
  AUTOSTEER_LOOKAHEAD_N,
  AUTOSTEER_FEEDFORWARD_K,
  AUTOSTEER_HEADING_KH,
  AUTOSTEER_MAX_HEADING,
  AUTOSTEER_MIN_HEADING,
  AUTOSTEER_HEADING_RATE,
  AUTOSTEER_KP,
  AUTOSTEER_KD,
  AUTOSTEER_EDGE_GUARD_RATIO,
  AUTOSTEER_OFFSET_DEADZONE,
  AUTOSTEER_SPEED_SENSITIVITY,
  AUTOSTEER_CURVATURE_REF,
  AUTOSTEER_VISUAL_LERP_RATE,
  AUTOSTEER_KP_FLOOR_RATIO,
  AUTOSTEER_RECOVERY_THRESHOLD,
  CURVATURE_DEADZONE,
  PHYSICS_TRACK_HALF,
  RACING_LINE_STEP,
} from "../../constants/index.js";

function computeAutoSteer(gameState, track, vz, dt) {
  const rl = track.racingLine;
  const lapLength = track.lapLength || track.totalDistance;
  const lapZ = ((gameState.currentZ % lapLength) + lapLength) % lapLength;

  let idx = gameState.wpIdx || 0;
  if (lapZ + RACING_LINE_STEP < rl[idx].z) idx = 0;
  while (idx < rl.length - 1 && rl[idx + 1].z <= lapZ) idx++;
  gameState.wpIdx = idx;

  const la = rl[(idx + AUTOSTEER_LOOKAHEAD_N) % rl.length];
  const cur = rl[idx];

  // F_ff uses CURRENT curve to match the centrifugal force acting on the car right now
  const safeCurve = Math.abs(cur.curve) < CURVATURE_DEADZONE ? 0 : cur.curve;
  const feedfwd = -safeCurve * AUTOSTEER_FEEDFORWARD_K * vz;

  const currentOffset = gameState.lateralOffset || 0;
  const edgeBlend = clamp(
    (Math.abs(currentOffset) / PHYSICS_TRACK_HALF -
      AUTOSTEER_EDGE_GUARD_RATIO) /
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
    const earlyScale = getAeroStrategy(gameState.aeroMode).autoSteerScale;
    return {
      force: earlyForce * earlyScale,
      telemetry: {
        targetHeading: 0,
        kpForce: 0,
        autoSteerForce: earlyForce * earlyScale,
      },
    };
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

  const currentVisual = gameState.carVisualHeading || 0;
  gameState.carVisualHeading = lerp(
    currentVisual,
    gameState.carHeadingDelta,
    clamp(AUTOSTEER_VISUAL_LERP_RATE * dt, 0, 1),
  );

  const steerScale = getAeroStrategy(gameState.aeroMode).autoSteerScale;
  return {
    force: finalForce * steerScale,
    telemetry: {
      targetHeading,
      kpForce: rawForce,
      autoSteerForce: finalForce * steerScale,
    },
  };
}

export { computeAutoSteer };
