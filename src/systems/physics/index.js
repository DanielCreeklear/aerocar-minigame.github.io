import { getLapData } from "../../utils/math.js";
import { computeForwardVelocity } from "./longitudinal.js";
import { integrateLateralState } from "./lateral.js";
import { computeAutoSteer } from "./autosteer.js";
import { writePhysicsTelemetry } from "./telemetry.js";
import {
  CURVATURE_DEADZONE,
  SPIN_ANGULAR_VELOCITY,
} from "../../constants/index.js";

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
  const seg = track.segments.find((s) => lapZ >= s.startZ && lapZ < s.endZ);
  if (seg) gameState.currentSegmentIndex = seg.index;
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

  // Deadzone de curvatura: evita forças centrífugas fantasmas por ruído de ponto flutuante.
  const effectiveCurvature =
    Math.abs(curvature) < CURVATURE_DEADZONE ? 0 : curvature;

  // 2. Velocidade longitudinal
  const vz = computeForwardVelocity(gameState, dt);

  // 3. AutoSteer (PD + feedforward)
  const { force: autoSteerForce, telemetry: steerTel } = computeAutoSteer(
    gameState,
    track,
    vz,
    dt,
  );

  // 4. Dinâmica lateral + penalidades fora da pista
  const { nextVz, forces } = integrateLateralState(
    gameState,
    effectiveCurvature,
    vz,
    autoSteerForce,
    dt,
  );

  // 5. Telemetria
  writePhysicsTelemetry(gameState, {
    centrifugalForce: forces.centrifugalForce,
    effectiveGrip: forces.effectiveGrip,
    targetHeading: steerTel.targetHeading,
    kpForce: steerTel.kpForce,
    autoSteerForce: steerTel.autoSteerForce,
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

  return advanceAlongTrack(gameState, lapLength, dt);
}

export { updateCarPhysics };
