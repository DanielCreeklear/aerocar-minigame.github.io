export const VZ_ACCEL_MODE_X = 0.3;
export const VZ_ACCEL_MODE_Z = 0.15;

export const VZ_DRAG_MODE_X = 0.996;
export const VZ_DRAG_MODE_Z = 0.975;

export const VZ_MAX_MODE_X = 21;
export const VZ_MAX_MODE_Z = 8;

export const MANUAL_BRAKE_DECEL = 0.84;

export const BOOST_BASE_GAIN = 16;

export const BOOST_MIN_EFFECT = 0.35;

export const BOOST_SLIP_EFFECT_FACTOR = 0.08;

export const BOOST_BATTERY_DRAIN = 0.4;

export const BOOST_OVERCAP_RATIO = 1.1;

export const BRAKE_REGEN_BASE = 0.2;
export const BRAKE_REGEN_SPEED_FACTOR = 0.025;

export const SLIP_PENALTY_THRESHOLD = 0.15;

export const PASSIVE_REGEN_FACTOR = 0.4;

// Reduced 0.0004 → 0.00006: old value caused equilibrium heading of 64° at Mode X
// max speed (vz=21) through a medium curve, sending car off-track in ~5 frames.
export const HEADING_CURVE_FACTOR = 0.00006;
// Reduced 0.05 → 0.02: 0.05 produced equilibrium heading ~95° at full steer input,
// causing violent snap turns. 0.02 → ~20° equilibrium, controllable.
export const STEER_YAW_RATE = 0.02;

// Lerp rate for carVisualHeading toward carHeading (per dt unit).
// Prevents single-frame rotation jerks when heading changes abruptly.
export const VISUAL_HEADING_LERP = 0.25;

// Per-frame exponential decay applied to speed when above mode's maxVz.
// Smooths the jarring instant snap when switching from Mode X → Mode Z.
export const OVERSPEED_DRAG = 0.92;

export const TRACK_GRID_CELL_SIZE = 10;

export const LATERAL_FRICTION_GRIP_X = 0.97;
export const LATERAL_FRICTION_GRIP_Z = 0.93;

export const MAX_LATERAL_VX = 34;

export const WALL_BOUNCE_DAMPING = 0.5;

export const PHYSICS_TRACK_HALF = 100;

export const CURB_HALF = 120;

// Relaxed 0.8 → 0.92: less punishing drag so the car can still escape the grass.
export const OFF_TRACK_VZ_DRAG = 0.92;

export const OFF_TRACK_VX_DRAG = 0.9;

// Raised 7 → 16: previous cap + drag almost zeroed speed, making recovery impossible.
export const OFF_TRACK_MAX_SPEED = 16.0;

// Fraction of normal accel available on grass. Enough to steer out, not enough to race.
export const OFF_TRACK_ACCEL_FACTOR = 0.35;

// Raised trigger 10 → 18: casual off-tracks no longer trigger spin.
// Lowered exit 2 → 7: spin ends sooner so the car can recover and drive out.
export const SPIN_TRIGGER_SPEED = 18;
export const SPIN_EXIT_SPEED = 7;
export const SPIN_ANGULAR_VELOCITY = 3.5;

export const OFF_TRACK_CENTERING_BONUS = 0.2;

export const OFF_TRACK_RECOVERY_PER_UNIT = 0.008;

export const OFF_TRACK_OUTWARD_VX_DAMP = 0.9;

export const OFF_TRACK_DUST_FRAMES = 20;

export const OFF_TRACK_MAX_OFFSET_MARGIN = 300;

export const CURB_VZ_DRAG = 0.94;

export const CAR_HEADING_VISUAL_SCALE = 0.22;
