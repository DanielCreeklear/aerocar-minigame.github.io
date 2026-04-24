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
  CURB_HALF,
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
  SURFACE_TYPES,
  TIGHT_CURVE_THRESHOLD,
  TRACK_GRID_CELL_SIZE,
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
    this.gridData = null; 
    this.gridCols = 0;
    this.gridRows = 0;
    this.gridMinX = 0;
    
    this._upcomingPool = [];
    this._upcomingResults = [];
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
    this._buildGrid();
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
  getUpcomingFeatures(z, lookAheadDistance) {
    const lap = this.lapLength || this.totalDistance;
    if (!lap || this.segments.length === 0) return [];
    let wrappedZ = z % lap;
    if (wrappedZ < 0) wrappedZ += lap;
    const results = this._upcomingResults;
    results.length = 0;
    const pool = this._upcomingPool;
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
      let obj = pool[results.length];
      if (!obj) {
        obj = {
          segment: null,
          distanceAhead: 0,
          classification: "",
          direction: "",
          intensity: 0,
          apexDistanceAhead: 0,
        };
        pool.push(obj);
      }
      obj.segment = seg;
      obj.distanceAhead = distanceAhead;
      obj.classification = seg.classification;
      obj.direction = seg.direction;
      obj.intensity = Math.abs(seg.curveStrength);
      obj.apexDistanceAhead = apexDistanceAhead;
      results.push(obj);
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
    const len = this.trackData.length;
    for (const seg of this.segments) {
      if (
        seg.type === TRACK_TYPES.STRAIGHT &&
        seg.length >= MIN_STRAIGHT_LENGTH
      ) {
        const zoneStart = seg.startZ + seg.length * 0.2;
        const zoneEnd = seg.endZ - seg.length * 0.2;
        const startIdx = Math.ceil(zoneStart / Z_RESOLUTION);
        const endIdx = Math.min(Math.floor(zoneEnd / Z_RESOLUTION), len - 1);
        for (let i = startIdx; i <= endIdx; i++) {
          this.trackData[i].isModeXZone = true;
        }
      }
    }
  }
  _buildGrid() {
    const pts = this.trackData;
    if (pts.length === 0) return;
    const cs = TRACK_GRID_CELL_SIZE;
    const margin = CURB_HALF + cs; 
    let minX = Infinity;
    let maxX = -Infinity;
    for (const pt of pts) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
    }
    this.gridMinX = minX - margin;
    const gridMaxX = maxX + margin;
    this.gridCols = Math.ceil((gridMaxX - this.gridMinX) / cs) + 1;
    this.gridRows = Math.ceil(this.lapLength / cs) + 1;
    this.gridData = new Uint8Array(this.gridRows * this.gridCols); 
    const cols = this.gridCols;
    const gMinX = this.gridMinX;
    for (const pt of pts) {
      const row = Math.floor(pt.z / cs);
      if (row >= this.gridRows) continue;
      const curbColL = Math.max(0, Math.floor((pt.x - CURB_HALF - gMinX) / cs));
      const curbColR = Math.min(
        cols - 1,
        Math.ceil((pt.x + CURB_HALF - gMinX) / cs),
      );
      for (let c = curbColL; c <= curbColR; c++) {
        const idx = row * cols + c;
        if (this.gridData[idx] === SURFACE_TYPES.GRASS) {
          this.gridData[idx] = SURFACE_TYPES.CURB;
        }
      }
      const trackColL = Math.max(
        0,
        Math.floor((pt.x - PHYSICS_TRACK_HALF - gMinX) / cs),
      );
      const trackColR = Math.min(
        cols - 1,
        Math.ceil((pt.x + PHYSICS_TRACK_HALF - gMinX) / cs),
      );
      for (let c = trackColL; c <= trackColR; c++) {
        this.gridData[row * cols + c] = SURFACE_TYPES.TRACK;
      }
    }
  }
  getSurfaceType(worldX, lapZ) {
    if (!this.gridData) return SURFACE_TYPES.GRASS;
    const cs = TRACK_GRID_CELL_SIZE;
    const row = Math.floor(lapZ / cs);
    const col = Math.floor((worldX - this.gridMinX) / cs);
    if (row < 0 || row >= this.gridRows || col < 0 || col >= this.gridCols) {
      return SURFACE_TYPES.GRASS;
    }
    return this.gridData[row * this.gridCols + col];
  }
  _buildRacingLine() {
    this.racingLine = []; 
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
  _racingLineCurveProfile(t, sign, offset, edgePortion) {
    const te = edgePortion; 
    const tx = 1 - edgePortion; 
    const ta = 0.5; 
    if (t <= te) {
      const tn = te > 0 ? t / te : 1;
      return -sign * offset * smoothstep01(tn);
    } else if (t <= ta) {
      const tn = ta - te > 0 ? (t - te) / (ta - te) : 1;
      return -sign * offset + 2 * sign * offset * smoothstep01(tn);
    } else if (t <= tx) {
      const tn = tx - ta > 0 ? (t - ta) / (tx - ta) : 1;
      return sign * offset - 2 * sign * offset * smoothstep01(tn);
    } else {
      const tn = 1 - tx > 0 ? (t - tx) / (1 - tx) : 1;
      return -sign * offset * (1 - smoothstep01(tn));
    }
  }
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
  // Optional `out` parameter can be passed to avoid allocations: getTrackPoint(z, out)
  getTrackPoint(z, out) {
    const lap = this.lapLength || this.totalDistance;
    if (!lap || this.trackData.length === 0) {
      if (out && typeof out === 'object') {
        out.z = 0;
        out.x = 0;
        out.yaw = 0;
        out.type = TRACK_TYPES.STRAIGHT;
        out.curve = 0;
        out.rawCurve = 0;
        out.marker = undefined;
        out.isModeXZone = false;
        return out;
      }
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
    if (out && typeof out === 'object') {
      out.z = wrappedZ;
      out.x = currentPoint.x + (nextPoint.x - currentPoint.x) * t;
      out.yaw = currentPoint.yaw + (nextPoint.yaw - currentPoint.yaw) * t;
      out.curve = currentPoint.curve + (nextPoint.curve - currentPoint.curve) * t;
      out.rawCurve =
        (currentPoint.rawCurve ?? currentPoint.curve) +
        ((nextPoint.rawCurve ?? nextPoint.curve) -
          (currentPoint.rawCurve ?? currentPoint.curve)) *
          t;
      out.type = currentPoint.type;
      out.marker = currentPoint.marker;
      out.isModeXZone = currentPoint.isModeXZone || false;
      return out;
    }
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
