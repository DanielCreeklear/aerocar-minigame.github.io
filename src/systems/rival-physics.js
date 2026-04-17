import {
  RIVAL_LATERAL_SWAY,
  COLLISION_RIVAL_Z,
  COLLISION_RIVAL_LATERAL,
  COLLISION_OBSTACLE_Z,
  COLLISION_OBSTACLE_LATERAL,
  COLLISION_RIVAL_SPEED_FACTOR,
  COLLISION_OBSTACLE_SPEED_FACTOR,
  COLLISION_COOLDOWN,
  OBSTACLE_RESET_TIME,
} from "../constants/index.js";
function wrapDelta(a, b, lapLength) {
  let d = b - a;
  while (d > lapLength / 2) d -= lapLength;
  while (d < -lapLength / 2) d += lapLength;
  return d;
}
function updateRivals(gameState, track, dt) {
  const { rivals, obstacles } = gameState;
  if (!rivals || !obstacles) return;
  const lapLength = track.lapLength;
  if (gameState.collisionCooldown > 0) {
    gameState.collisionCooldown -= dt;
  }
  for (const rival of rivals) {
    rival.currentZ = (rival.currentZ + rival.speed * dt) % lapLength;
    rival.lateralOffset =
      Math.sin(rival.currentZ * 0.0015 + rival.id * 1.3) * RIVAL_LATERAL_SWAY;
  }
  const playerLapZNow = gameState.currentZ % lapLength;
  for (const rival of rivals) {
    const dZ = wrapDelta(playerLapZNow, rival.currentZ, lapLength);
    if (dZ < -(lapLength * 0.6)) {
      const spawnAhead = 250 + Math.random() * 600;
      rival.currentZ = (playerLapZNow + spawnAhead) % lapLength;
    }
  }
  for (const obs of obstacles) {
    if (obs.hitTimer > 0) {
      obs.hitTimer -= dt;
      if (obs.hitTimer < 0) obs.hitTimer = 0;
    }
  }
  if (gameState.collisionCooldown > 0) return;
  const playerLapZ = gameState.currentZ % lapLength;
  const playerLateral = gameState.lateralOffset || 0;
  for (const rival of rivals) {
    const dZ = wrapDelta(playerLapZ, rival.currentZ, lapLength);
    const absZ = Math.abs(dZ);
    const dLat = Math.abs(playerLateral - rival.lateralOffset);
    if (absZ >= COLLISION_RIVAL_Z) continue;
    const lateralOverlap = Math.max(0, 1 - dLat / COLLISION_RIVAL_LATERAL);
    if (lateralOverlap <= 0) continue;
    const zOverlap = 1 - absZ / COLLISION_RIVAL_Z;
    const combinedOverlap = lateralOverlap * zOverlap;
    if (combinedOverlap > 0.15) {
      const penaltyStrength =
        combinedOverlap * (1 - COLLISION_RIVAL_SPEED_FACTOR);
      gameState.speed = (gameState.speed || 0) * (1 - penaltyStrength);
    }
    const pushDir = playerLateral >= rival.lateralOffset ? 1 : -1;
    const pushForce = lateralOverlap * 12;
    gameState.lateralVelocity =
      (gameState.lateralVelocity || 0) + pushDir * pushForce;
    gameState.collisionCooldown =
      COLLISION_COOLDOWN * (0.2 + combinedOverlap * 0.8);
    break;
  }
  if (gameState.collisionCooldown > 0) return;
  for (const obs of obstacles) {
    if (obs.hitTimer > 0) continue;
    const dZ = wrapDelta(playerLapZ, obs.lapZ, lapLength);
    const dLat = Math.abs(playerLateral - obs.lateralOffset);
    if (
      Math.abs(dZ) < COLLISION_OBSTACLE_Z &&
      dLat < COLLISION_OBSTACLE_LATERAL
    ) {
      gameState.speed =
        (gameState.speed || 0) * COLLISION_OBSTACLE_SPEED_FACTOR;
      obs.hitTimer = OBSTACLE_RESET_TIME;
      gameState.collisionCooldown = COLLISION_COOLDOWN * 0.4;
      break;
    }
  }
}
export { updateRivals, wrapDelta };