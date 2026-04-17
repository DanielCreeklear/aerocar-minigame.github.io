export class HybridRankingRepository {
  constructor(localRepo, firebaseRepo) {
    this._local = localRepo;
    this._firebase = firebaseRepo;
  }
  async fetchAll() {
    if (this._firebase.isConfigured()) {
      const remote = await this._firebase.fetchAll();
      if (remote.length > 0) {
        await this._local.saveAll(remote);
        return remote;
      }
    }
    return this._local.fetchAll();
  }
  async saveAll(entries) {
    await this._local.saveAll(entries);
    this._firebase.saveAll(entries).catch((err) => {
      console.warn("[RankingService] Firebase background sync failed:", err.message);
    });
  }
}