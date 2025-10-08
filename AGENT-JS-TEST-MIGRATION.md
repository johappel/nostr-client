# Test Agent: JavaScript Test-Suite Migration

## Aufgabe
Migriere alle JavaScript-Test-Files (.test.js) zu TypeScript und stelle Test-Kompatibilität sicher.

## Identifizierte Test-Files

### Core Manager Tests:
- `framework/core/EventBus.test.js` → `EventBus.test.ts`
- `framework/core/EventManager.test.js` → `EventManager.test.ts`  
- `framework/core/IdentityManager.test.js` → `IdentityManager.test.ts`
- `framework/core/RelayManager.test.js` → `RelayManager.test.ts`
- `framework/core/SignerManager.test.js` → `SignerManager.test.ts`
- `framework/core/StorageManager.test.js` → `StorageManager.test.ts`

## Migration-Strategie

### Phase 1: TypeScript-Konvertierung
```typescript
// ALT: EventBus.test.js
import { EventBus } from './EventBus.js';

export function runEventBusTests() {
  // Tests...
}

// NEU: EventBus.test.ts
import { EventBus } from './EventBus.js';
import type { EventBusListener } from '../types/index.js';

interface TestResult {
  passed: number;
  failed: number;
  tests: Array<{
    name: string;
    status: 'PASS' | 'FAIL';
    error?: Error;
  }>;
}

export function runEventBusTests(): TestResult {
  // Typisierte Tests...
}
```

### Phase 2: Test-Framework-Integration
```typescript
// Test-Utilities mit TypeScript
export class TestFramework {
  private results: TestResult = {
    passed: 0,
    failed: 0,
    tests: []
  };

  test(name: string, fn: () => void | Promise<void>): void {
    try {
      const result = fn();
      if (result instanceof Promise) {
        result.then(() => this.markPassed(name))
              .catch(error => this.markFailed(name, error));
      } else {
        this.markPassed(name);
      }
    } catch (error) {
      this.markFailed(name, error as Error);
    }
  }

  private markPassed(name: string): void {
    this.results.passed++;
    this.results.tests.push({ name, status: 'PASS' });
    console.log(`✓ ${name}`);
  }

  private markFailed(name: string, error: Error): void {
    this.results.failed++;
    this.results.tests.push({ name, status: 'FAIL', error });
    console.error(`✗ ${name}:`, error.message);
  }

  getResults(): TestResult {
    return { ...this.results };
  }
}
```

### Phase 3: Manager-spezifische Tests

#### EventBus Tests
- Event-Listener-Registration
- Event-Emission mit Daten
- Listener-Deregistration
- Error-Handling

#### EventManager Tests  
- Event-Publishing
- Event-Subscription
- Event-Filtering
- Manager-Integration

#### IdentityManager Tests
- Plugin-Registration
- Login/Logout-Workflows
- Identity-Caching
- Multi-Provider-Support

#### RelayManager Tests
- Relay-Connection
- Event-Publishing
- Event-Subscription
- Connection-Management

#### SignerManager Tests
- Signer-Plugin-Integration
- Event-Signing
- Encryption/Decryption
- Plugin-Switching

#### StorageManager Tests
- Storage-Plugin-Registration
- Data-Persistence
- Query-Operations
- Plugin-Fallbacks

## TypeScript-spezifische Verbesserungen

### 1. Type-Safe Test-Assertions
```typescript
function assertType<T>(value: unknown, type: string): asserts value is T {
  if (typeof value !== type) {
    throw new Error(`Expected ${type}, got ${typeof value}`);
  }
}

// Usage in tests
test('EventBus emits correct data type', () => {
  const bus = new EventBus();
  let received: unknown;
  bus.on<{ foo: string }>('test', (data) => received = data);
  bus.emit('test', { foo: 'bar' });
  assertType<{ foo: string }>(received, 'object');
});
```

### 2. Mock-Implementierungen mit Types
```typescript
class MockStoragePlugin implements StoragePlugin {
  async initialize(): Promise<void> {
    // Mock implementation
  }
  
  async store(key: string, data: any): Promise<void> {
    // Mock implementation
  }
  
  // ... weitere typisierte Mock-Methoden
}
```

### 3. Test-Coverage für Plugin-Interfaces
```typescript
// Teste dass alle Plugins korrekte Interfaces implementieren
test('All auth plugins implement AuthPlugin interface', () => {
  const plugins = [NsecPlugin, Nip07Plugin, Nip46Plugin];
  plugins.forEach(PluginClass => {
    const plugin = new PluginClass();
    
    // Teste required methods
    assertType<Function>(plugin.initialize, 'function');
    assertType<Function>(plugin.login, 'function');
    assertType<Function>(plugin.logout, 'function');
    assertType<Function>(plugin.getSigner, 'function');
  });
});
```

## Build-Integration

### TypeScript-Test-Compilation
```json
// tsconfig.test.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["node"],
    "moduleResolution": "node"
  },
  "include": [
    "core/**/*.test.ts",
    "plugins/**/*.test.ts"
  ]
}
```

### NPM-Scripts
```json
{
  "scripts": {
    "test:compile": "tsc -p tsconfig.test.json",
    "test:run": "npm run test:compile && node dist/core/EventBus.test.js",
    "test:all": "npm run build && npm run test:compile && npm run test:run"
  }
}
```

## Erfolgs-Validierung

### ✅ Erfolgskriterien:
1. Alle .test.js zu .test.ts konvertiert
2. TypeScript-Compilation ohne Fehler
3. Alle bestehenden Tests bestehen weiterhin
4. Neue Type-Safety in Tests
5. Mock-Implementierungen typisiert
6. Test-Framework typisiert

### Test-Kommandos:
```bash
npm run test:all
# Oder einzeln:
npm run test:compile
npm run test:run
```

## Priorität: MITTEL
Tests sind wichtig für Code-Qualität, aber HTML-Tests haben Vorrang.

## Deliverables:
1. 6 konvertierte .test.ts Files
2. Typisiertes TestFramework
3. Updated package.json Scripts
4. Test-Documentation