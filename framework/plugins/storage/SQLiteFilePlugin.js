// framework/plugins/storage/SQLiteFilePlugin.js

import { StoragePlugin } from './StoragePlugin.js';

/**
 * Hybrid SQLite storage plugin with File System Access API
 * 
 * Features:
 * - Primary: File System Access API (browser-agnostic on same device)
 * - Fallback: localStorage (when API not available)
 * - Auto-detection of browser capabilities
 * 
 * Browser Support:
 * - Chrome/Edge 86+: Full support with File System API
 * - Firefox: Fallback to localStorage (experimental flag needed for API)
 * - Safari: Fallback to localStorage
 */
export class SQLiteFilePlugin extends StoragePlugin {
  constructor(config = {}) {
    super();
    this.name = 'sqlite-file';
    this._dbName = config.dbName || 'nostr_events.db';
    this._db = null;
    this._SQL = null;
    this._useFileSystem = false;
    this._dirHandle = null;
    this._fileHandle = null;
    this._storageMode = null; // 'filesystem' or 'localstorage'
  }

  /**
   * Initialize SQLite database with auto-detection
   */
  async initialize() {
    console.log('[SQLiteFilePlugin] Initializing...');
    
    try {
      // Load sql.js WASM
      console.log('[SQLiteFilePlugin] Loading sql.js WASM...');
      const initSqlJs = await import('https://esm.sh/sql.js@1.8.0/dist/sql-wasm.js');
      this._SQL = await initSqlJs.default({
        locateFile: file => `https://esm.sh/sql.js@1.8.0/dist/${file}`
      });
      
      // Detect File System Access API support
      if (this._isFileSystemSupported()) {
        console.log('[SQLiteFilePlugin] File System Access API available');
        await this._initializeWithFileSystem();
      } else {
        console.log('[SQLiteFilePlugin] File System Access API not available, using localStorage fallback');
        await this._initializeWithLocalStorage();
      }
      
      this._initialized = true;
      console.log(`[SQLiteFilePlugin] Initialized successfully (mode: ${this._storageMode})`);
    } catch (error) {
      console.error('[SQLiteFilePlugin] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check if File System Access API is supported
   * @private
   */
  _isFileSystemSupported() {
    return typeof window !== 'undefined' && 
           'showDirectoryPicker' in window &&
           'showSaveFilePicker' in window;
  }

  /**
   * Initialize with File System Access API
   * @private
   */
  async _initializeWithFileSystem() {
    try {
      // Check if we have a stored directory handle
      const storedHandleData = localStorage.getItem('sqlite_dir_handle');
      
      if (storedHandleData) {
        try {
          // Try to restore previous directory handle
          console.log('[SQLiteFilePlugin] Attempting to restore previous directory...');
          const handleData = JSON.parse(storedHandleData);
          
          // Request permission to access the directory
          if (handleData.name) {
            // Note: We can't actually restore the handle from localStorage
            // User needs to grant permission again
            console.log('[SQLiteFilePlugin] Previous directory found, requesting permission...');
          }
        } catch (error) {
          console.warn('[SQLiteFilePlugin] Failed to restore directory handle:', error);
        }
      }
      
      // Ask user to select directory
      console.log('[SQLiteFilePlugin] Requesting directory access...');
      this._dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });
      
      // Store directory name for reference
      localStorage.setItem('sqlite_dir_handle', JSON.stringify({
        name: this._dirHandle.name
      }));
      
      // Try to open existing database file
      let fileData = null;
      try {
        this._fileHandle = await this._dirHandle.getFileHandle(this._dbName, { create: false });
        const file = await this._fileHandle.getFile();
        const arrayBuffer = await file.arrayBuffer();
        fileData = new Uint8Array(arrayBuffer);
        console.log('[SQLiteFilePlugin] Loaded existing database file');
      } catch (error) {
        console.log('[SQLiteFilePlugin] No existing database file, creating new one');
      }
      
      // Create or load database
      if (fileData) {
        this._db = new this._SQL.Database(fileData);
      } else {
        this._db = new this._SQL.Database();
        this._createTables();
      }
      
      // Save to ensure file exists
      await this._saveToFile();
      
      this._storageMode = 'filesystem';
      this._useFileSystem = true;
      
      console.log('[SQLiteFilePlugin] Using File System API');
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('[SQLiteFilePlugin] User cancelled directory selection, falling back to localStorage');
        await this._initializeWithLocalStorage();
      } else {
        throw error;
      }
    }
  }

