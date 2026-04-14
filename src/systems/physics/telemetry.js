function writePhysicsTelemetry(gameState, data) {
  gameState._telCentrifugalForce = data.centrifugalForce;
  gameState._telEffectiveGrip    = data.effectiveGrip;
  gameState._telTargetHeading    = data.targetHeading;
  gameState._telKpForce          = data.kpForce;
  gameState._telAutoSteerForce   = data.autoSteerForce;
}

export { writePhysicsTelemetry };
