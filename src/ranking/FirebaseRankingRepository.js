import { firebaseConfig, RANKINGS_DB_PATH } from "./firebase-config.js";

function _isConfigured(cfg) {
  return Boolean(cfg.apiKey && cfg.databaseURL && cfg.projectId);
}

export class FirebaseRankingRepository {
  constructor() {
    this._configured = _isConfigured(firebaseConfig);

    if (this._configured) {
      this._app = null;
      this._db = null;
    }
  }

  isConfigured() {
    return this._configured;
  }

  async fetchAll() {
    if (!this._configured) {
      console.info("[RankingService] Firebase not configured — using local rankings.");
      return [];
    }

    return [];
  }

  async saveAll(_entries) {
    if (!this._configured) return;
  }
}
