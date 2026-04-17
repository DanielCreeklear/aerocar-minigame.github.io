import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import {
  firebaseConfig,
  RANKINGS_COLLECTION,
  RANKINGS_DOC,
} from "./firebase-config.js";

function _isConfigured(cfg) {
  return Boolean(cfg.apiKey && cfg.projectId);
}

export class FirebaseRankingRepository {
  constructor() {
    this._configured = _isConfigured(firebaseConfig);
    this._db = null;
  }

  _getDb() {
    if (!this._db) {
      const app = getApps().length
        ? getApps()[0]
        : initializeApp(firebaseConfig);
      this._db = getFirestore(app);
    }
    return this._db;
  }

  isConfigured() {
    return this._configured;
  }

  async fetchAll() {
    if (!this._configured) {
      console.info(
        "[RankingService] Firebase not configured — using local rankings.",
      );
      return [];
    }
    try {
      const ref = doc(this._getDb(), RANKINGS_COLLECTION, RANKINGS_DOC);
      const snap = await getDoc(ref);
      if (!snap.exists()) return [];
      const data = snap.data();
      return Array.isArray(data.entries) ? data.entries : [];
    } catch (err) {
      console.warn("[RankingService] Firebase fetchAll failed:", err.message);
      return [];
    }
  }

  async saveAll(entries) {
    if (!this._configured) return;
    try {
      const ref = doc(this._getDb(), RANKINGS_COLLECTION, RANKINGS_DOC);
      await setDoc(ref, { entries });
    } catch (err) {
      console.warn("[RankingService] Firebase saveAll failed:", err.message);
    }
  }
}
