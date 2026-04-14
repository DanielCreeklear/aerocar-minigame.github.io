import { drawRoundedRect } from "../utils/canvas.js";

const SAMPLE_INTERVAL_MS = 50;
const MAX_SAMPLES = 600;

class TelemetryManager {
  constructor() {
    this._buf = new Array(MAX_SAMPLES).fill(null);
    this._head = 0;
    this._count = 0;
    this._lastSampleMs = -Infinity;
    this._hudVisible = false;
  }

  reset() {
    this._head = 0;
    this._count = 0;
    this._lastSampleMs = -Infinity;
  }

  log(gameState) {
    const now = gameState.currentTime;
    if (now - this._lastSampleMs < SAMPLE_INTERVAL_MS) return;
    this._lastSampleMs = now;

    this._buf[this._head] = {
      t:   now,
      z:   gameState.currentZ,
      x:   gameState.lateralOffset,
      vz:  gameState.speed,
      vx:  gameState.lateralVelocity,
      curvature:       gameState.currentCurvature,
      slip:            gameState.currentSlip,
      centrifugalForce: gameState._telCentrifugalForce ?? 0,
      effectiveGrip:   gameState._telEffectiveGrip   ?? 0,
      targetHeading:   gameState._telTargetHeading   ?? 0,
      carHeadingDelta: gameState.carHeadingDelta,
      kpForce:         gameState._telKpForce         ?? 0,
      autoSteerForce:  gameState._telAutoSteerForce  ?? 0,
      aeroMode:   gameState.aeroMode,
      battery:    gameState.battery,
      isOffTrack: gameState.isOffTrack ? 1 : 0,
    };

    this._head = (this._head + 1) % MAX_SAMPLES;
    if (this._count < MAX_SAMPLES) this._count++;
  }

