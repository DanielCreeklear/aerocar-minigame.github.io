import { getLapData, clamp } from "../../utils/math.js";
import { getAeroStrategy } from "../aero.js";
import { computeForwardVelocity } from "./longitudinal.js";
import { integrateLateralState } from "./lateral.js";
import { buildPhysicsTelemetry } from "./telemetry.js";
import {
  SPIN_ANGULAR_VELOCITY,
  VISUAL_HEADING_LERP,
  MAX_DRIFT_VISUAL_ANGLE,
  DRIFT_ANGLE_LERP,
  UNDERSTEER_FACTOR,
} from "../../constants/index.js";
function resolveTrackState(gameState, currentTrackInfo) {
  gameState.trackType = currentTrackInfo.type;
  gameState.currentSlip = 0;
  return {
    curvature: currentTrackInfo.rawCurve ?? currentTrackInfo.curve ?? 0,
  };
}
function resolveCurrentSegment(gameState, track, lapZ) {
  const pos = track.getTrackPosition(lapZ);
  if (pos) {
    gameState.currentSegmentIndex = pos.segment.index;
    gameState.trackPhase = pos.phase;
    gameState.segmentProgress = pos.segmentProgress;
    gameState.distanceToSegmentEnd = pos.distanceToSegmentEnd;
  }
}
function advanceAlongTrack(gameState, lapLength, dt) {
  const { lapZ: previousLapZ } = getLapData(gameState.currentZ, lapLength);
  gameState.currentZ += gameState.speed * dt;
  const { lapZ: nextLapZ } = getLapData(gameState.currentZ, lapLength);
  return { lapCompleted: lapLength > 0 && nextLapZ < previousLapZ };
}
function updateCarPhysics(gameState, track, dt = 1, sampledTrackPoint = null) {
  const lapLength = track.lapLength || track.totalDistance;
  const currentTrackInfo =
    sampledTrackPoint || track.getTrackPoint(gameState.currentZ);
  const { lapZ } = getLapData(gameState.currentZ, lapLength);
  const { curvature } = resolveTrackState(gameState, currentTrackInfo);
  gameState.currentTrackPoint = currentTrackInfo;
  gameState.currentCurvature = curvature;
  gameState.curveForce = Math.abs(curvature);
  resolveCurrentSegment(gameState, track, lapZ);
  const CURVATURE_DEADZONE = 0.001;
  const effectiveCurvature =
    Math.abs(curvature) < CURVATURE_DEADZONE ? 0 : curvature;
  const strategy = getAeroStrategy(gameState.aeroMode);
  const vz = computeForwardVelocity(gameState, dt, strategy);
  const worldX = currentTrackInfo.x + (gameState.lateralOffset || 0);
  const surfaceType = track.getSurfaceType(worldX, lapZ);
  const { nextVz, forces } = integrateLateralState(
    gameState,
    effectiveCurvature,
    vz,
    dt,
    strategy,
    surfaceType,
  );
  const _overDrive = gameState.overDriveFactor || 0;
  const _prevVisualOD = gameState.visualOverDrive || 0;
  const _buildRate = _overDrive > _prevVisualOD ? 1.2 : 4.0;
  gameState.visualOverDrive =
    _prevVisualOD + (_overDrive - _prevVisualOD) * Math.min(1, _buildRate * dt);
  const _visualOD = gameState.visualOverDrive;
  const _steerEff = clamp(1 - _visualOD * UNDERSTEER_FACTOR, 0, 1);
  const _targetVisualHeading = (gameState.carHeading || 0) * _steerEff;
  gameState.carVisualHeading =
    (gameState.carVisualHeading || 0) +
    (_targetVisualHeading - (gameState.carVisualHeading || 0)) *
      Math.min(1, VISUAL_HEADING_LERP * dt);
  const physicsTelemetry = buildPhysicsTelemetry({
    centrifugalForce: forces.centrifugalForce,
    effectiveGrip: forces.effectiveGrip,
  });
  gameState.speed = nextVz;
  gameState.previousCurvature = curvature;
  if (gameState.isSpinning) {
    gameState.spinRotation =
      (gameState.spinRotation || 0) + SPIN_ANGULAR_VELOCITY * dt;
  } else {
    const _visualOD = gameState.visualOverDrive || 0;
    const slip = gameState.currentSlip || 0;
    const curvatureSign = Math.sign(
      gameState.previousCurvature || gameState.centrifugalDrift || 0,
    );
    const understeerAngle = -curvatureSign * clamp(_visualOD, 0, 1) * 0.15;
    const slideDir = Math.sign(gameState.lateralVelocity || 0);
    const driftAngle = -slip * slideDir * MAX_DRIFT_VISUAL_ANGLE * (1 - clamp(_visualOD, 0, 1));
    const targetAngle = understeerAngle + driftAngle;
    const current = gameState.spinRotation || 0;
    gameState.spinRotation =
      current + (targetAngle - current) * Math.min(1, DRIFT_ANGLE_LERP * dt);
  }
  const { lapCompleted } = advanceAlongTrack(gameState, lapLength, dt);
  return { lapCompleted, physicsTelemetry };
}
export { updateCarPhysics };
