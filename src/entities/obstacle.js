import { OBSTACLE_CLUSTERS_PER_LAP } from "../constants/index.js";


const CONE_SIDE_OFFSETS = [
  [42, 57], 
  [-42, -57], 
];


const MIN_STRAIGHT_LENGTH = 1500;


const SEGMENT_MARGIN = 300;

let _obstacleIdCounter = 0;


function createObstacles(track) {
  const obstacles = [];
  _obstacleIdCounter = 0;

  const straights = track.segments.filter(
    (s) => s.classification === "straight" && s.length >= MIN_STRAIGHT_LENGTH,
  );

  if (straights.length === 0) return obstacles;

  
  const clustersPerStraight = Math.max(
    1,
    Math.round(OBSTACLE_CLUSTERS_PER_LAP / straights.length),
  );

  let clusterIndex = 0;

  for (const seg of straights) {
    const usableLength = seg.length - SEGMENT_MARGIN * 2;
    if (usableLength <= 0) continue;

    const n = Math.min(
      clustersPerStraight,
      Math.floor(usableLength / 600), 
    );
    if (n <= 0) continue;

    for (let i = 0; i < n; i++) {
      
      const t = n === 1 ? 0.5 : i / (n - 1);
      const clusterZ = seg.startZ + SEGMENT_MARGIN + t * usableLength;

      
      const sideOffsets = CONE_SIDE_OFFSETS[clusterIndex % 2];
      clusterIndex++;

      
      for (const lateralOffset of sideOffsets) {
        obstacles.push({
          id: _obstacleIdCounter++,
          lapZ: clusterZ,
          lateralOffset,
          hitTimer: 0, 
        });
      }
    }
  }

  return obstacles;
}

export { createObstacles };
