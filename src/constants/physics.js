// =============================================================================
// LONGITUDINAL DYNAMICS
// =============================================================================
// Models forward motion along the track. The car is subject to two forces:
//   thrust:  vz += accel × dt          (simplified constant engine force)
//   drag:    vz *= drag^dt             (exponential aerodynamic decay)
// The combination produces a terminal velocity where both balance.
//
// Two aero modes trade top speed for cornering performance:
//   Mode X (Low Drag):       high top speed, low grip — fast open circuits
//   Mode Z (High Downforce): low top speed, high grip — technical sections

export const VZ_ACCEL_MODE_X = 1.05;
export const VZ_ACCEL_MODE_Z = 0.55;

export const VZ_DRAG_MODE_X = 0.996;
export const VZ_DRAG_MODE_Z = 0.975;

export const VZ_MAX_MODE_X = 30;
export const VZ_MAX_MODE_Z = 17;

export const MANUAL_BRAKE_DECEL = 0.84;

export const BOOST_BASE_GAIN = 16;

export const BOOST_MIN_EFFECT = 0.35;

export const BOOST_SLIP_EFFECT_FACTOR = 0.08;

export const BOOST_BATTERY_DRAIN = 0.4;

export const BOOST_OVERCAP_RATIO = 1.1;

// rate = BASE + speed × SPEED_FACTOR; em vz=30: ~0.95/tick > dreno boost (0.4/tick).
export const BRAKE_REGEN_BASE = 0.2;
export const BRAKE_REGEN_SPEED_FACTOR = 0.025;

export const CURVE_DRAG_FACTOR_X = 0.03;
export const CURVE_DRAG_FACTOR_Z = 0.017;

// =============================================================================
// TYRE / GRIP MODEL  (Pacejka "Magic Formula" — simplified)
// =============================================================================
// Centrifugal force in a corner:
//   F_centrifugal = vz² × κ × CENTRIFUGAL_SCALE_C
//
// CENTRIFUGAL_SCALE_C (0.003) is an empirical calibration constant. Real F1
// physics uses F = m × v²/r, but the track uses a unitless curvature κ instead
// of radius, so C maps the game-scale to a physically plausible force range.
//
// Tyre slip blend:
//   slipRatio    = |F_centrifugal| / maxGrip
//   slipBlend    = clamp((slipRatio − SLIP_BLEND_START) / SLIP_BLEND_RANGE, 0, 1)
//
// slipBlend ∈ [0, 1]: 0 = full grip;  1 = full kinetic slide.
// When slipBlend > 0, grip erodes and a residual outward force appears:
//   effectiveGrip    = maxGrip × (1 − slipBlend × SLIP_GRIP_EROSION)
//   slipOutwardForce = sign(F_c) × max(0, |F_c| − effectiveGrip)
//
// This models the Pacejka second-order drop-off: grip degrades progressively
// rather than cutting abruptly to zero, producing realistic oversteer onset.

export const CENTRIFUGAL_SCALE_C = 0.003;

export const CENTRIFUGAL_DIRECT_PUSH_X = 0.12;

export const MAX_GRIP_MODE_X = 4.0;
export const MAX_GRIP_MODE_Z = 5.0;

export const GRIP_MIN_FLOOR = 0.0001;

export const SLIP_BLEND_START = 0.82;

export const SLIP_BLEND_RANGE = 0.92;

export const SLIP_GRIP_EROSION = 0.28;

export const SLIP_FORCE_MODE_X = 1.2;
export const SLIP_FORCE_MODE_Z = 0.65;

export const SLIP_VZ_PENALTY = 0.12;

// "lateral cannon" fix: decaimento cinético em slip pleno — sem isso vx≈34 em modo X.
export const SLIP_LATERAL_KINETIC_DAMPING = 0.12;

export const SLIP_PENALTY_THRESHOLD = 0.15;

// Queda de ~12% de velocidade por segundo no slip máximo.
export const SLIP_SPEED_PENALTY_DRAG = 0.88;

// Regen passivo por desaceleração natural (troca de modo, slip, saída de curva).
export const PASSIVE_REGEN_FACTOR = 0.4;

// =============================================================================
// LATERAL DYNAMICS
// =============================================================================
// Lateral velocity (vx) is accumulated by centrifugal / slip forces and opposed
// by tyre friction (exponential damping each tick):
//
//   vx_new = (vx + Σforces × dt) × friction^dt
//
// The friction coefficient blends between lateralFriction (on-grip) and
// slipDamping (full slide) based on slipBlend.

export const LATERAL_FRICTION_GRIP_X = 0.93;
export const LATERAL_FRICTION_GRIP_Z = 0.8;

export const SLIP_DAMPING_MODE_X = 0.96;
export const SLIP_DAMPING_MODE_Z = 0.82;

export const COUNTERSTEER_DAMPING_BONUS = 0.82;

