const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
const platform =
  typeof navigator !== "undefined" ? navigator.platform || "" : "";
export const isIOS =
  /iP(hone|od|ad)/.test(ua) ||
  (platform === "MacIntel" &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1);
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
export const browserSupportsDeviceMotion =
  typeof window !== "undefined" && "DeviceMotionEvent" in window;
export const requiresOrientationPermission =
  browserSupportsDeviceOrientation &&
  typeof DeviceOrientationEvent !== "undefined" &&
  typeof DeviceOrientationEvent.requestPermission === "function";
export const requiresMotionPermission =
  browserSupportsDeviceMotion &&
  typeof DeviceMotionEvent !== "undefined" &&
  typeof DeviceMotionEvent.requestPermission === "function";
export const isIOSWithoutPermission =
  isIOS &&
  browserSupportsDeviceOrientation &&
  typeof DeviceOrientationEvent !== "undefined" &&
  typeof DeviceOrientationEvent.requestPermission !== "function";

export function isDevMode() {
  try {
    if (typeof window === 'undefined') return false;
    const host = window.location && window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (window.__AEROCAR_DEV__ === true) return true;
    if (typeof URLSearchParams !== 'undefined') {
      const p = new URLSearchParams(window.location.search || '');
      const v = p.get('dev');
      if (v === '1' || v === 'true') return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}
