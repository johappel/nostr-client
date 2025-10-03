// framework/plugins/storage/SQLitePlugin.js

import { StoragePlugin } from './StoragePlugin.js';

/**
 * SQLite-based storage plugin using sql.js (WASM)
 * Provides much larger storage capacity than localStorage
 */
export class SQLitePlugin extends StoragePlugin {
  constructor(config = {}) {
    super();
    this.name = 'sqlite';
    this._dbName = config.dbName || 'nostr_events.db';
    this._db = null;
    this._SQL = null;
  }

  /**
   * Initialize SQLite database
   */
  async initialize() {
    console.log('[SQLitePlugin] Initializing...');
    
    try {
      // Load sql.js WASM
      console.log('[SQLitePlugin] Loading sql.js WASM...');
      const initSqlJs = await import('https://esm.sh/sql.js@1.8.0/dist/sql-wasm.js');
      this._SQL = await initSqlJs.default({
        locateFile: file => `https://esm.sh/sql.js@1.8.0/dist/${file}`
      });
      
      // Try to load existing database from localStorage
      const savedDb = localStorage.getItem(this._dbName);
      if (savedDb) {
        console.log('[SQLitePlugin] Loading existing database...');
        const buffer = this._base64ToArrayBuffer(savedDb);
        this._db = new this._SQL.Database(new Uint8Array(buffer));
      } else {
        console.log('[SQLitePlugin] Creating new database...');
        this._db = new this._SQL.Database();
      }
      
      // Create tables if they don't exist
      this._createTables();
      
      // Save database
      this._saveDatabase();
      
      this._initialized = true;
      console.log('[SQLitePlugin] Initialized successfully');
    } catch (error) {
      console.error('[SQLitePlugin] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create database tables
   * @private
   */
  _createTables() {
    // Events table
    this._db.run(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        pubkey TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        kind INTEGER NOT NULL,
        content TEXT,
        sig TEXT,
        event_json TEXT NOT NULL
      )
    `);
    
    // Tags table for efficient tag queries
    this._db.run(`
      CREATE TABLE IF NOT EXISTS tags (
        event_id TEXT NOT NULL,
        tag_name TEXT NOT NULL,
        tag_value TEXT,
        tag_index INTEGER NOT NULL,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      )
    `);
    
    // Create indexes for common queries
    this._db.run('CREATE INDEX IF NOT EXISTS idx_events_kind ON events(kind)');
    this._db.run('CREATE INDEX IF NOT EXISTS idx_events_pubkey ON events(pubkey)');
    this._db.run('CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at)');
    this._db.run('CREATE INDEX IF NOT EXISTS idx_tags_event_id ON tags(event_id)');
    this._db.run('CREATE INDEX IF NOT EXISTS idx_tags_name_value ON tags(tag_name, tag_value)');
    
    console.log('[SQLitePlugin] Tables created');
  }

  /**
   * Save events to database
   */
  async save(events) {
    const eventArray = Array.isArray(events) ? events : [events];
    let saved = 0;

    this._db.run('BEGIN TRANSACTION');
    
    try {
      for (const event of eventArray) {
        try {
          // Insert or replace event
          this._db.run(
            `INSERT OR REPLACE INTO events (id, pubkey, created_at, kind, content, sig, event_json)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              event.id,
              event.pubkey,
              event.created_at,
              event.kind,
              event.content || '',
              event.sig || '',
              JSON.stringify(event)
            ]
          );
          
          // Delete old tags for this event
          this._db.run('DELETE FROM tags WHERE event_id = ?', [event.id]);
          
          // Insert tags
          if (event.tags && Array.isArray(event.tags)) {
            for (let i = 0; i < event.tags.length; i++) {
              const tag = event.tags[i];
              if (Array.isArray(tag) && tag.length > 0) {
                this._db.run(
                  'INSERT INTO tags (event_id, tag_name, tag_value, tag_index) VALUES (?, ?, ?, ?)',
                  [event.id, tag[0], tag[1] || '', i]
                );
              }
            }
          }
          
          saved++;
        } catch (error) {
          console.error('[SQLitePlugin] Failed to save event:', event.id, error);
        }
      }
      
      this._db.run('COMMIT');
      this._saveDatabase();
      