export const LATERAL_VX_DEAD_ZONE = 0.01;

export const MAX_LATERAL_VX = 34;

export const WALL_BOUNCE_DAMPING = 0.5;

// =============================================================================
// EDGE PRESSURE  (Kerb / Rumble Strip)
// =============================================================================
// Progressive extra vx damping that activates as the car approaches the track
// boundary, modelling increased resistance from kerbs or surface change.
//
//   edgeRatio    = |x| / trackHalf        (0 = centre,  1 = boundary)
//   edgePressure = clamp((edgeRatio − START) / RANGE, 0, 1)
//   friction    *= (1 − edgePressure × EDGE_VX_DAMPING_FACTOR)

export const EDGE_RATIO_CLAMP_MAX = 1.2;

export const EDGE_PRESSURE_RATIO_START = 0.82;

export const EDGE_PRESSURE_RATIO_RANGE = 0.18;

export const EDGE_VX_DAMPING_FACTOR = 0.18;

// =============================================================================
// TRACK LIMITS & OFF-TRACK PENALTIES
// =============================================================================
// Once |lateralOffset| > PHYSICS_TRACK_HALF the car is off-track.
// Two independent penalties apply each tick while off-track:
//
//   Longitudinal: vz *= OFF_TRACK_VZ_DRAG^dt,  vz capped at OFF_TRACK_MAX_SPEED
//   Lateral:      vx *= OFF_TRACK_VX_DRAG^dt   + centering spring force
//
// Centering spring (linear): F = −(BASE + overflow × PER_UNIT)
// where overflow = |x| − PHYSICS_TRACK_HALF  (deeper = stronger pull-back)

export const PHYSICS_TRACK_HALF = 100;

export const OFF_TRACK_VZ_DRAG = 0.55;

export const OFF_TRACK_VX_DRAG = 0.9;

export const OFF_TRACK_MAX_SPEED = 5.0;

export const OFF_TRACK_CENTERING_BONUS = 0.05;

export const OFF_TRACK_RECOVERY_PER_UNIT = 0.002;

export const OFF_TRACK_OUTWARD_VX_DAMP = 0.9;

export const OFF_TRACK_DUST_FRAMES = 20;

export const OFF_TRACK_MAX_OFFSET_MARGIN = 300;

// =============================================================================
// AUTOSTEER — PD CONTROLLER WITH FEEDFORWARD
// =============================================================================
// Control law: u = Kp·e(t) + Kd·ė(t) + K_ff·κ·v
//
//   e(t)  = targetX(lookahead) − lateralOffset    (position error)
//   ė(t)  ≈ −lateralVelocity                      (derivative via current vx)
//   K_ff  = AUTOSTEER_FEEDFORWARD_K × vz           (curve anticipation)
//
// Heading model (steering column inertia):
//   Instead of applying Kp·e directly, the controller builds a heading angle
//   (carHeadingDelta) that rate-limits toward targetHeading:
//     rawForce = carHeadingDelta × vz × effectiveKp
//   This makes the steering feel progressively heavier at high speed via:
//     speedFactor = 1 / (1 + vz² × AUTOSTEER_SPEED_SENSITIVITY)
//
// Kp modulation:
//   effectiveKp = KP × lerp(KP_FLOOR_RATIO, 1.0, curvatureScale) × speedFactor
//   Reduces corrections on straights to prevent micro-oscillation.
//
// Recovery authority:
//   When |offsetError| > RECOVERY_THRESHOLD, the heading cap expands toward
//   AUTOSTEER_MAX_HEADING regardless of curvature, ensuring the car can always
//   recover from an off-track excursion even on straight sections.

export const AUTOSTEER_KP = 0.05;

export const AUTOSTEER_KD = 0.5;

export const AUTOSTEER_HEADING_KH = 0.05;

export const AUTOSTEER_MAX_HEADING = 0.9;

export const AUTOSTEER_MIN_HEADING = 0.04;

export const AUTOSTEER_HEADING_RATE = 0.05;

export const AUTOSTEER_FEEDFORWARD_K = 0.003;

export const AUTOSTEER_LOOKAHEAD_N = 3;

export const AUTOSTEER_SLIP_SUPPRESS = 0.85;

export const AUTOSTEER_EDGE_GUARD_RATIO = 0.8;

export const AUTOSTEER_OFFSET_DEADZONE = 0.5;

export const AUTOSTEER_SPEED_SENSITIVITY = 0.004;

export const AUTOSTEER_CURVATURE_REF = 10.0;

export const AUTOSTEER_VISUAL_LERP_RATE = 0.15;

export const AUTOSTEER_KP_FLOOR_RATIO = 0.12;

export const AUTOSTEER_RECOVERY_THRESHOLD = 4.0;

export const CURVATURE_DEADZONE = 0.001;

export const CAR_HEADING_VISUAL_SCALE = 0.22;
