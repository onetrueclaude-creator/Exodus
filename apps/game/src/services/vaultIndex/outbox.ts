// Projection outbox (design §5.3): chain write succeeded, index write pending.
// Search is eventually consistent and the docs say so. Drain runs on the next
// write and via scripts — the DAG remains the source of truth throughout.
import type pg from 'pg';
import { EntryInput } from './types';

export interface ProjectionOutbox {
  enqueue(entry: EntryInput): Promise<void>;
  drain(project: (e: EntryInput) => Promise<void>, limit?: number): Promise<number>;
}

export class MemoryOutbox implements ProjectionOutbox {
  private rows = new Map<string, EntryInput>();

  async enqueue(entry: EntryInput): Promise<void> {
    this.rows.set(entry.cid, entry);
  }

  async drain(project: (e: EntryInput) => Promise<void>, limit = 50): Promise<number> {
    let n = 0;
    for (const [cid, e] of [...this.rows]) {
      if (n >= limit) break;
      try {
        await project(e);
        this.rows.delete(cid);
        n++;
      } catch { /* stays queued for the next drain */ }
    }
    return n;
  }
}

export class PostgresOutbox implements ProjectionOutbox {
  constructor(private pool: pg.Pool) {}

  async enqueue(entry: EntryInput): Promise<void> {
    await this.pool.query(
      `INSERT INTO vault_index.projection_outbox (cid, payload, attempts, next_retry)
       VALUES ($1, $2, 0, now())
       ON CONFLICT (cid) DO UPDATE SET payload = EXCLUDED.payload`,
      [entry.cid, JSON.stringify(entry)]);
  }

  async drain(project: (e: EntryInput) => Promise<void>, limit = 50): Promise<number> {
    const due = await this.pool.query(
      `SELECT cid, payload FROM vault_index.projection_outbox
       WHERE next_retry IS NULL OR next_retry <= now()
       ORDER BY next_retry NULLS FIRST LIMIT $1`, [limit]);
    let n = 0;
    for (const row of due.rows) {
      try {
        await project(row.payload as EntryInput);
        await this.pool.query(`DELETE FROM vault_index.projection_outbox WHERE cid = $1`, [row.cid]);
        n++;
      } catch {
        await this.pool.query(
          `UPDATE vault_index.projection_outbox
           SET attempts = attempts + 1,
               next_retry = now() + make_interval(secs => least(3600, 60 * power(2, attempts)))
           WHERE cid = $1`, [row.cid]);
      }
    }
    return n;
  }
}
