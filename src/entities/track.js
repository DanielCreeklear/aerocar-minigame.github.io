import {
  CHICANE_CHANCE,
  CHICANE_ENTRY_EXIT_PORTION,
  CHICANE_LENGTH,
  CHICANE_MIN_STRENGTH,
  CHICANE_STRENGTH_VARIATION,
  CURVE_ENTRY_EXIT_PORTION,
  CURVE_LENGTH_VARIATION,
  CURVE_MIN_LENGTH,
  CURVE_MIN_STRENGTH,
  CURVE_STRENGTH_VARIATION,
  DIRECTION_FLIP_CHANCE,
  HAIRPIN_CHANCE,
  HAIRPIN_MIN_STRENGTH,
  HAIRPIN_STRENGTH_VARIATION,
  RNG_DIVISOR,
  RNG_INCREMENT,
  RNG_MULTIPLIER,
  STRAIGHT_LENGTH_VARIATION,
  STRAIGHT_MIN_LENGTH,
  TRACK_SEED,
  TRACK_TYPES,
  YAW_FACTOR,
  Z_RESOLUTION,
} from "../constants/index.js";

function clamp01(value) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function smoothstep01(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function smoothWindow(t, edgeSize) {
  const edge = clamp01(edgeSize);
  if (edge <= 0) return 1;
  const inRamp = smoothstep01(t / edge);
  const outRamp = smoothstep01((1 - t) / edge);
  return Math.min(inRamp, outRamp);
}

class Track {
  constructor() {
    this.segments = [];
    this.trackData = [];
    this.totalDistance = 0;
    this.lapLength = 0;
    this.seed = TRACK_SEED;
    this.randomState = TRACK_SEED;
  }

  setSeed(seed) {
    if (typeof seed === "number" && Number.isFinite(seed)) {
      this.seed = seed >>> 0;
      return;
    }

    if (typeof seed === "string") {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
      }
      this.seed = hash || TRACK_SEED;
      return;
    }

    this.seed = TRACK_SEED;
  }

  random() {
    this.randomState =
      (RNG_MULTIPLIER * this.randomState + RNG_INCREMENT) >>> 0;
    return this.randomState / RNG_DIVISOR;
  }

  init(totalSegments, seed = this.seed) {
    this.segments.length = 0;
    this.trackData.length = 0;
    this.setSeed(seed);
    this.randomState = this.seed;

    let zOffset = 0;
    let turnBalance = 0;
    for (let i = 1; i <= totalSegments; i++) {
      const type = this.getSegmentType(i);
      const isChicane = this.isChicaneSegment();
      const length = this.getSegmentLength(type, isChicane);
      const curveStrength = this.getCurveStrength(type, isChicane, turnBalance);
      if (type === TRACK_TYPES.CURVE) turnBalance += curveStrength;

      this.segments.push({
        index: i,
        type,
        length,
        startZ: zOffset,
        endZ: zOffset + length,
        curveStrength,
        isChicane,
      });
      zOffset += length;
    }
    this.totalDistance = zOffset;
    this.lapLength = zOffset;

    const pointCount = this.getPointCount();
    let currentX = 0;
    let currentYaw = 0;
    const rawData = [];

    for (let i = 0; i < pointCount; i++) {
      const z = i * Z_RESOLUTION;
      const seg = this.findSegmentForZ(z);
      const t = this.getSegmentProgress(seg, z);
      const targetCurve = this.getTargetCurve(seg, t);

      currentYaw += targetCurve * YAW_FACTOR;
      currentX += currentYaw;

      rawData.push({
        z,
        x: currentX,
        yaw: currentYaw,
        type: seg.type,
        curve: targetCurve,
      });
    }

    this.normalizeTrackData(rawData);
    this.markStartFinish();
  }

  getSegmentType(index) {
    return index % 2 !== 0 ? TRACK_TYPES.STRAIGHT : TRACK_TYPES.CURVE;
  }

  isChicaneSegment() {
    return this.random() < CHICANE_CHANCE;
  }

  getSegmentLength(type, isChicane) {
    if (isChicane) return CHICANE_LENGTH;
    if (type === TRACK_TYPES.STRAIGHT) {
      return STRAIGHT_MIN_LENGTH + this.random() * STRAIGHT_LENGTH_VARIATION;
    }
    return CURVE_MIN_LENGTH + this.random() * CURVE_LENGTH_VARIATION;
  }

  getCurveStrength(type, isChicane, turnBalance) {
    if (type !== TRACK_TYPES.CURVE) return 0;

    let dir = turnBalance > 0 ? -1 : 1;
    if (this.random() < DIRECTION_FLIP_CHANCE) dir *= -1;

    const isHairpin = !isChicane && this.random() < HAIRPIN_CHANCE;
    if (isHairpin) {
      return (
        (HAIRPIN_MIN_STRENGTH + this.random() * HAIRPIN_STRENGTH_VARIATION) *
        dir
      );
    }
    if (isChicane) {
      return (
        (CHICANE_MIN_STRENGTH + this.random() * CHICANE_STRENGTH_VARIATION) *
        dir
      );
    }
    return (
      (CURVE_MIN_STRENGTH + this.random() * CURVE_STRENGTH_VARIATION) * dir
    );
  }

  getPointCount() {
    return Math.max(2, Math.floor(this.lapLength / Z_RESOLUTION));
  }

  findSegmentForZ(z) {
    return (
      this.segments.find((s) => z >= s.startZ && z < s.endZ) ||
      this.segments[this.segments.length - 1]
    );
  }

  getSegmentProgress(seg, z) {
    if (seg.length <= 0) return 0;
    let t = (z - seg.startZ) / seg.length;
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    return t;
  }

  getTargetCurve(seg, t) {
    if (seg.isChicane) return this.getChicaneCurve(seg, t);
    const envelope = smoothWindow(t, CURVE_ENTRY_EXIT_PORTION);
    return seg.curveStrength * envelope;
  }

  getChicaneCurve(seg, t) {
    const phaseT = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    const phaseSign = t < 0.5 ? 1 : -1;
    const phaseEnvelope = smoothWindow(phaseT, CHICANE_ENTRY_EXIT_PORTION);
    return seg.curveStrength * phaseSign * phaseEnvelope;
  }

  normalizeTrackData(rawData) {
    if (rawData.length === 0) return;

    const endPoint = rawData[rawData.length - 1];
    const endX = endPoint.x;
    const endYaw = endPoint.yaw || 0;
    const N = rawData.length - 1;

    if (N <= 0) {
      const point = rawData[0];
      this.trackData.push({
        z: point.z,
        x: point.x,
        yaw: point.yaw || 0,
        type: point.type,
        curve: point.curve,
      });
      return;
    }

    const n2 = N * N;
    const n3 = n2 * N;
    const A = (-3 * endX) / n2 + endYaw / N;
    const B = (2 * endX) / n3 - endYaw / n2;

    for (let i = 0; i < rawData.length; i++) {
      const point = rawData[i];
      const z = point.z;
      const i2 = i * i;
      const i3 = i2 * i;

      const deltaX = A * i2 + B * i3;
      const deltaYaw = 2 * A * i + 3 * B * i2;
      const deltaCurve = (2 * A + 6 * B * i) / YAW_FACTOR;

      this.trackData.push({
        z,
        x: point.x + deltaX,
        yaw: (point.yaw || 0) + deltaYaw,
        type: point.type,
        curve: point.curve + deltaCurve,
      });
    }
  }

  markStartFinish() {
    if (this.trackData.length > 0) {
      this.trackData[0].marker = "start-finish";
    }
  }

  getTrackPoint(z) {
    const lap = this.lapLength || this.totalDistance;
    if (!lap || this.trackData.length === 0) {
      return { z: 0, x: 0, yaw: 0, type: TRACK_TYPES.STRAIGHT, curve: 0 };
    }

    let wrappedZ = z % lap;
    if (wrappedZ < 0) wrappedZ += lap;

    const baseIndex = Math.floor(wrappedZ / Z_RESOLUTION);
    const currentIndex = Math.min(baseIndex, this.trackData.length - 1);
    const nextIndex = (currentIndex + 1) % this.trackData.length;

    const currentPoint = this.trackData[currentIndex];
    const nextPoint = this.trackData[nextIndex];
    const t = (wrappedZ - currentIndex * Z_RESOLUTION) / Z_RESOLUTION;

    return {
      z: wrappedZ,
      x: currentPoint.x + (nextPoint.x - currentPoint.x) * t,
      yaw: currentPoint.yaw + (nextPoint.yaw - currentPoint.yaw) * t,
      curve: currentPoint.curve + (nextPoint.curve - currentPoint.curve) * t,
      type: currentPoint.type,
      marker: currentPoint.marker,
    };
  }
}

export { Track };
