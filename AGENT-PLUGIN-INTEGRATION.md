# Test Agent: Plugin Integration Verification

## Aufgabe
Stelle sicher, dass alle TypeScript-Plugins korrekt in das Framework integriert sind und alle Plugin-Manager funktionieren.

## Integration-Matrix

### Authentication Plugins
| Plugin | Status | Integration Test | Signer Test | Browser Test |
|--------|--------|------------------|-------------|--------------|
| NsecPlugin.ts | ✅ | ⏳ | ⏳ | ⏳ |
| Nip07Plugin.ts | ✅ | ⏳ | ⏳ | ⏳ |
| Nip46Plugin.ts | ✅ | ⏳ | ⏳ | ⏳ |

### Signer Plugins
| Plugin | Status | Integration Test | Sign Test | Crypto Test |
|--------|--------|------------------|-----------|-------------|
| SignerPlugin.ts (Base) | ✅ | ⏳ | N/A | N/A |
| MockSigner.ts | ✅ | ⏳ | ⏳ | ⏳ |

### Storage Plugins  
| Plugin | Status | Integration Test | Store Test | Query Test |
|--------|--------|------------------|------------|------------|
| StoragePlugin.ts (Base) | ✅ | ⏳ | N/A | N/A |
| LocalStoragePlugin.ts | ✅ | ⏳ | ⏳ | ⏳ |
| SQLitePlugin.ts | ✅ (Stub) | ⏳ | ⏳ | ⏳ |
| SQLiteFilePlugin.ts | ✅ (Stub) | ⏳ | ⏳ | ⏳ |

## Integration-Tests

### Phase 1: Plugin-Registration Tests
```typescript
// Test: IdentityManager Plugin Registration
test('IdentityManager registers all auth plugins', async () => {
  const identityManager = new IdentityManager();
  
  // Register plugins
  identityManager.registerPlugin(new NsecPlugin());
  identityManager.registerPlugin(new Nip07Plugin());
  identityManager.registerPlugin(new Nip46Plugin());
  
  const plugins = identityManager.getAvailablePlugins();
  assert(plugins.length === 3);
  assert(plugins.some(p => p.getName() === 'nsec'));
  assert(plugins.some(p => p.getName() === 'nip07'));
  assert(plugins.some(p => p.getName() === 'nip46'));
});

// Test: SignerManager Plugin Registration
test('SignerManager registers signer plugins', async () => {
  const signerManager = new SignerManager();
  signerManager.registerPlugin(new MockSigner());
  
  const plugins = signerManager.getAvailablePlugins();
  assert(plugins.length >= 1);
  assert(plugins.some(p => p.getName() === 'mock'));
});

// Test: StorageManager Plugin Registration  
test('StorageManager registers storage plugins', async () => {
  const storageManager = new StorageManager();
  storageManager.registerPlugin(new LocalStoragePlugin());
  
  const plugins = storageManager.getAvailablePlugins();
  assert(plugins.length >= 1);
  assert(plugins.some(p => p.getName() === 'localStorage'));
});
```

### Phase 2: Plugin-Workflow Tests
```typescript
// Test: Complete Auth Workflow
test('Complete authentication workflow with NsecPlugin', async () => {
  const identityManager = new IdentityManager();
  const nsecPlugin = new NsecPlugin();
  
  identityManager.registerPlugin(nsecPlugin);
  await nsecPlugin.initialize();
  
  // Test login
  const identity = await nsecPlugin.login({ 
    nsec: 'nsec1test...' // Test-NSEC
  });
  
  assert(identity.pubkey);
  assert(identity.npub);
  assert(identity.provider === 'nsec');
  
  // Test signer
  const signer = nsecPlugin.getSigner();
  assert(signer.type === 'nsec');
  
  const testEvent = {
    kind: 1,
    content: 'Test message',
    tags: [],
    created_at: Math.floor(Date.now() / 1000)
  };
  
  const signedEvent = await signer.signEvent(testEvent);
  assert(signedEvent.id);
  assert(signedEvent.sig);
  assert(signedEvent.pubkey === identity.pubkey);
});

// Test: Storage Workflow
test('Complete storage workflow with LocalStoragePlugin', async () => {
  const storageManager = new StorageManager();
  const localStoragePlugin = new LocalStoragePlugin();
  
  storageManager.registerPlugin(localStoragePlugin);
  await localStoragePlugin.initialize();
  
  // Test store
  await localStoragePlugin.store('test-key', { foo: 'bar' });
  
  // Test retrieve
  const retrieved = await localStoragePlugin.retrieve('test-key');
  assert(retrieved.foo === 'bar');
  
  // Test query
  const results = await localStoragePlugin.query({ foo: 'bar' });
  assert(results.length > 0);
});
```

