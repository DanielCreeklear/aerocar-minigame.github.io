import { LocalStorageRankingRepository } from "./LocalStorageRankingRepository.js";
import { FirebaseRankingRepository } from "./FirebaseRankingRepository.js";
import { HybridRankingRepository } from "./HybridRankingRepository.js";
import { RankingService } from "./RankingService.js";

export { RankingService };



export function createRankingService() {
  const local = new LocalStorageRankingRepository();
  const firebase = new FirebaseRankingRepository();
  const hybrid = new HybridRankingRepository(local, firebase);
  return new RankingService(hybrid);
}
