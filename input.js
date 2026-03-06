export const SCREEN_HALF_RATIO = 0.5;
export const LEFT_INPUT_RATIO = 0.25;
export const RIGHT_INPUT_RATIO = 0.75;

export const MODE_CORNER_X_RATIO = 0.72;
export const MODE_CORNER_Y_MIN_RATIO = 0.38;
export const MODE_CORNER_Y_MAX_RATIO = 0.62;

export function getInputRatios(width, height) {
  if (height <= width) {
    return {
      screenHalf: SCREEN_HALF_RATIO,
      left: LEFT_INPUT_RATIO,
      right: RIGHT_INPUT_RATIO,
    };
  }

  return {
    screenHalf: SCREEN_HALF_RATIO,
    left: 0.35,
    right: 0.65,
  };
}

export const ACTION_KEYS = {
  SPACE: "Space",
  ENTER: "Enter",
  ARROW_UP: "ArrowUp",
  ARROW_DOWN: "ArrowDown",
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",
  KEY_A: "KeyA",
  KEY_D: "KeyD",
  KEY_S: "KeyS",
  KEY_Z: "KeyZ",
  KEY_X: "KeyX",
};

export const PREVENT_DEFAULT_KEYS = [
  ACTION_KEYS.SPACE,
  ACTION_KEYS.ARROW_UP,
  ACTION_KEYS.ARROW_DOWN,
  ACTION_KEYS.ARROW_LEFT,
  ACTION_KEYS.ARROW_RIGHT,
];

export const STEER_DEADZONE_DEG = 3;
export const STEER_MAX_TILT_DEG = 35;
export const STEER_RATE = 0.30;