### Phase 3: Cross-Plugin Integration Tests
```typescript
// Test: Auth + Signer Integration
test('IdentityManager integrates with SignerManager', async () => {
  const identityManager = new IdentityManager();
  const signerManager = new SignerManager();
  
  // Setup plugins
  const nsecPlugin = new NsecPlugin();
  identityManager.registerPlugin(nsecPlugin);
  
  // Login
  const identity = await identityManager.login('nsec', { 
    nsec: 'nsec1test...' 
  });
  
  // Get signer from auth plugin
  const signer = nsecPlugin.getSigner();
  signerManager.setActiveSigner(signer);
  
  // Test cross-manager functionality
  const signedEvent = await signerManager.signEvent({
    kind: 1,
    content: 'Cross-manager test',
    tags: [],
    created_at: Math.floor(Date.now() / 1000)
  });
  
  assert(signedEvent.pubkey === identity.pubkey);
});

// Test: Full Framework Integration
test('Complete framework workflow', async () => {
  const framework = new NostrFramework();
  
  // Initialize with all plugins
  await framework.initialize({
    plugins: {
      auth: [new NsecPlugin(), new Nip07Plugin()],
      storage: [new LocalStoragePlugin()],
      signer: [new MockSigner()]
    }
  });
  
  // Test auth workflow
  const identity = await framework.login('nsec', { nsec: 'nsec1test...' });
  assert(identity);
  
  // Test event publishing
  const event = await framework.publishEvent({
    kind: 1,
    content: 'Framework integration test'
  });
  assert(event.id);
  
  // Test storage
  await framework.storeEvent(event);
  const retrieved = await framework.getEvent(event.id);
  assert(retrieved.id === event.id);
});
```

## Browser-Kompatibilitäts-Tests

### Phase 4: Browser-API Tests
```typescript
// Test: Browser Environment Detection
test('Plugins detect browser environment correctly', () => {
  assert(NsecPlugin.isAvailable() === (typeof window !== 'undefined'));
  assert(Nip07Plugin.isAvailable() === (typeof window !== 'undefined' && 'nostr' in window));
  assert(Nip46Plugin.isAvailable() === (typeof window !== 'undefined'));
});

// Test: WebCrypto API Usage
test('NsecPlugin uses WebCrypto correctly', async () => {
  if (typeof window === 'undefined') return; // Skip in Node
  
  const plugin = new NsecPlugin();
  await plugin.initialize();
  
  // Test key generation
  const keyPair = await plugin._generateKeyPair();
  assert(keyPair.privateKey);
  assert(keyPair.publicKey);
  
  // Test signing
  const signer = plugin.getSigner();
  const testEvent = {
    kind: 1,
    content: 'WebCrypto test',
    tags: [],
    created_at: Math.floor(Date.now() / 1000)
  };
  
  const signed = await signer.signEvent(testEvent);
  assert(signed.sig);
});

// Test: LocalStorage Integration
test('LocalStoragePlugin handles browser storage', async () => {
  if (typeof window === 'undefined') return; // Skip in Node
  
  const plugin = new LocalStoragePlugin();
  await plugin.initialize();
  
  const testData = { test: 'browser-storage' };
  await plugin.store('browser-test', testData);
  
  const retrieved = await plugin.retrieve('browser-test');
  assert(retrieved.test === 'browser-storage');
});
```

## Test-Automation

### CI/CD Integration
```yaml
# .github/workflows/test-plugins.yml
name: Plugin Integration Tests
on: [push, pull_request]

jobs:
  test-plugins:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
        working-directory: ./framework
      
      - name: Build TypeScript
        run: npm run build
        working-directory: ./framework
      
      - name: Run Plugin Integration Tests
        run: npm run test:plugins
        working-directory: ./framework
      
      - name: Run Browser Tests (Headless)
        run: npm run test:browser
        working-directory: ./framework
```

### NPM Scripts
```json
{
  "scripts": {
    "test:plugins": "npm run build && node dist/test/plugin-integration.test.js",
    "test:browser": "playwright test browser-tests/",
    "test:integration": "npm run test:plugins && npm run test:browser"
  }
}
```

## Erfolgs-Validierung

### ✅ Erfolgskriterien:
1. Alle Plugins registrieren sich korrekt in Managern
2. Plugin-Workflows funktionieren End-to-End  
3. Cross-Plugin-Integration funktioniert
4. Browser-APIs werden korrekt verwendet
5. Framework-Integration ist vollständig
6. Tests laufen in CI/CD

### Fehlschlag-Indikatoren:
- Plugin-Registration schlägt fehl
- Signer-Integration funktioniert nicht
- Browser-APIs nicht verfügbar
- Cross-Manager-Communication defekt

## Priorität: HOCH
Plugin-Integration ist kritisch für Framework-Funktionalität.

## Deliverables:
1. Vollständige Integration-Test-Suite
2. Browser-Kompatibilitäts-Tests
3. CI/CD-Pipeline für Plugin-Tests
4. Integration-Status-Dashboard
5. Fehlerbehebungs-Dokumentation