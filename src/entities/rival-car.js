import {
  RIVAL_COUNT,
  RIVAL_SPEED_MIN,
  RIVAL_SPEED_MAX,
} from "../constants/index.js";


const RIVAL_LIVERIES = [
  { body: "#C0C0C0", accent: "#1A1A1A" }, 
  { body: "#1E3A8A", accent: "#CC0000" }, 
  { body: "#E8002D", accent: "#FFD700" }, 
  { body: "#FF8000", accent: "#1A1A1A" }, 
  { body: "#00665E", accent: "#E8E8E8" }, 
];


function createRivals(count = RIVAL_COUNT, track) {
  const rivals = [];
  const n = count;
  const lapLength = track.lapLength;
  const speedRange = RIVAL_SPEED_MAX - RIVAL_SPEED_MIN;

  for (let i = 0; i < n; i++) {
    const rank = i + 1; 
    
    const startFraction = (i + 0.5) / n;
    const startZ = lapLength * startFraction;

    
    const speed =
      n === 1 ? RIVAL_SPEED_MAX : RIVAL_SPEED_MAX - (speedRange * i) / (n - 1);

    rivals.push({
      id: i,
      rank,
      currentZ: startZ,
      speed,
      lateralOffset: 0,
      livery: RIVAL_LIVERIES[i % RIVAL_LIVERIES.length],
    });
  }

  return rivals;
}

export { createRivals };
