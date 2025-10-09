// framework/types/index.ts

/**
 * Grundlegende Nostr-Typen
 */
export interface UnsignedEvent {
  kind: number;
  content: string;
  tags: string[][];
  created_at: number;
  pubkey?: string;
}

export interface SignedEvent extends UnsignedEvent {
  id: string;
  sig: string;
  pubkey: string;
}

export interface Identity {
  pubkey: string;
  npub: string;
  provider: string;
  displayName?: string | null;
  metadata?: NostrProfile;
  capabilities: IdentityCapabilities;
}

export interface NostrProfile {
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  lud16?: string;
  nip05?: string;
  [key: string]: any;
}

export interface IdentityCapabilities {
  canSign: boolean;
  canEncrypt: boolean;
  canDecrypt: boolean;
}

/**
 * Framework-Konfiguration
 */
export interface FrameworkConfig {
  relays?: string[];
  nostrToolsBaseUrl?: string;
  metadataCacheDuration?: number;
  relayTimeout?: number;
  maxCacheSize?: number;
  debug?: boolean;
  standardTemplates?: boolean;
  storage?: StorageConfig;
}

export interface ConfigType {
  relays: string[];
  nostrToolsBaseUrl: string;
  metadataCacheDuration: number;
  relayTimeout: number;
  maxCacheSize: number;
}

export interface StorageConfig {
  type: 'localStorage' | 'indexedDB' | 'sqlite';
  config?: any;
}

/**
 * EventBus-Typen
 */
export type EventCallback<T = any> = (data: T) => void;
export type EventUnsubscriber = () => void;

/**
 * Plugin-Typen
 */
export interface PluginConfig {
  [key: string]: any;
}

export interface AuthCredentials {
  [key: string]: any;
}

/**
 * Signer-Typen
 */
export interface SignerCapabilities {
  canSign: boolean;
  canEncrypt: boolean;
  canDecrypt: boolean;
  hasNip04: boolean;
  hasNip44: boolean;
}

export interface SignerPlugin {
  type: string;
  getPublicKey(): Promise<string>;
  signEvent(event: UnsignedEvent): Promise<SignedEvent>;
  nip04Encrypt?(recipientPubkey: string, plaintext: string): Promise<string>;
  nip04Decrypt?(senderPubkey: string, ciphertext: string): Promise<string>;
  nip44Encrypt?(recipientPubkey: string, plaintext: string): Promise<string>;
  nip44Decrypt?(senderPubkey: string, ciphertext: string): Promise<string>;
  getCapabilities(): SignerCapabilities;
}

/**
 * Template-Typen
 */
export interface EventTemplate {
  kind: number;
  nip: string;
  validate(data: any): boolean;
  build(data: any): UnsignedEvent;
  parse(event: SignedEvent): any;
  getSchema(): TemplateSchema;
}

export interface TemplateSchema {
  kind: number;
  nip: string;
  required: string[];
  properties: { [key: string]: any };
}

/**
 * Storage-Typen
 */
export interface StorageAdapter {
  initialize(config?: any): Promise<void>;
  store(key: string, data: any): Promise<void>;
  retrieve(key: string): Promise<any>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

export interface StoragePlugin {
  name: string;
  isInitialized(): boolean;
  initialize(): Promise<void>;
  save(events: SignedEvent[]): Promise<number>;
  query(filters: any[]): Promise<SignedEvent[]>;
  delete(eventIds: string[]): Promise<number>;
  clear(): Promise<void>;
  getStats(): Promise<StorageStats>;
}

export interface StorageStats {
  totalEvents: number;
  totalSize: number;
  lastSync?: number;
}

/**
 * Relay-Typen
 */
export interface RelayConfig {
  relays: string[];
  timeout?: number;
}

export interface RelayConnection {
  url: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  subscriptions: Map<string, any>;
}

export interface PublishResult {
  relay: string;
  success: boolean;
  ok?: boolean;
  error?: Error;
}

export interface Subscription {
  id: string;
  close(): void;
  _internal?: any;
}

export interface QueryOptions {
  relays?: string[];
  timeout?: number;
  limit?: number | null;
}

export interface SubscriptionOptions {
  relays?: string[];
  id?: string;
}

export interface RelayStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastSeen: number | null;
  error?: string | null;
}

/**
 * Error-Typen
 */
export interface FrameworkError extends Error {
  code: string;
  context?: any;
}

/**
 * Event-Typen für das Framework
 */
export interface FrameworkEvents {
  'framework:initialized': {};
  'framework:destroyed': {};
  'identity:changed': Identity | null;
  'identity:login': { provider: string; identity: Identity };
  'identity:logout': { identity: Identity };
  'identity:error': { provider: string; error: Error };
  'template:registered': { name: string; template: EventTemplate };
  'template:unregistered': { name: string };
  'template:built': { templateName: string; event: UnsignedEvent };
  'template:parsed': { templateName: string; event: SignedEvent; parsed: any };
  'template:error': { templateName: string; error: Error };
  'error': { event: string; error: Error };
}

/**
 * Utility-Typen
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type EventHandler<T = any> = (data: T) => void | Promise<void>;