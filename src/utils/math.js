import {
  MS_PER_MINUTE,
  MS_PER_SECOND,
  TIME_MILLIS_PAD,
  TIME_MINUTES_PAD,
  TIME_SECONDS_PAD,
} from "../constants/index.js";

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(start, end, t) {
  return start + (end - start) * t;
}

export function getLapData(currentZ, lapLength) {
  let lapZ = lapLength > 0 ? currentZ % lapLength : 0;
  if (lapZ < 0) lapZ += lapLength;
  return { lapZ };
}

export function formatTime(ms) {
  const minutes = Math.floor(ms / MS_PER_MINUTE);
  const seconds = Math.floor((ms % MS_PER_MINUTE) / MS_PER_SECOND);
  const milliseconds = Math.floor(ms % MS_PER_SECOND);
  return `${minutes.toString().padStart(TIME_MINUTES_PAD, "0")}:${seconds.toString().padStart(TIME_SECONDS_PAD, "0")}.${milliseconds.toString().padStart(TIME_MILLIS_PAD, "0")}`;
}
