import { getLapData } from "../../utils/math.js";
import { computeForwardVelocity, precomputeSlip } from "./longitudinal.js";
import { integrateLateralState } from "./lateral.js";
import { computeAutoSteer } from "./autosteer.js";
import { writePhysicsTelemetry } from "./telemetry.js";
import { CURVATURE_DEADZONE } from "../../constants/index.js";

// currentSlip = 0 aqui porque computeForwardVelocity o lê antes de integrateLateralState reescrevê-lo.
function resolveTrackState(gameState, currentTrackInfo) {
  gameState.trackType = currentTrackInfo.type;
  gameState.currentSlip = 0;
  return { curvature: currentTrackInfo.curve || 0 };
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

  // 2. Pré-calcula slip do frame atual com a velocidade do frame anterior (gameState.speed).
  precomputeSlip(gameState, effectiveCurvature);

  // 3. Velocidade longitudinal — agora lê isPenalized corretamente
  const vz = computeForwardVelocity(gameState, dt);

  // 4. AutoSteer (PD + feedforward)
  const { force: autoSteerForce, telemetry: steerTel } = computeAutoSteer(
    gameState,
    track,
    vz,
    dt,
  );

  // 5. Dinâmica lateral + penalidades fora da pista (recalcula slip final com vz real)
  const { nextVz, forces } = integrateLateralState(
    gameState,
    effectiveCurvature,
    vz,
    autoSteerForce,
    dt,
  );

  // 6. Telemetria
  writePhysicsTelemetry(gameState, {
    centrifugalForce: forces.centrifugalForce,
    effectiveGrip: forces.effectiveGrip,
    targetHeading: steerTel.targetHeading,
    kpForce: steerTel.kpForce,
    autoSteerForce: steerTel.autoSteerForce,
  });

  // 7. Confirma velocidade e avança
  gameState.speed = nextVz;
  gameState.previousCurvature = curvature;

  return advanceAlongTrack(gameState, lapLength, dt);
}

export { updateCarPhysics };
