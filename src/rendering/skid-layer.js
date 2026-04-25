import { HALF_RATIO, LATERAL_RENDER_SCALE } from "../constants/index.js";

// Maximum number of segments kept in the ring buffer.
// At 60fps with continuous skidding this covers ~10 seconds.
const MAX_SEGMENTS = 600;

// How many world-Z units behind the car we keep (roughly 1.5 lap-lengths worth
// of visible history). Segments older than this are evicted on insert.
const MAX_Z_AGE = 8000;

/**
 * World-space skid mark layer.
 *
 * Instead of drawing to a fixed-pixel offscreen canvas, we store each skid
 * segment as a pair of world-space points {z, lateralOffset}. Every frame we
 * re-project only the visible segments onto the main canvas using the same
 * pseudo-3D formula used by the track renderer:
 *
 *   screenY = carY - (worldZ - currentZ)
 *   screenX = width*0.5 + (track.getTrackPoint(worldZ).x - cameraX)
 *             + lateralOffset * LATERAL_RENDER_SCALE
 *
 * This makes the marks "scroll" correctly with the road surface.
 */
function createSkidLayer() {
  // Ring buffer of segments
  const _segs = new Array(MAX_SEGMENTS);
  let _head = 0; // next write index
  let _count = 0;

  /**
   * Record a new skid segment between two world-space positions.
   *
   * @param {number} z1        - world Z of previous car position
   * @param {number} lat1      - lateralOffset of previous car position
   * @param {number} z2        - world Z of current car position
   * @param {number} lat2      - lateralOffset of current car position
   * @param {number} intensity - 0..1
   * @param {string} color     - CSS color string
   */
  function addSkid(z1, lat1, z2, lat2, intensity = 1, color = 'rgba(20,20,20,0.9)') {
    _segs[_head] = { z1, lat1, z2, lat2, intensity, color };
    _head = (_head + 1) % MAX_SEGMENTS;
    if (_count < MAX_SEGMENTS) _count++;
  }

  /**
   * Draw all visible segments onto the target canvas context.
   * Must be called inside the same transform context as drawTrack.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} gameState  - needs currentZ, lateralOffset
   * @param {object} track      - needs getTrackPoint(z)
   * @param {object} metrics    - needs width, height, carY
   * @param {number} cameraX    - rounded camera X (same value passed to drawTrack)
   */
  function drawTo(ctx, gameState, track, metrics, cameraX) {
    if (_count === 0) return;

    const { width, carY } = metrics;
    const currentZ = gameState.currentZ || 0;
    const halfW = width * HALF_RATIO;

    // Visible Z range: from just behind the car to the horizon line
    const zMin = currentZ - carY; // anything behind carY rows is off-screen
    const zMax = currentZ + carY; // horizon is carY pixels above the car row

    ctx.save();
    ctx.lineCap = 'round';

    for (let i = 0; i < _count; i++) {
      const idx = (_head - 1 - i + MAX_SEGMENTS) % MAX_SEGMENTS;
      const s = _segs[idx];
      if (!s) continue;

      // Quick age eviction — skip very old segments
      if (s.z2 < currentZ - MAX_Z_AGE) continue;

      // Both endpoints must be at least partially in the visible Z band
      const inView1 = s.z1 >= zMin && s.z1 <= zMax;
      const inView2 = s.z2 >= zMin && s.z2 <= zMax;
      if (!inView1 && !inView2) continue;

      // Project endpoint 1
      const tp1 = track.getTrackPoint(s.z1);
      const sx1 = halfW + (tp1.x - cameraX) + s.lat1 * LATERAL_RENDER_SCALE;
      const sy1 = carY - (s.z1 - currentZ);

      // Project endpoint 2
      const tp2 = track.getTrackPoint(s.z2);
      const sx2 = halfW + (tp2.x - cameraX) + s.lat2 * LATERAL_RENDER_SCALE;
      const sy2 = carY - (s.z2 - currentZ);

      // Increase the minimum alpha so skid marks remain visible in gentle
      // slides. Also allow slightly thicker marks for higher intensity.
      ctx.globalAlpha = Math.max(0.30, Math.min(1, s.intensity * 1.0));
      ctx.lineWidth = Math.max(1, Math.min(8, 2 + s.intensity * 5));
      ctx.strokeStyle = s.color;
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function clear() {
    _head = 0;
    _count = 0;
  }

  // resize is a no-op — world-space layer has no canvas to resize
  function resize() {}

  return {
    resize,
    addSkid,
    drawTo,
    clear,
  };
}

export { createSkidLayer };
