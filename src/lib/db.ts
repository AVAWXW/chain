let cachedDb: any = null;

export async function getDb() {
  if (cachedDb) return cachedDb;
  try {
    const mod: any = await import("better-sqlite3");
    const Database = mod?.default ?? mod;
    const db = new Database("data/chain-chip.db");
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chain TEXT NOT NULL,
        address TEXT NOT NULL,
        ts INTEGER NOT NULL,
        top10 REAL NOT NULL,
        top50 REAL NOT NULL,
        top100 REAL NOT NULL,
        price REAL NOT NULL
      );
      CREATE TABLE IF NOT EXISTS holders (
        snapshot_id INTEGER NOT NULL,
        address TEXT NOT NULL,
        pct REAL NOT NULL,
        label TEXT,
        avg_cost REAL,
        pnl_pct REAL,
        FOREIGN KEY(snapshot_id) REFERENCES snapshots(id)
      );
      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chain TEXT NOT NULL,
        address TEXT NOT NULL,
        type TEXT NOT NULL,
        ts INTEGER NOT NULL,
        message TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_snapshots_main ON snapshots(chain, address, ts);
      CREATE INDEX IF NOT EXISTS idx_holders_address ON holders(address);
      CREATE INDEX IF NOT EXISTS idx_holders_snapshot ON holders(snapshot_id);
      CREATE INDEX IF NOT EXISTS idx_alerts_main ON alerts(chain, address, type, ts);
    `);
    cachedDb = db;
    return db;
  } catch {
    return null;
  }
}
