export const TRACK_WIDTH = 460;
export const BORDER_WIDTH = 24;
export const SPEED_KMH_SCALE = 17;
export const LATERAL_RENDER_SCALE = 2.3;
export const CAR_WIDTH = 50;
export const CAR_HEIGHT = 100;
export const ROAD_SAMPLE_STEP = 3;
export const CAR_Y_RATIO = 0.8;
export const HALF_RATIO = 0.5;
export const CURVE_STRIPE_LENGTH = 120;
export const STRAIGHT_STRIPE_LENGTH = 180;
export const MAX_SHAKE = 18;
export const SHAKE_SLIP_FACTOR = 2.8;
export const MIN_CAR_ALPHA = 0.55;
export const CAR_SLIP_ALPHA_FACTOR = 0.06;
export const CAR_CURVE_ROTATION_FACTOR = 0.12;
export const CAR_SHADOW_WIDTH_FACTOR = 0.72;
export const CAR_SHADOW_HEIGHT = 12;
export const CAR_NOSE_WIDTH_FACTOR = 0.62;
export const CAR_REAR_WIDTH_FACTOR = 0.9;
export const CAR_BODY_TOP_Y_FACTOR = -0.5;
export const CAR_BODY_BOTTOM_Y_FACTOR = 0.42;
export const CAR_COCKPIT_WIDTH_FACTOR = 0.54;
export const CAR_COCKPIT_HEIGHT_FACTOR = 0.3;
export const CAR_COCKPIT_Y_FACTOR = -0.2;
export const CAR_CENTER_STRIPE_WIDTH_FACTOR = 0.18;
export const CAR_WHEEL_WIDTH = 9;
export const CAR_WHEEL_HEIGHT = 24;
export const CAR_WHEEL_X_OFFSET = 3;
export const CAR_WHEEL_FRONT_Y_FACTOR = -0.2;
export const CAR_WHEEL_REAR_Y_FACTOR = 0.2;
export const CAR_LIGHT_WIDTH = 10;
export const CAR_LIGHT_HEIGHT = 6;
export const BOOST_FLAME_WIDTH = 30;
export const BOOST_FLAME_HEIGHT_MIN = 30;
export const BOOST_FLAME_HEIGHT_RANDOM = 20;
export const BOOST_FLAME_X_OFFSET = -15;
export const RENDER_COLORS = {
  grass: "#5C6B80",
  grassDark: "#4A5A6E",
  skyTop: "#060c18",
  skyHorizon: "#162436",
  asphaltCurve: "#1E2126",
  asphaltStraight: "#2A2E35",
  runoff: "#8B9BB4",
  red: "#E60000",
  redLight: "#FF3333",
  redDark: "#990000",
  white: "#FFFFFF",
  finishWhite: "#FFFFFF",
  finishBlack: "#111111",
  gridLine: "#FFD700",
  modeZ: "#1c3280",
  modeZLight: "#4870c0",
  modeZDark: "#0e1a48",
  boost: "#FFD700",
  wheel: "#141418",
  cockpit: "#000000",
  headlight: "#FFD700",
  taillight: "#E60000",
  asphaltModeX: "#1A2838",
};

// Camera / zoom constants (player-oriented lookahead + dynamic zoom)
export const CAMERA_LOOKAHEAD_Z = 300; // world units ahead on track
export const CAMERA_LOOKAHEAD_FACTOR = 0.4; // fraction towards look point
export const CAMERA_LATERAL_VEL_LOOKAHEAD = 0.12; // scale lateral velocity influence
export const CAMERA_LERP = 8.0; // higher = snappier
export const ZOOM_BASE = 1.0; // neutral world zoom
export const ZOOM_MIN = 0.90;
export const ZOOM_MAX = 1.06;
export const ZOOM_RANGE = 0.16; // amount adjustable by speed
export const ZOOM_LERP = 6.0;
export const BRAKE_ZOOM_BONUS = 0.06; // extra zoom when braking in Mode Z

// Skid layer default settings
export const SKID_LAYER_DPR = 1; // relative DPR for skid offscreen canvas (can be lowered for perf)
export const SKID_SLIP_THRESHOLD = 0.18; // slip threshold to emit skids
export const SKID_LATERAL_VEL_THRESHOLD = 6; // lateral velocity threshold
