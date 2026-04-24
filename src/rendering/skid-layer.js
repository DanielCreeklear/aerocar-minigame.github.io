// Persistent skid marks layer using an offscreen canvas.
// Skids persist for the whole session (per user's choice).
function createSkidLayer(width, height, dpr = 1) {
  let canvas = null;
  let ctx = null;
  let w = 0;
  let h = 0;
  let _dpr = dpr;

  function _ensure(wReq, hReq, dprReq) {
    if (canvas && w === wReq && h === hReq && _dpr === dprReq) return;
    w = wReq;
    h = hReq;
    _dpr = dprReq;
    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(Math.max(1, Math.round(w * _dpr)), Math.max(1, Math.round(h * _dpr)));
      ctx = canvas.getContext('2d');
    } else {
      canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(w * _dpr));
      canvas.height = Math.max(1, Math.round(h * _dpr));
      ctx = canvas.getContext('2d');
    }
    ctx.setTransform(_dpr, 0, 0, _dpr, 0, 0);
    // start clear
    ctx.clearRect(0, 0, w, h);
  }

  function resize(wReq, hReq, dprReq = 1) {
    _ensure(wReq, hReq, dprReq);
  }

  // Add a skid line between two world coordinates (already in world pixels)
  function addSkid(x1, y1, x2, y2, intensity = 1, color = 'rgba(20,20,20,0.9)') {
    if (!ctx) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.globalAlpha = Math.max(0.12, Math.min(1, intensity * 0.9));
    ctx.lineWidth = Math.max(1, Math.min(6, 2 + intensity * 4));
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  function drawTo(targetCtx) {
    if (!canvas) return;
    // targetCtx is already scaled to world units when called
    try {
      targetCtx.drawImage(canvas, 0, 0, canvas.width / _dpr, canvas.height / _dpr);
    } catch (e) {
      // fallback: try drawing via bitmap
      if (canvas instanceof OffscreenCanvas && canvas.convertToBlob) {
        canvas.convertToBlob().then((b) => {
          const img = new Image();
          img.onload = () => targetCtx.drawImage(img, 0, 0);
          img.src = URL.createObjectURL(b);
        });
      }
    }
  }

  function clear() {
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
  }

  return {
    resize,
    addSkid,
    drawTo,
    clear,
    _internalCanvas: () => canvas,
  };
}

export { createSkidLayer };