  /**
   * Initialize with localStorage fallback
   * @private
   */
  async _initializeWithLocalStorage() {
    const savedDb = localStorage.getItem(this._dbName);
    if (savedDb) {
      console.log('[SQLiteFilePlugin] Loading existing database from localStorage...');
      const buffer = this._base64ToArrayBuffer(savedDb);
      this._db = new this._SQL.Database(new Uint8Array(buffer));
    } else {
      console.log('[SQLiteFilePlugin] Creating new database in localStorage...');
      this._db = new this._SQL.Database();
      this._createTables();
    }
    
    this._storageMode = 'localstorage';
    this._useFileSystem = false;
    
    // Save database
    await this._saveToStorage();
    
    console.log('[SQLiteFilePlugin] Using localStorage fallback');
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
    
    // Tags table
    this._db.run(`
      CREATE TABLE IF NOT EXISTS tags (
        event_id TEXT NOT NULL,
        tag_name TEXT NOT NULL,
        tag_value TEXT,
        tag_index INTEGER NOT NULL,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      )
    `);
    
    // Create indexes
    this._db.run('CREATE INDEX IF NOT EXISTS idx_events_kind ON events(kind)');
    this._db.run('CREATE INDEX IF NOT EXISTS idx_events_pubkey ON events(pubkey)');
    this._db.run('CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at)');
    this._db.run('CREATE INDEX IF NOT EXISTS idx_tags_event_id ON tags(event_id)');
    this._db.run('CREATE INDEX IF NOT EXISTS idx_tags_name_value ON tags(tag_name, tag_value)');
    
    console.log('[SQLiteFilePlugin] Tables created');
  }

  /**
   * Save database to appropriate storage
   * @private
   */
  async _saveToStorage() {
    if (this._useFileSystem) {
      await this._saveToFile();
    } else {
      await this._saveToLocalStorage();
    }
  }

  /**
   * Save database to File System
   * @private
   */
  async _saveToFile() {
    try {
      if (!this._dirHandle) {
        console.warn('[SQLiteFilePlugin] No directory handle available');
        return;
      }
      
      // Get or create file handle
      if (!this._fileHandle) {
        this._fileHandle = await this._dirHandle.getFileHandle(this._dbName, { create: true });
      }
      
      // Create writable stream
      const writable = await this._fileHandle.createWritable();
      
      // Export database
      const data = this._db.export();
      
      // Write to file
      await writable.write(data);
      await writable.close();
      
      console.log('[SQLiteFilePlugin] Database saved to file');
    } catch (error) {
      console.error('[SQLiteFilePlugin] Failed to save to file:', error);
      // Fallback to localStorage
      await this._saveToLocalStorage();
    }
  }