  exportJSON() {
    const samples = this._getSamples();
    if (samples.length === 0) return;

    const blob = new Blob(
      [JSON.stringify({
        exportedAt:      new Date().toISOString(),
        sampleCount:     samples.length,
        sampleIntervalMs: SAMPLE_INTERVAL_MS,
        fields: [
          't', 'z', 'x', 'vz', 'vx',
          'curvature', 'slip', 'centrifugalForce', 'effectiveGrip',
          'targetHeading', 'carHeadingDelta', 'kpForce', 'autoSteerForce',
          'aeroMode', 'battery', 'isOffTrack',
        ],
        samples,
      }, null, 2)],
      { type: 'application/json' },
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telemetry_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  toggleHUD() {
    this._hudVisible = !this._hudVisible;
  }

  drawHUD(ctx, width, height) {
    if (!this._hudVisible) return;
    const d = this._getLatest();
    if (!d) return;

    const PX = 10;
    const PY = 62;
    const PW = 256;
    const PH = 226;
    const COL = PX + 10;
    const LH  = 16;
    let cy = PY + 8;

    ctx.save();

    drawRoundedRect(ctx, PX, PY, PW, PH, 8);
    ctx.fillStyle = 'rgba(4, 10, 18, 0.88)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = '700 10px Consolas,"Courier New",monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.fillStyle = 'rgba(241, 196, 15, 0.95)';
    ctx.fillText('\u25A0 TELEMETRIA', COL, cy);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(149, 165, 166, 0.8)';
    ctx.fillText('[H] fechar', PX + PW - 8, cy);
    ctx.textAlign = 'left';
    cy += LH + 2;

    _sep(ctx, PX, PX + PW, cy); cy += 5;

    ctx.fillStyle = '#ecf0f1';
    ctx.fillText(
      `Vz: ${d.vz.toFixed(1).padStart(5)} m/s   Vx: ${_sign(d.vx)}${d.vx.toFixed(2)}`,
      COL, cy,
    );
    cy += LH;

    ctx.fillText(
      `\u03BA: ${_sign(d.curvature)}${d.curvature.toFixed(4)}   slip: ${d.slip.toFixed(3)}`,
      COL, cy,
    );
    cy += LH + 4;

    ctx.fillStyle = 'rgba(241, 196, 15, 0.85)';
    ctx.fillText('CENTRIF vs GRIP', COL, cy);
    cy += LH;

    const BAR_W = PW - 20;
    const BAR_H = 14;
    const BX    = PX + 10;
    const scale  = Math.max(Math.abs(d.centrifugalForce), d.effectiveGrip, 0.001);
    const cfPct  = d.effectiveGrip > 0.001
      ? Math.round((Math.abs(d.centrifugalForce) / d.effectiveGrip) * 100)
      : 0;

    ctx.fillStyle = 'rgba(20, 45, 20, 0.8)';
    ctx.fillRect(BX, cy, BAR_W, BAR_H);
    const gFill = Math.min(d.effectiveGrip / scale, 1) * BAR_W;
    if (gFill > 0) { ctx.fillStyle = '#27ae60'; ctx.fillRect(BX, cy, gFill, BAR_H); }
    ctx.fillStyle = '#ecf0f1';
    ctx.textBaseline = 'middle';
    ctx.fillText(`GRIP  ${d.effectiveGrip.toFixed(2)}`, BX + 4, cy + BAR_H * 0.5);
    ctx.textBaseline = 'top';
    cy += BAR_H + 3;

    ctx.fillStyle = 'rgba(45, 20, 20, 0.8)';
    ctx.fillRect(BX, cy, BAR_W, BAR_H);
    const cFill = Math.min(Math.abs(d.centrifugalForce) / scale, 1) * BAR_W;
    if (cFill > 0) {
      ctx.fillStyle = d.slip > 0.15 ? '#c0392b' : '#e08b2e';
      ctx.fillRect(BX, cy, cFill, BAR_H);
    }
    ctx.fillStyle = '#ecf0f1';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `CF    ${Math.abs(d.centrifugalForce).toFixed(2)}  (${cfPct}%)`,
      BX + 4, cy + BAR_H * 0.5,
    );
    ctx.textBaseline = 'top';
    cy += BAR_H + 6;

    _sep(ctx, PX, PX + PW, cy); cy += 5;

    ctx.fillStyle = 'rgba(86, 180, 233, 0.9)';
    ctx.fillText('AUTO-STEER', COL, cy);
    cy += LH;

    ctx.fillStyle = '#ecf0f1';
    ctx.fillText(
      `tgtH: ${_sign(d.targetHeading)}${d.targetHeading.toFixed(3)}   \u0394h: ${_sign(d.carHeadingDelta)}${d.carHeadingDelta.toFixed(3)}`,
      COL, cy,
    );
    cy += LH;
    ctx.fillText(
      ` Kp: ${_sign(d.kpForce)}${d.kpForce.toFixed(3)}   AS: ${_sign(d.autoSteerForce)}${d.autoSteerForce.toFixed(3)}`,
      COL, cy,
    );
    cy += LH + 4;

    _sep(ctx, PX, PX + PW, cy); cy += 5;

    ctx.fillStyle = d.isOffTrack ? '#e74c3c' : '#b2bec3';
    ctx.fillText(
      `MODO: ${d.aeroMode}   ERS: ${Math.floor(d.battery)}%${d.isOffTrack ? '  [!] OFF-TRACK' : ''}`,
      COL, cy,
    );
    cy += LH + 3;

    ctx.fillStyle = 'rgba(127, 140, 141, 0.65)';
    ctx.fillText('[T] Export JSON', COL, cy);

    ctx.restore();
  }

  _getLatest() {
    if (this._count === 0) return null;
    return this._buf[(this._head - 1 + MAX_SAMPLES) % MAX_SAMPLES];
  }

  _getSamples() {
    if (this._count === 0) return [];
    const oldest = this._count < MAX_SAMPLES ? 0 : this._head;
    const out = new Array(this._count);
    for (let i = 0; i < this._count; i++) {
      out[i] = this._buf[(oldest + i) % MAX_SAMPLES];
    }
    return out;
  }
}

function _sep(ctx, x1, x2, y) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(x1 + 4, y);
  ctx.lineTo(x2 - 4, y);
  ctx.stroke();
  ctx.restore();
}

function _sign(v) {
  return v >= 0 ? '+' : '';
}

export { TelemetryManager };
