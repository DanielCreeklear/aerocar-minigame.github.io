import { getLapData, clamp } from "../../utils/math.js";
import { getAeroStrategy } from "../aero.js";
import { computeForwardVelocity } from "./longitudinal.js";
import { integrateLateralState } from "./lateral.js";
import { buildPhysicsTelemetry } from "./telemetry.js";
import { SPIN_ANGULAR_VELOCITY } from "../../constants/index.js";

function resolveTrackState(gameState, currentTrackInfo) {
  gameState.trackType = currentTrackInfo.type;
  gameState.currentSlip = 0;
  // Use rawCurve (pure segment curvature) to avoid phantom centrifugal forces
  // introduced by the loop-closure polynomial in normalizeTrackData.
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

  // 1. Estado da pista
  const { curvature } = resolveTrackState(gameState, currentTrackInfo);
  gameState.currentTrackPoint = currentTrackInfo;
  gameState.currentCurvature = curvature;
  gameState.curveForce = Math.abs(curvature);
  resolveCurrentSegment(gameState, track, lapZ);

  const CURVATURE_DEADZONE = 0.001;
  const effectiveCurvature =
    Math.abs(curvature) < CURVATURE_DEADZONE ? 0 : curvature;

  // 2. Velocidade longitudinal
  const strategy = getAeroStrategy(gameState.aeroMode);
  const vz = computeForwardVelocity(gameState, dt, strategy);

  // 3. Surface type via O(1) grid lookup.
  // lateralOffset is a pure world-X delta from the centerline (same units as pt.x).
  const worldX = currentTrackInfo.x + (gameState.lateralOffset || 0);
  const surfaceType = track.getSurfaceType(worldX, lapZ);

  // 4. Lateral dynamics + off-track penalties
  const { nextVz, forces } = integrateLateralState(
    gameState,
    effectiveCurvature,
    vz,
    dt,
    strategy,
    surfaceType,
  );

  gameState.carVisualHeading = gameState.carHeading || 0;

  // 5. Telemetria
  const physicsTelemetry = buildPhysicsTelemetry({
    centrifugalForce: forces.centrifugalForce,
    effectiveGrip: forces.effectiveGrip,
  });

  // 6. Confirma velocidade e avança
  gameState.speed = nextVz;
  gameState.previousCurvature = curvature;

  // 8. Spin rotation: gira enquanto isSpinning, amortecer quando para.
  if (gameState.isSpinning) {
    gameState.spinRotation =
      (gameState.spinRotation || 0) + SPIN_ANGULAR_VELOCITY * dt;
  } else {
    gameState.spinRotation = (gameState.spinRotation || 0) * Math.pow(0.85, dt);
  }

  const { lapCompleted } = advanceAlongTrack(gameState, lapLength, dt);
  return { lapCompleted, physicsTelemetry };
}

export { updateCarPhysics };
