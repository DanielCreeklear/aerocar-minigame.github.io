// Runtime physics overrides for tuning in-session.
// Values live only for the current page session and do not persist.
const overrides = new Map();

export function setPhysicsValue(key, value) {
  overrides.set(key, value);
}

export function getPhysicsValue(key, defaultValue) {
  if (overrides.has(key)) return overrides.get(key);
  return defaultValue;
}

export function resetAllOverrides() {
  overrides.clear();
}

export function getAllOverrides() {
  const obj = {};
  for (const [k, v] of overrides.entries()) obj[k] = v;
  return obj;
}

export default {
  setPhysicsValue,
  getPhysicsValue,
  resetAllOverrides,
  getAllOverrides,
};
