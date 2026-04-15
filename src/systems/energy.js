import {
  BATTERY_MAX,
  BOOST_BATTERY_DRAIN,
  BRAKE_REGEN_BASE,
  BRAKE_REGEN_SPEED_FACTOR,
  PASSIVE_REGEN_FACTOR,
} from "../constants/index.js";

class EnergyManager {
  constructor() {
    this.battery = BATTERY_MAX;
    this._prevSpeed = null;
  }

  update(gameState, dt = 1) {
    const { isBoosting, isBraking, speed } = gameState;
    const prevSpeed = this._prevSpeed !== null ? this._prevSpeed : speed;

    if (isBoosting && this.battery > 0) {
      this.battery = Math.max(0, this.battery - BOOST_BATTERY_DRAIN * dt);
      if (this.battery <= 0) {
        gameState.isBoosting = false;
      }
    } else if (isBraking && speed > 0) {
      // Recarga ativa por frenagem
      const regenRate =
        (BRAKE_REGEN_BASE + speed * BRAKE_REGEN_SPEED_FACTOR) * dt;
      this.battery = Math.min(BATTERY_MAX, this.battery + regenRate);
    } else if (!isBoosting && !isBraking && speed < prevSpeed && speed > 0) {
      // Recarga passiva por desaceleração natural (troca de modo, slip, saída de curva)
      const decelDelta = prevSpeed - speed;
      const passiveRegen = decelDelta * PASSIVE_REGEN_FACTOR * dt;
      this.battery = Math.min(BATTERY_MAX, this.battery + passiveRegen);
    }

    this._prevSpeed = speed;
  }

  reset() {
    this.battery = BATTERY_MAX;
    this._prevSpeed = null;
  }

  getCurrentCharge() {
    return this.battery;
  }
}

export { EnergyManager };
