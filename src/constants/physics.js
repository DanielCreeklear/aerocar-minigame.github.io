export const CENTRIFUGAL_SCALE_C = 0.003;

export const VZ_ACCEL_MODE_X = 1.05;
export const VZ_ACCEL_MODE_Z = 0.55;
export const VZ_DRAG_MODE_X = 0.996;
export const VZ_DRAG_MODE_Z = 0.975;
export const VZ_MAX_MODE_X = 30;
export const VZ_MAX_MODE_Z = 17;

export const MAX_GRIP_MODE_X = 4.0;
export const MAX_GRIP_MODE_Z = 5.0;

export const CENTRIFUGAL_DIRECT_PUSH_X = 0.12;

export const LATERAL_FRICTION_GRIP_X = 0.93;
export const LATERAL_FRICTION_GRIP_Z = 0.8;

export const SLIP_BLEND_START = 0.82;
export const SLIP_BLEND_RANGE = 0.92;
export const SLIP_DAMPING_MODE_X = 0.96;
export const SLIP_DAMPING_MODE_Z = 0.82;

export const GRIP_MIN_FLOOR = 0.0001;
export const SLIP_GRIP_EROSION = 0.28;
export const SLIP_FORCE_MODE_X = 1.2;
export const SLIP_FORCE_MODE_Z = 0.65;
export const SLIP_VZ_PENALTY = 0.12;
export const COUNTERSTEER_DAMPING_BONUS = 0.82;

export const EDGE_RATIO_CLAMP_MAX = 1.2;
export const EDGE_PRESSURE_RATIO_START = 0.82;
export const EDGE_PRESSURE_RATIO_RANGE = 0.18;
export const EDGE_VX_DAMPING_FACTOR = 0.18;

export const LATERAL_VX_DEAD_ZONE = 0.01;
export const WALL_BOUNCE_DAMPING = 0.5;

export const OFF_TRACK_CENTERING_BONUS = 0.05;
export const OFF_TRACK_RECOVERY_PER_UNIT = 0.002;
export const OFF_TRACK_OUTWARD_VX_DAMP = 0.9;

export const MAX_LATERAL_VX = 34;

export const OFF_TRACK_VZ_DRAG = 0.85;
export const OFF_TRACK_VX_DRAG = 0.9;

export const CURVE_DRAG_FACTOR_X = 0.03;
export const CURVE_DRAG_FACTOR_Z = 0.017;

export const OFF_TRACK_DUST_FRAMES = 20;
export const OFF_TRACK_MAX_OFFSET_MARGIN = 300;

export const SLIP_PENALTY_THRESHOLD = 0.15;

export const BOOST_BASE_GAIN = 16;
export const BOOST_MIN_EFFECT = 0.35;
export const BOOST_SLIP_EFFECT_FACTOR = 0.08;
export const BOOST_BATTERY_DRAIN = 0.4;
export const BOOST_OVERCAP_RATIO = 1.1;

export const MANUAL_BRAKE_DECEL = 0.84;
export const BRAKE_REGEN_BASE = 0.2;
export const BRAKE_REGEN_SPEED_FACTOR = 0.025;

export const AUTOSTEER_LOOKAHEAD_N = 3;
export const AUTOSTEER_FEEDFORWARD_K = 0.003;
export const AUTOSTEER_SLIP_SUPPRESS = 0.85;
export const AUTOSTEER_HEADING_KH = 0.05;
export const AUTOSTEER_MAX_HEADING = 0.9;
export const AUTOSTEER_HEADING_RATE = 0.05;
export const AUTOSTEER_KP = 0.05;
export const AUTOSTEER_KD = 0.5;
export const AUTOSTEER_EDGE_GUARD_RATIO = 0.8;
export const AUTOSTEER_OFFSET_DEADZONE = 0.5;
export const CURVATURE_DEADZONE = 0.001;
export const CAR_HEADING_VISUAL_SCALE = 0.22;

export const AUTOSTEER_SPEED_SENSITIVITY = 0.004;
export const AUTOSTEER_MIN_HEADING = 0.04;
export const AUTOSTEER_CURVATURE_REF = 10.0;
export const AUTOSTEER_VISUAL_LERP_RATE = 0.15;
export const AUTOSTEER_KP_FLOOR_RATIO = 0.12;

// Recovery Authority: distance (m) from racing line at which the AI gains full steering freedom
// to recover back to the track, overriding the curvature-based cap.
// Blend starts at this threshold and reaches full AUTOSTEER_MAX_HEADING at 2× this value.
export const AUTOSTEER_RECOVERY_THRESHOLD = 4.0;

// Slip lateral kinetic damping: exponential decay factor (per second) applied to lateral velocity
// when the car is in full slip — prevents unbounded vx accumulation ("lateral cannon" bug).
// Physics analogy: kinetic friction opposing the slide, dissipating energy.
// At full slip, combined with SLIP_DAMPING_MODE_X (0.96) gives equilibrium vx ≈ 7–8 m/s.
export const SLIP_LATERAL_KINETIC_DAMPING = 0.12;
