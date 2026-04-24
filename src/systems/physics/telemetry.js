function buildPhysicsTelemetry(data) {
  const out = {
    centrifugalForce: data.centrifugalForce,
    effectiveGrip: data.effectiveGrip,
  };
  if (data.lateral) {
    out.lateral = {
      vxDemand: data.lateral.vxDemand,
      gripLimit: data.lateral.gripLimit,
      gripRatio: data.lateral.gripRatio,
      overDriveFactor: data.lateral.overDriveFactor,
      steerEffectiveness: data.lateral.steerEffectiveness,
      drift: data.lateral.drift,
    };
  }
  return out;
}
export { buildPhysicsTelemetry };