      console.log(`[SQLitePlugin] Saved ${saved}/${eventArray.length} events`);
    } catch (error) {
      this._db.run('ROLLBACK');
      console.error('[SQLitePlugin] Transaction failed:', error);
      throw error;
    }
    
    return saved;
  }

  /**
   * Query events from database
   */
  async query(filters) {
    const events = [];
    const allFilters = Array.isArray(filters) ? filters : [filters];
    
    if (allFilters.length === 0) {
      // No filters, return all events
      const result = this._db.exec('SELECT event_json FROM events');
      if (result.length > 0) {
        for (const row of result[0].values) {
          events.push(JSON.parse(row[0]));
        }
      }
      return events;
    }
    
    // Build query for each filter
    for (const filter of allFilters) {
      const sql = this._buildQuerySQL(filter);
      const result = this._db.exec(sql.query, sql.params);
      
      if (result.length > 0) {
        for (const row of result[0].values) {
          const event = JSON.parse(row[0]);
          // Avoid duplicates
          if (!events.find(e => e.id === event.id)) {
            events.push(event);
          }
        }
      }
    }
    
    console.log(`[SQLitePlugin] Query returned ${events.length} events`);
    return events;
  }

  /**
   * Build SQL query from Nostr filter
   * @private
   */
  _buildQuerySQL(filter) {
    const conditions = [];
    const params = [];
    
    // IDs filter
    if (filter.ids && filter.ids.length > 0) {
      const placeholders = filter.ids.map(() => '?').join(',');
      conditions.push(`id IN (${placeholders})`);
      params.push(...filter.ids);
    }
    
    // Authors filter
    if (filter.authors && filter.authors.length > 0) {
      const placeholders = filter.authors.map(() => '?').join(',');
      conditions.push(`pubkey IN (${placeholders})`);
      params.push(...filter.authors);
    }
    
    // Kinds filter
    if (filter.kinds && filter.kinds.length > 0) {
      const placeholders = filter.kinds.map(() => '?').join(',');
      conditions.push(`kind IN (${placeholders})`);
      params.push(...filter.kinds);
    }
    
    // Since filter
    if (filter.since) {
      conditions.push('created_at >= ?');
      params.push(filter.since);
    }
    
    // Until filter
    if (filter.until) {
      conditions.push('created_at <= ?');
      params.push(filter.until);
    }
    
    // Tag filters (#e, #p, etc.)
    for (const key in filter) {
      if (key.startsWith('#') && Array.isArray(filter[key])) {
        const tagName = key.substring(1);
        const placeholders = filter[key].map(() => '?').join(',');
        conditions.push(`id IN (SELECT event_id FROM tags WHERE tag_name = ? AND tag_value IN (${placeholders}))`);
        params.push(tagName, ...filter[key]);
      }
    }
    
    let query = 'SELECT event_json FROM events';
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    // Order by created_at DESC
    query += ' ORDER BY created_at DESC';
    
    // Limit
    if (filter.limit) {
      query += ' LIMIT ?';
      params.push(filter.limit);
    }
    
    return { query, params };
  }

  /**
   * Delete events from database
   */
  async delete(eventIds) {
    const ids = Array.isArray(eventIds) ? eventIds : [eventIds];
    let deleted = 0;
    
    this._db.run('BEGIN TRANSACTION');
    
    try {
      for (const eventId of ids) {
        const result = this._db.run('DELETE FROM events WHERE id = ?', [eventId]);
        if (result) deleted++;
      }
      
      this._db.run('COMMIT');
      this._saveDatabase();
      
      console.log(`[SQLitePlugin] Deleted ${deleted}/${ids.length} events`);
    } catch (error) {
      this._db.run('ROLLBACK');
      console.error('[SQLitePlugin] Delete failed:', error);
      throw error;
    }
    
    return deleted;
  }

  /**
   * Clear all events
   */
  async clear() {
    this._db.run('DELETE FROM events');
    this._db.run('DELETE FROM tags');
    this._saveDatabase();
    console.log('[SQLitePlugin] Cleared all events');
  }

  /**
   * Get storage statistics
   */
  async getStats() {
    const countResult = this._db.exec('SELECT COUNT(*) as count FROM events');
    const eventCount = countResult.length > 0 ? countResult[0].values[0][0] : 0;
    
    // Get database size
    const dbData = this._db.export();
    const sizeBytes = dbData.byteLength;
    
    return {
      eventCount: eventCount,
      approximateSizeBytes: sizeBytes,
      approximateSizeKB: Math.round(sizeBytes / 1024),
      approximateSizeMB: (sizeBytes / (1024 * 1024)).toFixed(2)
    };
  }

  /**
   * Save database to localStorage
   * @private
   */
  _saveDatabase() {
    try {
      const data = this._db.export();
      const base64 = this._arrayBufferToBase64(data);
      localStorage.setItem(this._dbName, base64);
    } catch (error) {
      console.error('[SQLitePlugin] Failed to save database:', error);
    }
  }

  /**
   * Convert ArrayBuffer to base64
   * @private
   */
  _arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 to ArrayBuffer
   * @private
   */
  _base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Close database and cleanup
   */
  async close() {
    if (this._db) {
      this._saveDatabase();
      this._db.close();
      this._db = null;
      console.log('[SQLitePlugin] Database closed');
    }
  }
}