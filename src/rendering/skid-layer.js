import { HALF_RATIO, LATERAL_RENDER_SCALE } from "../constants/index.js";



const MAX_SEGMENTS = 600;



const MAX_Z_AGE = 8000;


function createSkidLayer() {
  
  const _segs = new Array(MAX_SEGMENTS);
  let _head = 0; 
  let _count = 0;

  
  function addSkid(z1, lat1, z2, lat2, intensity = 1, color = 'rgba(20,20,20,0.9)') {
    _segs[_head] = { z1, lat1, z2, lat2, intensity, color };
    _head = (_head + 1) % MAX_SEGMENTS;
    if (_count < MAX_SEGMENTS) _count++;
  }

  
  function drawTo(ctx, gameState, track, metrics, cameraX) {
    if (_count === 0) return;

    const { width, carY } = metrics;
    const currentZ = gameState.currentZ || 0;
    const halfW = width * HALF_RATIO;

    
    const zMin = currentZ - carY; 
    const zMax = currentZ + carY; 

    ctx.save();
    ctx.lineCap = 'round';

    for (let i = 0; i < _count; i++) {
      const idx = (_head - 1 - i + MAX_SEGMENTS) % MAX_SEGMENTS;
      const s = _segs[idx];
      if (!s) continue;

      
      if (s.z2 < currentZ - MAX_Z_AGE) continue;

      
      const inView1 = s.z1 >= zMin && s.z1 <= zMax;
      const inView2 = s.z2 >= zMin && s.z2 <= zMax;
      if (!inView1 && !inView2) continue;

      
      const tp1 = track.getTrackPoint(s.z1);
      const sx1 = halfW + (tp1.x - cameraX) + s.lat1 * LATERAL_RENDER_SCALE;
      const sy1 = carY - (s.z1 - currentZ);

      
      const tp2 = track.getTrackPoint(s.z2);
      const sx2 = halfW + (tp2.x - cameraX) + s.lat2 * LATERAL_RENDER_SCALE;
      const sy2 = carY - (s.z2 - currentZ);

      
      
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

  
  function resize() {}

  return {
    resize,
    addSkid,
    drawTo,
    clear,
  };
}

export { createSkidLayer };
