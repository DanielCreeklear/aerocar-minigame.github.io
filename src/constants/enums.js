export const SCREENS = {
  PREVIEW: "preview",
  START: "start",
  RACE: "race",
  GAME_OVER: "gameover",
};

export const TRACK_TYPES = {
  STRAIGHT: "RETA",
  CURVE: "CURVA",
};

export const AERO_MODES = {
  X: "X",
  Z: "Z",
};

export const CURVE_PHASE = {
  STRAIGHT: "straight",
  ENTRY: "entry",
  APEX: "apex",
  EXIT: "exit",
};

// Surface type values stored in the track grid (Uint8Array).
// GRASS is 0 so a freshly allocated Uint8Array is entirely grass by default.
export const SURFACE_TYPES = {
  GRASS: 0,
  CURB: 1,
  TRACK: 2,
};
