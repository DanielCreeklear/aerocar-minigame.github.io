import {
  AERO_MODES,
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

// Modo X: baixo arrasto
const LowDragMode = {
  name: AERO_MODES.X,
  accel: VZ_ACCEL_MODE_X,
  drag: VZ_DRAG_MODE_X,
  maxVz: VZ_MAX_MODE_X,
  maxGrip: MAX_GRIP_MODE_X,
  lateralFriction: LATERAL_FRICTION_GRIP_X,
  slipDamping: SLIP_DAMPING_MODE_X,
  slipForceScale: SLIP_FORCE_MODE_X,
  centrifugalPushFactor: 0.2,
  autoSteerScale: 0.12,
};

// Modo Z: alto downforce
const HighDownforceMode = {
  name: AERO_MODES.Z,
  accel: VZ_ACCEL_MODE_Z,
  drag: VZ_DRAG_MODE_Z,
  maxVz: VZ_MAX_MODE_Z,
  maxGrip: MAX_GRIP_MODE_Z,
  lateralFriction: LATERAL_FRICTION_GRIP_Z,
  slipDamping: SLIP_DAMPING_MODE_Z,
  slipForceScale: SLIP_FORCE_MODE_Z,
  centrifugalPushFactor: 0.2,
  autoSteerScale: 0.18,
};

function getAeroStrategy(aeroMode) {
  return aeroMode === AERO_MODES.X ? LowDragMode : HighDownforceMode;
}

export { LowDragMode, HighDownforceMode, getAeroStrategy };
