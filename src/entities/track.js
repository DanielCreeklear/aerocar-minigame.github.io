import {
  CHICANE_CHANCE,
  CHICANE_ENTRY_EXIT_PORTION,
  CHICANE_LENGTH,
  CHICANE_MIN_STRENGTH,
  CHICANE_STRENGTH_VARIATION,
  CURVE_ENTRY_EXIT_PORTION,
  CURVE_PHASE,
  CURVE_LENGTH_VARIATION,
  CURVE_MIN_LENGTH,
  CURVE_MIN_STRENGTH,
  CURVE_STRENGTH_VARIATION,
  DIRECTION_FLIP_CHANCE,
  HAIRPIN_CHANCE,
  HAIRPIN_MIN_LENGTH,
  HAIRPIN_LENGTH_VARIATION,
  HAIRPIN_MIN_STRENGTH,
  HAIRPIN_STRENGTH_VARIATION,
  PHYSICS_TRACK_HALF,
  RACING_LINE_OFFSET_FACTOR,
  RNG_DIVISOR,
  RNG_INCREMENT,
  RNG_MULTIPLIER,
  STRAIGHT_LENGTH_VARIATION,
  STRAIGHT_MIN_LENGTH,
  TIGHT_CURVE_THRESHOLD,
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
    this.racingLine = [];
    this.racingLineData = null;
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

      const isHairpin =
        !isChicane &&
        type === TRACK_TYPES.CURVE &&
        Math.abs(curveStrength) >= HAIRPIN_MIN_STRENGTH;
      const finalLength = isHairpin
        ? HAIRPIN_MIN_LENGTH + this.random() * HAIRPIN_LENGTH_VARIATION
        : length;

      const startZ = zOffset;
      const endZ = startZ + finalLength;
      const entryPortion = isChicane
        ? CHICANE_ENTRY_EXIT_PORTION
        : CURVE_ENTRY_EXIT_PORTION;
      const isCurve = type === TRACK_TYPES.CURVE;
      const entryBoundary = isCurve
        ? startZ + finalLength * entryPortion
        : startZ;
      const exitBoundary = isCurve ? endZ - finalLength * entryPortion : endZ;
      const apexZ = (entryBoundary + exitBoundary) / 2;
      const direction =
        curveStrength > 0 ? "right" : curveStrength < 0 ? "left" : "none";
      let classification;
      if (!isCurve) {
        classification = "straight";
      } else if (isHairpin) {
        classification = "hairpin";
      } else if (isChicane) {
        classification = "chicane";
      } else if (Math.abs(curveStrength) >= TIGHT_CURVE_THRESHOLD) {
        classification = "tight-curve";
      } else {
        classification = "fast-curve";
      }

      this.segments.push({
        index: i,
        type,
        length: finalLength,
        startZ,
        endZ,
        curveStrength,
        isChicane,
        isHairpin,
        direction,
        classification,
        entryBoundary,
        exitBoundary,
        apexZ,
      });
      zOffset = endZ;
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
    this._markModeXZones();
    this._buildRacingLine();
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

  _binarySearchSegment(lapZ) {
    const segs = this.segments;
    let lo = 0;
    let hi = segs.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const seg = segs[mid];
      if (lapZ < seg.startZ) {
        hi = mid - 1;
      } else if (lapZ >= seg.endZ) {
        lo = mid + 1;
      } else {
        return seg;
      }
    }
    return segs[segs.length - 1];
  }

  findSegmentForZ(z) {
    return this._binarySearchSegment(z);
  }

  getSegmentProgress(seg, z) {
    if (seg.length <= 0) return 0;
    let t = (z - seg.startZ) / seg.length;
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    return t;
  }

  /**
   * Returns a rich description of the car's position on the track.
   * @param {number} z  - any z value (auto-wrapped to lap)
   * @returns {{ lapProgress, segment, segmentProgress, phase, distanceToSegmentEnd, classification, direction }}
   */
  getTrackPosition(z) {
    const lap = this.lapLength || this.totalDistance;
    if (!lap || this.segments.length === 0) return null;

    let wrappedZ = z % lap;
    if (wrappedZ < 0) wrappedZ += lap;

    const seg = this._binarySearchSegment(wrappedZ);
    const segmentProgress = this.getSegmentProgress(seg, wrappedZ);

    let phase;
    if (seg.type === TRACK_TYPES.STRAIGHT) {
      phase = CURVE_PHASE.STRAIGHT;
    } else if (wrappedZ < seg.entryBoundary) {
      phase = CURVE_PHASE.ENTRY;
    } else if (wrappedZ > seg.exitBoundary) {
      phase = CURVE_PHASE.EXIT;
    } else {
      phase = CURVE_PHASE.APEX;
    }

    return {
      lapProgress: wrappedZ / lap,
      segment: seg,
      segmentProgress,
      phase,
      distanceToSegmentEnd: seg.endZ - wrappedZ,
      classification: seg.classification,
      direction: seg.direction,
    };
  }

  /**
   * Returns all track segments that start within `lookAheadDistance` of z,
   * sorted by distance ahead. Handles lap wrap-around.
   * @param {number} z
   * @param {number} lookAheadDistance
   * @returns {Array<{ segment, distanceAhead, classification, direction, intensity, apexDistanceAhead }>}
   */
  getUpcomingFeatures(z, lookAheadDistance) {
    const lap = this.lapLength || this.totalDistance;
    if (!lap || this.segments.length === 0) return [];

    let wrappedZ = z % lap;
    if (wrappedZ < 0) wrappedZ += lap;

    const results = [];
    for (const seg of this.segments) {
      const isInside = wrappedZ >= seg.startZ && wrappedZ < seg.endZ;

      let distanceAhead;
      if (isInside) {
        distanceAhead = 0;
      } else {
        let startDist = seg.startZ - wrappedZ;
        if (startDist < 0) startDist += lap;
        distanceAhead = startDist;
      }

      if (distanceAhead > lookAheadDistance) continue;

      let apexDistanceAhead;
      if (isInside) {
        apexDistanceAhead = Math.max(0, seg.apexZ - wrappedZ);
      } else {
        let d = seg.apexZ - wrappedZ;
        if (d < 0) d += lap;
        apexDistanceAhead = d;
      }

      results.push({
        segment: seg,
        distanceAhead,
        classification: seg.classification,
        direction: seg.direction,
        intensity: Math.abs(seg.curveStrength),
        apexDistanceAhead,
      });
    }

    results.sort((a, b) => a.distanceAhead - b.distanceAhead);
    return results;
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
        rawCurve: point.curve,
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
        rawCurve: point.curve,
        curve: point.curve + deltaCurve,
      });
    }
  }

  markStartFinish() {
    if (this.trackData.length === 0) return;

    const FINISH_LINE_LENGTH = 80;
    const GRID_SPACING = 300;
    const GRID_BOX_LENGTH = 50;
    const NUM_GRID_ROWS = 6;

    for (const pt of this.trackData) {
      if (pt.z < FINISH_LINE_LENGTH) {
        pt.marker = "start-finish";
      }
    }

    for (let i = 0; i < NUM_GRID_ROWS; i++) {
      const gridZ = this.lapLength - (i + 1) * GRID_SPACING;
      if (gridZ < FINISH_LINE_LENGTH) continue;
      for (const pt of this.trackData) {
        if (pt.z >= gridZ && pt.z < gridZ + GRID_BOX_LENGTH) {
          pt.marker = `grid-${i + 1}`;
        }
      }
    }
  }

  _markModeXZones() {
    const MIN_STRAIGHT_LENGTH = 400;
    for (const seg of this.segments) {
      if (
        seg.type === TRACK_TYPES.STRAIGHT &&
        seg.length >= MIN_STRAIGHT_LENGTH
      ) {
        const zoneStart = seg.startZ + seg.length * 0.2;
        const zoneEnd = seg.endZ - seg.length * 0.2;
        for (const pt of this.trackData) {
          if (pt.z >= zoneStart && pt.z < zoneEnd) {
            pt.isModeXZone = true;
          }
        }
      }
    }
  }

  _buildRacingLine() {
    this.racingLine = []; // kept for backward compat; no longer populated
    const count = this.trackData.length;
    this.racingLineData = new Float32Array(count);

    const offset = RACING_LINE_OFFSET_FACTOR * PHYSICS_TRACK_HALF;

    for (let i = 0; i < count; i++) {
      const z = i * Z_RESOLUTION;
      const seg = this._binarySearchSegment(z);

      if (seg.type === TRACK_TYPES.STRAIGHT || seg.isChicane) {
        this.racingLineData[i] = 0;
        continue;
      }

      const t = this.getSegmentProgress(seg, z);
      const sign = seg.curveStrength > 0 ? 1 : -1;
      const edgePortion = CURVE_ENTRY_EXIT_PORTION;
      this.racingLineData[i] = this._racingLineCurveProfile(
        t,
        sign,
        offset,
        edgePortion,
      );
    }
  }

  /**
   * Computes the ideal lateral offset for a given progress t ∈ [0,1] through
   * a curve segment, following a wide-entry → apex-cut → wide-exit profile.
   * @param {number} t          - normalised segment progress [0,1]
   * @param {number} sign       - +1 = right-hander, -1 = left-hander
   * @param {number} offset     - maximum lateral offset magnitude
   * @param {number} edgePortion - fraction of segment used for entry/exit ramps
   */
  _racingLineCurveProfile(t, sign, offset, edgePortion) {
    const te = edgePortion; // end of entry ramp
    const tx = 1 - edgePortion; // start of exit ramp
    const ta = 0.5; // apex at midpoint

    if (t <= te) {
      // Ramp from centre toward outside (wide entry approach)
      const tn = te > 0 ? t / te : 1;
      return -sign * offset * smoothstep01(tn);
    } else if (t <= ta) {
      // Sweep from outside to inside (cut apex)
      const tn = ta - te > 0 ? (t - te) / (ta - te) : 1;
      return -sign * offset + 2 * sign * offset * smoothstep01(tn);
    } else if (t <= tx) {
      // Sweep from inside back to outside (exit wide)
      const tn = tx - ta > 0 ? (t - ta) / (tx - ta) : 1;
      return sign * offset - 2 * sign * offset * smoothstep01(tn);
    } else {
      // Ramp from outside back to centre (ready for next straight)
      const tn = 1 - tx > 0 ? (t - tx) / (1 - tx) : 1;
      return -sign * offset * (1 - smoothstep01(tn));
    }
  }

  /**
   * Returns the ideal lateral offset (racing line targetX) at position z.
   * Positive = right of centre, negative = left.
   * @param {number} z
   * @returns {number}
   */
  getRacingLineTarget(z) {
    if (!this.racingLineData || this.racingLineData.length === 0) return 0;
    const lap = this.lapLength || this.totalDistance;
    if (!lap) return 0;

    let wrappedZ = z % lap;
    if (wrappedZ < 0) wrappedZ += lap;

    const baseIndex = Math.floor(wrappedZ / Z_RESOLUTION);
    const currentIndex = Math.min(baseIndex, this.racingLineData.length - 1);
    const nextIndex = (currentIndex + 1) % this.racingLineData.length;
    const t = (wrappedZ - currentIndex * Z_RESOLUTION) / Z_RESOLUTION;

    const a = this.racingLineData[currentIndex];
    const b = this.racingLineData[nextIndex];
    return a + (b - a) * t;
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
      rawCurve:
        (currentPoint.rawCurve ?? currentPoint.curve) +
        ((nextPoint.rawCurve ?? nextPoint.curve) -
          (currentPoint.rawCurve ?? currentPoint.curve)) *
          t,
      type: currentPoint.type,
      marker: currentPoint.marker,
      isModeXZone: currentPoint.isModeXZone || false,
    };
  }
}

export { Track };
