function writePhysicsTelemetry(gameState, data) {
  gameState._telCentrifugalForce = data.centrifugalForce;
  gameState._telEffectiveGrip = data.effectiveGrip;
}

export { writePhysicsTelemetry };
