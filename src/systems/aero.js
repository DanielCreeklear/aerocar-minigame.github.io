import {
  AERO_MODES,
  LATERAL_FRICTION_GRIP_X,
  LATERAL_FRICTION_GRIP_Z,
  VZ_ACCEL_MODE_X,
  VZ_ACCEL_MODE_Z,
  VZ_DRAG_MODE_X,
  VZ_DRAG_MODE_Z,
  VZ_MAX_MODE_X,
  VZ_MAX_MODE_Z,
} from "../constants/index.js";

const LowDragMode = {
  name: AERO_MODES.X,
  accel: VZ_ACCEL_MODE_X,
  drag: VZ_DRAG_MODE_X,
  maxVz: VZ_MAX_MODE_X,
  lateralFriction: LATERAL_FRICTION_GRIP_X,
  aeroGripFactor: 0.002,
  understeerFactor: 0.55,
};

const HighDownforceMode = {
  name: AERO_MODES.Z,
  accel: VZ_ACCEL_MODE_Z,
  drag: VZ_DRAG_MODE_Z,
  maxVz: VZ_MAX_MODE_Z,
  lateralFriction: LATERAL_FRICTION_GRIP_Z,
  aeroGripFactor: 0.048,
  understeerFactor: 0.08,
};

function getAeroStrategy(aeroMode) {
  return aeroMode === AERO_MODES.X ? LowDragMode : HighDownforceMode;
}

export { LowDragMode, HighDownforceMode, getAeroStrategy };
