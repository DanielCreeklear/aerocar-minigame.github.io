function buildPhysicsTelemetry(data) {
  return {
    centrifugalForce: data.centrifugalForce,
    effectiveGrip: data.effectiveGrip,
  };
}
export { buildPhysicsTelemetry };