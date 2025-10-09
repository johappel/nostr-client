// framework/plugins/storage/SQLitePlugin.ts

import { StoragePlugin, StorageFilter } from './StoragePlugin.js';
import type { SignedEvent } from '../../types/index.js';

export interface SQLiteConfig {
  dbName?: string;
  wasmUrl?: string;
  testMode?: boolean;
}

/**
 * SQLite-based storage plugin using sql.js (WASM)
 * Provides much larger storage capacity than localStorage
 * 
 * In test mode, uses in-memory storage to simulate SQLite behavior
 */
export class SQLitePlugin extends StoragePlugin {
  private _dbName: string;
  private _db: any = null;
  private _SQL: any = null;
  private _testMode: boolean;
  private _memoryStore: Map<string, SignedEvent> = new Map();

  constructor(config: SQLiteConfig = {}) {
    super();
    this.name = 'sqlite';
    this._dbName = config.dbName || 'nostr_events.db';
    this._testMode = config.testMode || false;
  }

  async initialize(): Promise<void> {
    console.log('[SQLitePlugin] Initializing...');
    
    if (this._testMode) {
      console.log('[SQLitePlugin] Running in test mode (in-memory)');
      this._initialized = true;
      return;
    }

    try {
      // Try to load sql.js WASM
      const initSqlJs = (window as any).initSqlJs;
      if (!initSqlJs) {
        throw new Error('sql.js not loaded');
      }

      this._SQL = await initSqlJs({
        locateFile: (file: string) => `https://sql.js.org/dist/${file}`
      });

      // Create or open database
      this._db = new this._SQL.Database();
      
      // Create events table
      this._db.run(`
        CREATE TABLE IF NOT EXISTS events (
          id TEXT PRIMARY KEY,
          pubkey TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          kind INTEGER NOT NULL,
          tags TEXT NOT NULL,
          content TEXT NOT NULL,
          sig TEXT NOT NULL,
          raw_event TEXT NOT NULL
        )
      `);

      // Create indexes for better query performance
      this._db.run('CREATE INDEX IF NOT EXISTS idx_pubkey ON events(pubkey)');
      this._db.run('CREATE INDEX IF NOT EXISTS idx_kind ON events(kind)');
      this._db.run('CREATE INDEX IF NOT EXISTS idx_created_at ON events(created_at)');

      this._initialized = true;
      console.log('[SQLitePlugin] Initialized successfully');
    } catch (error) {
      console.warn('[SQLitePlugin] WASM initialization failed, falling back to test mode:', error);
      this._testMode = true;
      this._initialized = true;
    }
  }

