import {
  MS_PER_MINUTE,
  MS_PER_SECOND,
  TIME_MILLIS_PAD,
  TIME_MINUTES_PAD,
  TIME_SECONDS_PAD,
} from "./constants/index.js";

export function resizeCanvas(canvas) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

export function formatTime(ms) {
  let minutes = Math.floor(ms / MS_PER_MINUTE);
  let seconds = Math.floor((ms % MS_PER_MINUTE) / MS_PER_SECOND);
  let milliseconds = Math.floor(ms % MS_PER_SECOND);
  return `${minutes.toString().padStart(TIME_MINUTES_PAD, "0")}:${seconds.toString().padStart(TIME_SECONDS_PAD, "0")}.${milliseconds.toString().padStart(TIME_MILLIS_PAD, "0")}`;
}
