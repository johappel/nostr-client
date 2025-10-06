// framework/config.ts

import type { FrameworkConfig } from './types/index.js';

/**
 * Zentrale Konfiguration für das Nostr Framework
 * Diese Werte können vom User überschrieben werden, indem sie ein globales
 * window.NostrConfig Objekt vor dem Laden des Frameworks definieren.
 *
 * Beispiel:
 * <script>
 *   window.NostrConfig = {
 *     relays: ['wss://mein-relay.com', ...],
 *     nostrToolsBaseUrl: 'https://cdn.example.com/nostr-tools@2.8.1'
 *   };
 * </script>
 * <script type="module" src="framework/index.js"></script>
 */

// Default-Werte mit Typisierung
const defaults: Required<FrameworkConfig> = {
  /**
   * Standard-Relays für Metadaten-Abruf und allgemeine Operationen
   */
  relays: [
    'wss://relay.damus.io',
    'wss://relay.snort.social',
    'wss://nostr.wine',
    'wss://nos.lol',
    'wss://relay.nostr.band'
  ],

  /**
   * Base URL für nostr-tools CDN
   * Kann auf einen anderen CDN oder lokalen Server zeigen
   */
  nostrToolsBaseUrl: 'https://esm.sh/nostr-tools@2.8.1',

  /**
   * Cache-Dauer für Profil-Metadaten in Millisekunden
   * Standard: 1 Stunde (3600000 ms)
   */
  metadataCacheDuration: 3600000,

  /**
   * Timeout für Relay-Operationen in Millisekunden
   */
  relayTimeout: 5000,

  /**
   * Maximale Anzahl von Events im Event-Cache
   */
  maxCacheSize: 1000,

  /**
   * Debug-Modus aktivieren
   */
  debug: false,

  /**
   * Standard-Templates aktivieren
   */
  standardTemplates: true,

  /**
   * Storage-Konfiguration
   */
  storage: {
    type: 'localStorage'
  }
};

// Type-safe merge mit User-Config (falls vorhanden)
const userConfig: Partial<FrameworkConfig> =
  typeof window !== 'undefined' ? (window as any).NostrConfig || {} : {};

/**
 * Exportierte Config mit merged Werten und Typisierung
 */
export const Config: FrameworkConfig = {
  ...defaults,
  ...userConfig,

  // Spezielle Behandlung für Arrays: concat statt override
  relays: [
    ...defaults.relays!,
    ...(userConfig.relays ?? [])
  ].filter((relay, index, self) => self.indexOf(relay) === index) // Deduplizierung
};

// Für Browser-Umgebungen: Config auch als window.NostrFrameworkConfig verfügbar machen
if (typeof window !== 'undefined') {
  (window as any).NostrFrameworkConfig = Config;
}

// Logging der aktiven Config (nur bei Entwicklung)
if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
  console.log('[Config] Active configuration:', Config);
}

export default Config;