const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
const platform =
  typeof navigator !== "undefined" ? navigator.platform || "" : "";

export const isIOS =
  /iP(hone|od|ad)/.test(ua) ||
  (platform === "MacIntel" && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1);

export const isAndroid = /Android/.test(ua);

export const isMobile = isIOS || isAndroid || /Mobi|Tablet/.test(ua);

export const isSafari =
  /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);

export const isStandalone =
  (typeof window !== "undefined" &&
    window.matchMedia("(display-mode: standalone)").matches) ||
  (typeof navigator !== "undefined" && !!navigator.standalone);

export const browserSupportsDeviceOrientation =
  typeof window !== "undefined" && "DeviceOrientationEvent" in window;

export const requiresOrientationPermission =
  browserSupportsDeviceOrientation &&
  typeof DeviceOrientationEvent !== "undefined" &&
  typeof DeviceOrientationEvent.requestPermission === "function";

// iOS device where DeviceOrientationEvent exists but requestPermission is NOT
// available. This happens on Chrome (and other non-Safari browsers) on iOS:
// the browser exposes the API but iOS itself blocks sensor data, so events
// never fire. Distinguishing this case lets us show a "use Safari" message
// instead of silently ignoring the missing gyroscope.
export const isIOSWithoutPermission =
  isIOS &&
  browserSupportsDeviceOrientation &&
  typeof DeviceOrientationEvent !== "undefined" &&
  typeof DeviceOrientationEvent.requestPermission !== "function";
