# Nostr Framework
Ein modulares, erweiterbares Framework für Nostr-Anwendungen in Vanilla JavaScript, das verschiedene Authentifizierungsmethoden, Event-Verwaltung und Relay-Kommunikation abstrahiert.

## Features

1. **Authentifizierungs-Agnostisch**: Unterstützung mehrerer Auth-Methoden (NIP-07, NIP-46, nsec, externe APIs)
2. **Event-Driven Architecture**: Reaktive Event-Verarbeitung mit Publisher/Subscriber-Pattern
3. **Offline-First**: SQLite-basierte lokale Persistenz mit Sync-Mechanismen
4. **Plugin-basiert**: Erweiterbar durch Auth-, Signer- und Storage-Plugins
5. **Type-Safe**: JSDoc-basierte Typsicherheit ohne TypeScript-Kompilierung
6. **Framework-agnostisch**: Vanilla JS, einsetzbar in jedem Frontend-Stack