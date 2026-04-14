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

  // Avança o índice em cache (wpIdx) até o waypoint mais próximo atrás do carro.
  // Reseta para 0 em volta nova (lapZ retrocedeu).
  let idx = gameState.wpIdx || 0;
  if (lapZ + RACING_LINE_STEP < rl[idx].z) idx = 0;
  while (idx < rl.length - 1 && rl[idx + 1].z <= lapZ) idx++;
  gameState.wpIdx = idx;

  const la = rl[(idx + AUTOSTEER_LOOKAHEAD_N) % rl.length];

  // F_ff = −κ × K_ff × vz
  // Sinal negativo: pré-direciona NA curva para antecipar a força centrífuga
  // antes que o erro de posição se acumule.
  const safeCurve = Math.abs(la.curve) < CURVATURE_DEADZONE ? 0 : la.curve;
  const feedfwd = -safeCurve * AUTOSTEER_FEEDFORWARD_K * vz;

  // Suprime forças do controlador para fora perto do limite físico da pista.
  const currentOffset = gameState.lateralOffset || 0;
  const edgeBlend = clamp(
    (Math.abs(currentOffset) / PHYSICS_TRACK_HALF -
      AUTOSTEER_EDGE_GUARD_RATIO) /
      (1 - AUTOSTEER_EDGE_GUARD_RATIO),
    0,
    1,
  );

  // Quando o carro já está próximo da linha de corrida, pula o cálculo PD e retorna
  // apenas o feedforward — elimina micro-jitter em posicionamento quase perfeito.
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
      telemetry: { targetHeading: 0, kpForce: 0, autoSteerForce: earlyForce },
    };
  }

  const offsetError = la.targetX - currentOffset;

  // Em grampos (alta curvatura): faixa completa de 0,9 rad disponível.
  // Em retas (baixa curvatura): cap cai para 0,04 rad — evita inclinação
  // agressiva em resposta a pequenos erros de posição na reta.
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

  // Autoridade de recuperação: longe da linha de corrida, expande o cap para
  // AUTOSTEER_MAX_HEADING — senão o cap de 0,04 rad em retas impediria a recuperação.
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

  // speedFactor reduz a taxa de heading e o Kp em alta velocidade —
  // a direção fica mais pesada, análogo ao aumento de inércia efetiva.
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

  // carVisualHeading defasa em relação a carHeadingDelta para evitar
  // inclinações bruscas do sprite em atualizações abruptas de heading.
  const currentVisual = gameState.carVisualHeading || 0;
  gameState.carVisualHeading = lerp(
    currentVisual,
    gameState.carHeadingDelta,
    clamp(AUTOSTEER_VISUAL_LERP_RATE * dt, 0, 1),
  );

  const steerScale = getAeroStrategy(gameState.aeroMode).autoSteerScale;
  return {
    force: finalForce * steerScale,
    telemetry: { targetHeading, kpForce: rawForce, autoSteerForce: finalForce },
  };
}

export { computeAutoSteer };