  /**
   * Save database to localStorage
   * @private
   */
  async _saveToLocalStorage() {
    try {
      const data = this._db.export();
      const base64 = this._arrayBufferToBase64(data);
      localStorage.setItem(this._dbName, base64);
      console.log('[SQLiteFilePlugin] Database saved to localStorage');
    } catch (error) {
      console.error('[SQLiteFilePlugin] Failed to save to localStorage:', error);
    }
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
          
          // Delete old tags
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
          console.error('[SQLiteFilePlugin] Failed to save event:', event.id, error);
        }
      }
      
      this._db.run('COMMIT');
      await this._saveToStorage();
      
      console.log(`[SQLiteFilePlugin] Saved ${saved}/${eventArray.length} events (${this._storageMode})`);
    } catch (error) {
      this._db.run('ROLLBACK');
      console.error('[SQLiteFilePlugin] Transaction failed:', error);
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
      const result = this._db.exec('SELECT event_json FROM events');
      if (result.length > 0) {
        for (const row of result[0].values) {
          events.push(JSON.parse(row[0]));
        }
      }
      return events;
    }
    
    for (const filter of allFilters) {
      const sql = this._buildQuerySQL(filter);
      const result = this._db.exec(sql.query, sql.params);
      
      if (result.length > 0) {
        for (const row of result[0].values) {
          const event = JSON.parse(row[0]);
          if (!events.find(e => e.id === event.id)) {
            events.push(event);
          }
        }
      }
    }
    
    console.log(`[SQLiteFilePlugin] Query returned ${events.length} events`);
    return events;
  }

  /**
   * Build SQL query from Nostr filter
   * @private
   */
  _buildQuerySQL(filter) {
    const conditions = [];
    const params = [];
    
    if (filter.ids && filter.ids.length > 0) {
      const placeholders = filter.ids.map(() => '?').join(',');
      conditions.push(`id IN (${placeholders})`);
      params.push(...filter.ids);
    }
    
    if (filter.authors && filter.authors.length > 0) {
      const placeholders = filter.authors.map(() => '?').join(',');
      conditions.push(`pubkey IN (${placeholders})`);
      params.push(...filter.authors);
    }
    
    if (filter.kinds && filter.kinds.length > 0) {
      const placeholders = filter.kinds.map(() => '?').join(',');
      conditions.push(`kind IN (${placeholders})`);
      params.push(...filter.kinds);
    }
    
    if (filter.since) {
      conditions.push('created_at >= ?');
      params.push(filter.since);
    }
    
    if (filter.until) {
      conditions.push('created_at <= ?');
      params.push(filter.until);
    }
    
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
    
    query += ' ORDER BY created_at DESC';
    
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
      await this._saveToStorage();
      
      console.log(`[SQLiteFilePlugin] Deleted ${deleted}/${ids.length} events`);
    } catch (error) {
      this._db.run('ROLLBACK');
      console.error('[SQLiteFilePlugin] Delete failed:', error);
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
    await this._saveToStorage();
    console.log('[SQLiteFilePlugin] Cleared all events');
  }

  /**
   * Get storage statistics
   */
  async getStats() {
    const countResult = this._db.exec('SELECT COUNT(*) as count FROM events');
    const eventCount = countResult.length > 0 ? countResult[0].values[0][0] : 0;
    
    const dbData = this._db.export();
    const sizeBytes = dbData.byteLength;
    
    return {
      eventCount: eventCount,
      approximateSizeBytes: sizeBytes,
      approximateSizeKB: Math.round(sizeBytes / 1024),
      approximateSizeMB: (sizeBytes / (1024 * 1024)).toFixed(2),
      storageMode: this._storageMode,
      useFileSystem: this._useFileSystem
    };
  }

  /**
   * Get current storage mode
   */
  getStorageMode() {
    return this._storageMode;
  }

  /**
   * Check if using File System API
   */
  isUsingFileSystem() {
    return this._useFileSystem;
  }

  /**
   * Request directory change (only for filesystem mode)
   */
  async changeDirectory() {
    if (!this._useFileSystem) {
      throw new Error('Not in filesystem mode');
    }
    
    console.log('[SQLiteFilePlugin] Requesting new directory...');
    const newDirHandle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents'
    });
    
    this._dirHandle = newDirHandle;
    this._fileHandle = null;
    
    localStorage.setItem('sqlite_dir_handle', JSON.stringify({
      name: newDirHandle.name
    }));
    
    await this._saveToFile();
    console.log('[SQLiteFilePlugin] Directory changed');
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
      await this._saveToStorage();
      this._db.close();
      this._db = null;
      console.log('[SQLiteFilePlugin] Database closed');
    }
  }
}