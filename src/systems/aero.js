import {
  AERO_MODES,
  CURVE_DRAG_FACTOR_X,
  CURVE_DRAG_FACTOR_Z,
  LATERAL_FRICTION_GRIP_X,
  LATERAL_FRICTION_GRIP_Z,
  MAX_GRIP_MODE_X,
  MAX_GRIP_MODE_Z,
  SLIP_DAMPING_MODE_X,
  SLIP_DAMPING_MODE_Z,
  SLIP_FORCE_MODE_X,
  SLIP_FORCE_MODE_Z,
  VZ_ACCEL_MODE_X,
  VZ_ACCEL_MODE_Z,
  VZ_DRAG_MODE_X,
  VZ_DRAG_MODE_Z,
  VZ_MAX_MODE_X,
  VZ_MAX_MODE_Z,
} from "../constants/index.js";

// Modo X: baixo arrasto, alta velocidade em reta, instável em curva.
// autoSteerScale = 0.35 → autosteer opera com 35% da força normal.
// O carro tende a sair lateralmente em curvas se o jogador não frear antes.
const LowDragMode = {
  name: AERO_MODES.X,
  accel: VZ_ACCEL_MODE_X,
  drag: VZ_DRAG_MODE_X,
  maxVz: VZ_MAX_MODE_X,
  curveDragFactor: CURVE_DRAG_FACTOR_X,
  maxGrip: MAX_GRIP_MODE_X,
  lateralFriction: LATERAL_FRICTION_GRIP_X,
  slipDamping: SLIP_DAMPING_MODE_X,
  slipForceScale: SLIP_FORCE_MODE_X,
  useCentrifugalPush: true,
  autoSteerScale: 0.35, // instável em curvas
};

// Modo Z: alto downforce, velocidade máxima menor, aderência total em curva.
// autoSteerScale = 1.0 → autosteer pleno, carro segue a linha sem esforço.
const HighDownforceMode = {
  name: AERO_MODES.Z,
  accel: VZ_ACCEL_MODE_Z,
  drag: VZ_DRAG_MODE_Z,
  maxVz: VZ_MAX_MODE_Z,
  curveDragFactor: CURVE_DRAG_FACTOR_Z,
  maxGrip: MAX_GRIP_MODE_Z,
  lateralFriction: LATERAL_FRICTION_GRIP_Z,
  slipDamping: SLIP_DAMPING_MODE_Z,
  slipForceScale: SLIP_FORCE_MODE_Z,
  useCentrifugalPush: false,
  autoSteerScale: 1.0, // estável — downforce mantém o carro na linha
};

function getAeroStrategy(aeroMode) {
  return aeroMode === AERO_MODES.X ? LowDragMode : HighDownforceMode;
}

export { LowDragMode, HighDownforceMode, getAeroStrategy };
