import {
  BATTERY_MAX,
  BOOST_BATTERY_DRAIN,
  BRAKE_REGEN_BASE,
  BRAKE_REGEN_SPEED_FACTOR,
  PASSIVE_REGEN_FACTOR,
  DRIFT_ERS_REGEN_RATE,
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
      const regenRate =
        (BRAKE_REGEN_BASE + speed * BRAKE_REGEN_SPEED_FACTOR) * dt;
      this.battery = Math.min(BATTERY_MAX, this.battery + regenRate);
    } else if (!isBoosting && !isBraking && speed < prevSpeed && speed > 0) {
      const decelDelta = prevSpeed - speed;
      const passiveRegen = decelDelta * PASSIVE_REGEN_FACTOR * dt;
      this.battery = Math.min(BATTERY_MAX, this.battery + passiveRegen);
    } else if (!isBoosting && gameState.isDrifting) {
      
      this.battery = Math.min(BATTERY_MAX, this.battery + DRIFT_ERS_REGEN_RATE * dt);
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
