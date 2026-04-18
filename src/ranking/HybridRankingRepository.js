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
    if (!this._firebase.isConfigured()) return;
    const timeout = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Firebase save timed out after 8s")),
        8000,
      ),
    );
    Promise.race([this._firebase.saveAll(entries), timeout]).catch((err) => {
      console.warn("[Firebase] Background sync failed:", err.message);
    });
  }
}
