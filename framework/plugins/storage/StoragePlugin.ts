// framework/plugins/storage/StoragePlugin.ts

import type { SignedEvent } from '../../types/index.js';

export interface StorageFilter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  since?: number;
  until?: number;
  limit?: number;
  [key: string]: any;
}

/**
 * Base interface for storage plugins
 */
export abstract class StoragePlugin {
  protected name: string = 'base';
  protected _initialized: boolean = false;

  constructor() {}

  /**
   * Initialize storage
   */
  abstract initialize(): Promise<void>;

  /**
   * Save events
   */
  abstract save(events: SignedEvent[]): Promise<number>;

  /**
   * Query events
   */
  abstract query(filters: StorageFilter[]): Promise<SignedEvent[]>;

  /**
   * Delete events
   */
  abstract delete(eventIds: string[]): Promise<number>;

  /**
   * Clear all events
   */
  abstract clear(): Promise<void>;

  /**
   * Get storage statistics
   */
  abstract getStats(): Promise<{
    totalEvents: number;
    totalSize: number;
    oldestEvent?: number;
    newestEvent?: number;
  }>;

  /**
   * Check if storage is initialized
   */
  isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Get storage name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Mark as initialized
   */
  protected _markInitialized(): void {
    this._initialized = true;
  }
}