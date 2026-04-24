import { SCREENS } from "../../constants/enums.js";
import { resetAllOverrides, setPhysicsValue, getAllOverrides } from "../../constants/physics-overrides.js";
import { GameState } from "../GameState.js";
import { updateCarPhysics } from "../../systems/physics/index.js";

// Minimal UI helpers (no external libs)
function el(tag, attrs = {}, children = []) {
  const d = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "style") Object.assign(d.style, v);
    else d.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (typeof c === "string") d.appendChild(document.createTextNode(c));
    else d.appendChild(c);
  });
  return d;
}

export default class PhysicsSandboxState extends GameState {
  constructor(deps) {
    super();
    // deps: { getGameState, canvas, track, callbacks }
    this._deps = deps;
    this.container = null;
    this.sliders = [];
    this.running = false;
    this.simState = null; // lightweight sim state
  }

  onEnter() {
    // build container
    this.container = el('div', { style: { position: 'absolute', left: '0', top: '0', right: '0', bottom: '0', display: 'flex', gap: '12px', padding: '12px', boxSizing: 'border-box' } });

    const panel = el('div', { style: { width: '360px', background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '12px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '13px' } });
    panel.appendChild(el('h3', {}, ['Physics Sandbox']));

    const defs = this._sliderDefs();
    defs.forEach(def => {
      const row = el('div', { style: { marginBottom: '8px' } });
      const label = el('div', {}, [def.label + ': ']);
      const input = el('input', { type: 'range', min: String(def.min), max: String(def.max), step: String(def.step || 0.01) });
      input.value = String(def.default);
      const value = el('span', { style: { marginLeft: '8px' } }, [String(def.default)]);
      input.addEventListener('input', () => {
        const v = parseFloat(input.value);
        value.textContent = v.toFixed(3);
        setPhysicsValue(def.key, v);
      });
      row.appendChild(label);
      row.appendChild(input);
      row.appendChild(value);
      panel.appendChild(row);
      this.sliders.push({ def, input, value });
    });

    const btnRow = el('div', { style: { marginTop: '10px', display: 'flex', gap: '8px' } });
    const resetBtn = el('button', {}, ['Reset']);
    resetBtn.addEventListener('click', () => {
      resetAllOverrides();
      this.sliders.forEach(s => { s.input.value = s.def.default; s.value.textContent = s.def.default; });
    });
    const copyBtn = el('button', {}, ['Copy JSON']);
    copyBtn.addEventListener('click', async () => {
      const json = JSON.stringify(getAllOverrides(), null, 2);
      await navigator.clipboard.writeText(json);
      copyBtn.textContent = 'Copied';
      setTimeout(() => (copyBtn.textContent = 'Copy JSON'), 1200);
    });
    const backBtn = el('button', {}, ['Back']);
    backBtn.addEventListener('click', () => { try { this._deps.callbacks.backToMenu(); } catch (e) {} this.onExit(); });
    btnRow.appendChild(resetBtn);
    btnRow.appendChild(copyBtn);
    btnRow.appendChild(backBtn);
    panel.appendChild(btnRow);

    const simCanvas = el('canvas', { width: '800', height: '480', style: { flex: '1', background: '#222', borderRadius: '6px' } });
    this.simCanvas = simCanvas;

    this.container.appendChild(panel);
    this.container.appendChild(simCanvas);
    document.body.appendChild(this.container);

    // sim state: shallow copy of a car with minimal fields
    this.simState = this._makeSimState();
    this.running = true;
    this._tick = this._tick.bind(this);
    requestAnimationFrame(this._tick);
  }

  _sliderDefs() {
    return [
      { key: 'LATERAL_FRICTION_GRIP_X', label: 'Grip X', min: 0.1, max: 1.4, default: 0.82, step: 0.01 },
      { key: 'LATERAL_FRICTION_GRIP_Z', label: 'Grip Z', min: 0.1, max: 1.4, default: 0.97, step: 0.01 },
      { key: 'CENTRIFUGAL_FACTOR', label: 'Centrifugal', min: 0.001, max: 0.05, default: 0.01, step: 0.001 },
      { key: 'CENTRIFUGAL_DRIFT_BUILD_RATE', label: 'Drift Build', min: 0.1, max: 4.0, default: 1.8, step: 0.1 },
      { key: 'DRIFT_RECOVERY_RATE', label: 'Drift Recover', min: 0.01, max: 1.0, default: 0.15, step: 0.01 },
      { key: 'VZ_MAX_MODE_X', label: 'Max Speed X', min: 8, max: 40, default: 23, step: 0.5 },
      { key: 'VZ_MAX_MODE_Z', label: 'Max Speed Z', min: 6, max: 32, default: 19, step: 0.5 },
      { key: 'VZ_ACCEL_MODE_X', label: 'Accel X', min: 0.05, max: 1.0, default: 0.25, step: 0.01 },
      { key: 'VZ_ACCEL_MODE_Z', label: 'Accel Z', min: 0.05, max: 1.0, default: 0.2, step: 0.01 },
      { key: 'OFF_TRACK_VZ_DRAG', label: 'OffTrack Drag', min: 0.8, max: 1.0, default: 0.96, step: 0.001 },
      { key: 'OFF_TRACK_MAX_SPEED', label: 'OffTrack Max', min: 4, max: 32, default: 19, step: 0.5 },
      { key: 'WALL_BOUNCE_DAMPING', label: 'Wall Bounce', min: 0.0, max: 1.0, default: 0.5, step: 0.01 },
      { key: 'MANUAL_BRAKE_DECEL', label: 'Brake Hard', min: 0.80, max: 0.99, default: 0.94, step: 0.001 },
      { key: 'BRAKE_REGEN_BASE', label: 'Brake Regen', min: 0.0, max: 1.0, default: 0.2, step: 0.01 },
      { key: 'BOOST_BASE_GAIN', label: 'Boost Gain', min: 0, max: 40, default: 19, step: 0.5 },
      { key: 'BOOST_BATTERY_DRAIN', label: 'Boost Drain', min: 0.01, max: 2.0, default: 0.4, step: 0.01 },
      { key: 'SPIN_TRIGGER_SPEED', label: 'Spin Trigger', min: 4, max: 28, default: 18, step: 0.5 },
      { key: 'SPIN_EXIT_SPEED', label: 'Spin Exit', min: 1, max: 12, default: 7, step: 0.5 },
    ];
  }

  _makeSimState() {
    // minimal hull for physics functions
    return {
      car: {
        x: 0,
        z: 0,
        speed: 12,
        lateralVelocity: 0,
        lateralOffset: 0,
        aeroMode: 'X',
        isBoosting: false,
        battery: 1.0,
        isOffTrack: false,
        spin: false,
        slip: 0,
      },
      // provide a fake track curvature that alternates
      track: {
        sample: (z) => ({ curvature: Math.sin(z * 0.008) * 0.004 })
      }
    };
  }

  _tick(ts) {
    if (!this.running) return;
    // advance sim a fixed dt for stability
    const dt = 1 / 60;
    const sim = this.simState;
    const curv = sim.track.sample(sim.car.z).curvature;
    // compute longitudinal
    const { lapCompleted, physicsTelemetry } = updateCarPhysics(sim, sim.track, dt);
    // render simple view
    this._renderSim(sim, physicsTelemetry);
    // advance z for loop
    sim.car.z += sim.car.speed * dt * 0.6;
    if (sim.car.z > 10000) sim.car.z = 0;
    requestAnimationFrame(this._tick);
  }

  _renderSim(sim, telemetry) {
    const c = this.simCanvas.getContext('2d');
    const w = this.simCanvas.width = Math.max(640, window.innerWidth - 420);
    const h = this.simCanvas.height = Math.max(360, window.innerHeight - 120);
    c.clearRect(0, 0, w, h);
    // draw track center line
    c.fillStyle = '#333';
    c.fillRect(0, h / 2 - 80, w, 160);
    // draw car
    const cx = w / 2 + sim.car.lateralOffset;
    const cy = h / 2;
    c.fillStyle = '#ff4646';
    c.save();
    const speed = Math.min(60, sim.car.speed * 3);
    c.translate(cx, cy);
    const ang = (telemetry?.drift || 0) * 0.3;
    c.rotate(ang);
    c.fillRect(-18, -32, 36, 64);
    c.restore();

    // telemetry text
    c.fillStyle = '#fff';
    c.font = '12px monospace';
    const lines = [
      `speed: ${sim.car.speed.toFixed(2)}`,
      `vx: ${sim.car.lateralVelocity.toFixed(2)}`,
      `slip: ${sim.car.slip.toFixed(3)}`,
      `aero: ${sim.car.aeroMode}`,
    ];
    lines.forEach((l, i) => c.fillText(l, 12, 18 + i * 16));
  }

  onExit() {
    this.running = false;
    if (this.container && this.container.parentNode) this.container.parentNode.removeChild(this.container);
    this.container = null;
  }
}
