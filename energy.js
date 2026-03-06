import {
  BATTERY_MAX,
  BOOST_BATTERY_DRAIN,
  BRAKE_REGEN_BASE,
  BRAKE_REGEN_SPEED_FACTOR,
} from "./constants/index.js";

class EnergyManager {
  constructor() {
    this.battery = BATTERY_MAX;
  }

  update(gameState) {
    const { isBoosting, isBraking, speed } = gameState;

    if (isBoosting && this.battery > 0) {
      this.battery = Math.max(0, this.battery - BOOST_BATTERY_DRAIN);
      if (this.battery <= 0) {
        gameState.isBoosting = false;
      }
    } else if (isBraking && speed > 0) {
      // Regen rate is proportional to current speed (≈ proportional to deceleration)
      const regenRate = BRAKE_REGEN_BASE + speed * BRAKE_REGEN_SPEED_FACTOR;
      this.battery = Math.min(BATTERY_MAX, this.battery + regenRate);
    }
  }

  reset() {
    this.battery = BATTERY_MAX;
  }

  getCurrentCharge() {
    return this.battery;
  }
}

export { EnergyManager };