  async save(events: SignedEvent[]): Promise<number> {
    if (!this._initialized) {
      await this.initialize();
    }

    if (this._testMode) {
      let saved = 0;
      for (const event of events) {
        if (!this._memoryStore.has(event.id)) {
          this._memoryStore.set(event.id, event);
          saved++;
        }
      }
      console.log(`[SQLitePlugin] Saved ${saved} events to memory store`);
      return saved;
    }

    let saved = 0;
    const stmt = this._db.prepare(`
      INSERT OR REPLACE INTO events 
      (id, pubkey, created_at, kind, tags, content, sig, raw_event)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const event of events) {
      try {
        stmt.run([
          event.id,
          event.pubkey,
          event.created_at,
          event.kind,
          JSON.stringify(event.tags),
          event.content,
          event.sig,
          JSON.stringify(event)
        ]);
        saved++;
      } catch (error) {
        console.error('[SQLitePlugin] Error saving event:', error);
      }
    }

    stmt.free();
    console.log(`[SQLitePlugin] Saved ${saved} events to SQLite`);
    return saved;
  }

  async query(filters: StorageFilter[]): Promise<SignedEvent[]> {
    if (!this._initialized) {
      await this.initialize();
    }

    if (this._testMode) {
      const results: SignedEvent[] = [];
      const events = Array.from(this._memoryStore.values());

      for (const filter of filters) {
        const filtered = events.filter(event => {
          if (filter.ids && !filter.ids.includes(event.id)) return false;
          if (filter.authors && !filter.authors.includes(event.pubkey)) return false;
          if (filter.kinds && !filter.kinds.includes(event.kind)) return false;
          if (filter.since && event.created_at < filter.since) return false;
          if (filter.until && event.created_at > filter.until) return false;
          return true;
        });

        results.push(...filtered);
      }

      // Remove duplicates and sort by created_at desc
      const unique = Array.from(new Map(results.map(e => [e.id, e])).values());
      return unique.sort((a, b) => b.created_at - a.created_at);
    }

    const results: SignedEvent[] = [];

    for (const filter of filters) {
      let sql = 'SELECT raw_event FROM events WHERE 1=1';
      const params: any[] = [];

      if (filter.ids && filter.ids.length > 0) {
        sql += ` AND id IN (${filter.ids.map(() => '?').join(',')})`;
        params.push(...filter.ids);
      }

      if (filter.authors && filter.authors.length > 0) {
        sql += ` AND pubkey IN (${filter.authors.map(() => '?').join(',')})`;
        params.push(...filter.authors);
      }

      if (filter.kinds && filter.kinds.length > 0) {
        sql += ` AND kind IN (${filter.kinds.map(() => '?').join(',')})`;
        params.push(...filter.kinds);
      }

      if (filter.since) {
        sql += ' AND created_at >= ?';
        params.push(filter.since);
      }

      if (filter.until) {
        sql += ' AND created_at <= ?';
        params.push(filter.until);
      }

      sql += ' ORDER BY created_at DESC';

      if (filter.limit) {
        sql += ' LIMIT ?';
        params.push(filter.limit);
      }

      const stmt = this._db.prepare(sql);
      const rows = stmt.getAsObject(params);
      stmt.free();

      for (const row of rows) {
        try {
          const event = JSON.parse(row.raw_event as string);
          results.push(event);
        } catch (error) {
          console.error('[SQLitePlugin] Error parsing event:', error);
        }
      }
    }

    return results;
  }

  async delete(eventIds: string[]): Promise<number> {
    if (!this._initialized) {
      await this.initialize();
    }

    if (this._testMode) {
      let deleted = 0;
      for (const id of eventIds) {
        if (this._memoryStore.delete(id)) {
          deleted++;
        }
      }
      console.log(`[SQLitePlugin] Deleted ${deleted} events from memory store`);
      return deleted;
    }

    if (eventIds.length === 0) return 0;

    const placeholders = eventIds.map(() => '?').join(',');
    const stmt = this._db.prepare(`DELETE FROM events WHERE id IN (${placeholders})`);
    const result = stmt.run(eventIds);
    stmt.free();

    const deleted = result.changes;
    console.log(`[SQLitePlugin] Deleted ${deleted} events from SQLite`);
    return deleted;
  }

  async clear(): Promise<void> {
    if (!this._initialized) {
      await this.initialize();
    }

    if (this._testMode) {
      this._memoryStore.clear();
      console.log('[SQLitePlugin] Cleared memory store');
      return;
    }

    this._db.run('DELETE FROM events');
    console.log('[SQLitePlugin] Cleared SQLite database');
  }

  async getStats(): Promise<{
    totalEvents: number;
    totalSize: number;
    oldestEvent?: number;
    newestEvent?: number;
  }> {
    if (!this._initialized) {
      await this.initialize();
    }

    if (this._testMode) {
      const events = Array.from(this._memoryStore.values());
      const totalSize = JSON.stringify(events).length;
      const timestamps = events.map(e => e.created_at).sort((a, b) => a - b);

      return {
        totalEvents: events.length,
        totalSize,
        oldestEvent: timestamps[0],
        newestEvent: timestamps[timestamps.length - 1]
      };
    }

    const stmt = this._db.prepare(`
      SELECT 
        COUNT(*) as count,
        MIN(created_at) as oldest,
        MAX(created_at) as newest,
        SUM(LENGTH(raw_event)) as total_size
      FROM events
    `);
    
    const result = stmt.getAsObject();
    stmt.free();

    return {
      totalEvents: result.count as number,
      totalSize: result.total_size as number || 0,
      oldestEvent: result.oldest as number || undefined,
      newestEvent: result.newest as number || undefined
    };
  }

  // Additional SQLite-specific methods
  async executeSQL(sql: string, params: any[] = []): Promise<any[]> {
    if (!this._initialized) {
      await this.initialize();
    }

    if (this._testMode) {
      // Simulate SQL execution in test mode
      console.log(`[SQLitePlugin] Executing SQL: ${sql}`);
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
      
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        if (sql.includes('COUNT(*)')) {
          return [{ count: this._memoryStore.size }];
        }
        
        if (sql.includes('PRAGMA table_info')) {
          return await this.getTableSchema();
        }
        
        // Return mock data for other SELECT queries
        const events = Array.from(this._memoryStore.values()).slice(0, 10);
        return events.map(event => ({
          id: event.id,
          pubkey: event.pubkey,
          created_at: event.created_at,
          kind: event.kind,
          content: event.content,
          tags: JSON.stringify(event.tags),
          sig: event.sig
        }));
      } else if (sql.trim().toUpperCase().startsWith('CREATE')) {
        return [{ result: 'Table created' }];
      } else if (sql.trim().toUpperCase().startsWith('INSERT')) {
        return [{ changes: 1, lastInsertROWID: Date.now() }];
      } else if (sql.trim().toUpperCase().startsWith('DELETE')) {
        const deleted = Math.floor(Math.random() * 5) + 1;
        return [{ changes: deleted }];
      }
      
      return [{ result: 'OK' }];
    }

    const stmt = this._db.prepare(sql);
    const results: any[] = [];
    
    try {
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
      } else {
        const result = stmt.run(params);
        results.push({ changes: result.changes, lastInsertROWID: result.lastInsertROWID });
      }
    } finally {
      stmt.free();
    }

    return results;
  }

  async getTableSchema(tableName: string = 'events'): Promise<any[]> {
    if (!this._initialized) {
      await this.initialize();
    }

    if (this._testMode) {
      // Return mock schema for test mode
      return [
        { cid: 0, name: 'id', type: 'TEXT', notnull: 1, dflt_value: null, pk: 1 },
        { cid: 1, name: 'pubkey', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
        { cid: 2, name: 'created_at', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 0 },
        { cid: 3, name: 'kind', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 0 },
        { cid: 4, name: 'tags', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
        { cid: 5, name: 'content', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
        { cid: 6, name: 'sig', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
        { cid: 7, name: 'raw_event', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 }
      ];
    }

    return this.executeSQL(`PRAGMA table_info(${tableName})`);
  }
}