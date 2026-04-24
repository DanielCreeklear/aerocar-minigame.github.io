function _validateEntry(e) {
  return e && typeof e.time === "number" && typeof e.name === "string";
}
function _sanitizeName(raw) {
  return (
    (raw ?? "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8) || "ACE"
  );
}
function _sortAndTrim(entries) {
  return [...entries].sort((a, b) => a.time - b.time);
}
export class RankingService {
  constructor(repository) {
    this._repo = repository;
  }
  async load() {
    const raw = await this._repo.fetchAll();
    return _sortAndTrim(raw.filter(_validateEntry));
  }
  async save(rawName, timeMs) {
    const name = _sanitizeName(rawName);
    const entry = {
      name,
      time: timeMs,
      date: new Date().toISOString().slice(0, 10),
    };
    const current = await this._repo.fetchAll();
    const next = _sortAndTrim([...current.filter(_validateEntry), entry]);
    await this._repo.saveAll(next);
    const newEntryIndex = next.findIndex(
      (r) => r.time === entry.time && r.name === entry.name,
    );
    return { rankings: next, newEntryIndex };
  }
}
