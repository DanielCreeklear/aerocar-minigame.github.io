const STORAGE_KEY = "apexz_rankings";
export class LocalStorageRankingRepository {
  fetchAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return Promise.resolve([]);
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return Promise.resolve([]);
      return Promise.resolve(
        parsed.filter(
          (e) => e && typeof e.time === "number" && typeof e.name === "string",
        ),
      );
    } catch {
      return Promise.resolve([]);
    }
  }
  saveAll(entries) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
    }
    return Promise.resolve();
  }
}