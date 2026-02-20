import type { TopHolder } from "@/types";

export type SnapshotInsert = {
  chain: "base" | "solana";
  address: string;
  ts: number;
  price: number;
  distribution: { top10Pct: number; top50Pct: number; top100Pct: number };
  holders: TopHolder[];
};

export function saveSnapshot(db: any, snapshot: SnapshotInsert) {
  const insertSnapshot = db.prepare(
    "INSERT INTO snapshots (chain, address, ts, top10, top50, top100, price) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const insertHolder = db.prepare(
    "INSERT INTO holders (snapshot_id, address, pct, label, avg_cost, pnl_pct) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const tx = db.transaction(() => {
    const res = insertSnapshot.run(
      snapshot.chain,
      snapshot.address,
      snapshot.ts,
      snapshot.distribution.top10Pct,
      snapshot.distribution.top50Pct,
      snapshot.distribution.top100Pct,
      snapshot.price
    );
    const id = res.lastInsertRowid as number;
    snapshot.holders.forEach((h) => {
      insertHolder.run(id, h.address, h.pct, h.label ?? null, h.avgCost ?? null, h.pnlPct ?? null);
    });
    return id;
  });
  return tx();
}

export function loadSnapshotBefore(db: any, params: { chain: string; address: string; ts: number }) {
  const snap = db
    .prepare(
      "SELECT id, ts FROM snapshots WHERE chain = ? AND address = ? AND ts <= ? ORDER BY ts DESC LIMIT 1"
    )
    .get(params.chain, params.address, params.ts);
  if (!snap) return null;
  const row = db
    .prepare("SELECT top10, top50, top100, price FROM snapshots WHERE id = ?")
    .get(snap.id);
  const holders = db
    .prepare("SELECT address, pct FROM holders WHERE snapshot_id = ?")
    .all(snap.id);
  return {
    id: snap.id as number,
    ts: snap.ts as number,
    holders,
    top10: row?.top10 ?? 0,
    top50: row?.top50 ?? 0,
    top100: row?.top100 ?? 0,
    price: row?.price ?? 0
  };
}

export function loadFirstSeen(db: any, params: { chain: string; address: string; holder: string }) {
  const row = db
    .prepare(
      `SELECT s.ts as ts
       FROM holders h
       JOIN snapshots s ON h.snapshot_id = s.id
       WHERE s.chain = ? AND s.address = ? AND h.address = ?
       ORDER BY s.ts ASC
       LIMIT 1`
    )
    .get(params.chain, params.address, params.holder);
  return row?.ts ?? null;
}
