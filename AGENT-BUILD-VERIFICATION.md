# Test Agent: Build & Distribution Verification

## Aufgabe
Stelle sicher, dass der TypeScript-Build korrekt funktioniert und alle generierten JavaScript-Files für Tests und Deployment bereit sind.

## Build-Pipeline-Status

### Current Build Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext", 
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Expected Build Output Structure
```
framework/dist/
├── core/
│   ├── EventBus.js + .d.ts
│   ├── EventManager.js + .d.ts
│   ├── IdentityManager.js + .d.ts
│   ├── RelayManager.js + .d.ts
│   ├── SignerManager.js + .d.ts
│   └── StorageManager.js + .d.ts
├── plugins/
│   ├── auth/
│   │   ├── AuthPlugin.js + .d.ts
│   │   ├── NsecPlugin.js + .d.ts
│   │   ├── Nip07Plugin.js + .d.ts
│   │   └── Nip46Plugin.js + .d.ts
│   ├── signer/
│   │   ├── SignerPlugin.js + .d.ts
│   │   └── MockSigner.js + .d.ts
│   └── storage/
│       ├── StoragePlugin.js + .d.ts
│       ├── LocalStoragePlugin.js + .d.ts
│       ├── SQLitePlugin.js + .d.ts
│       └── SQLiteFilePlugin.js + .d.ts
├── types/
│   └── index.js + .d.ts
├── templates/
│   └── index.js + .d.ts
├── react/
│   └── simple-hooks.js + .d.ts
├── nextjs/
│   └── index.js + .d.ts
└── index.js + .d.ts
```

## Build-Verification-Tests

### Phase 1: Build-Output-Validierung
```typescript
// test/build-verification.test.ts
import * as fs from 'fs';
import * as path from 'path';

const DIST_DIR = path.join(__dirname, '../dist');
const REQUIRED_FILES = [
  'core/EventBus.js',
  'core/EventManager.js', 
  'core/IdentityManager.js',
  'core/RelayManager.js',
  'core/SignerManager.js',
  'core/StorageManager.js',
  'plugins/auth/AuthPlugin.js',
  'plugins/auth/NsecPlugin.js',
  'plugins/auth/Nip07Plugin.js',
  'plugins/auth/Nip46Plugin.js',
  'plugins/signer/SignerPlugin.js',
  'plugins/signer/MockSigner.js',
  'plugins/storage/StoragePlugin.js',
  'plugins/storage/LocalStoragePlugin.js',
  'plugins/storage/SQLitePlugin.js',
  'plugins/storage/SQLiteFilePlugin.js',
  'types/index.js',
  'index.js'
];

test('All required JavaScript files are built', () => {
  REQUIRED_FILES.forEach(file => {
    const filePath = path.join(DIST_DIR, file);
    assert(fs.existsSync(filePath), `Missing build file: ${file}`);
  });
});

test('All JavaScript files have corresponding .d.ts files', () => {
  REQUIRED_FILES.forEach(file => {
    const dtsFile = file.replace('.js', '.d.ts');
    const dtsPath = path.join(DIST_DIR, dtsFile);
    assert(fs.existsSync(dtsPath), `Missing type definition: ${dtsFile}`);
  });
});

test('Build files are valid JavaScript', () => {
  REQUIRED_FILES.forEach(file => {
    const filePath = path.join(DIST_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Basic syntax check
    assert(!content.includes('Cannot find module'), `Build error in ${file}`);
    assert(!content.includes('TS'), `TypeScript syntax not compiled in ${file}`);
  });
});
```

### Phase 2: Import-Resolution-Tests
```typescript
// test/import-resolution.test.ts
test('Core modules can be imported from dist', async () => {
  const EventBus = (await import('../dist/core/EventBus.js')).EventBus;
  assert(typeof EventBus === 'function');
  
  const eventBus = new EventBus();
  assert(eventBus instanceof EventBus);
});

test('Plugin modules can be imported from dist', async () => {
  const NsecPlugin = (await import('../dist/plugins/auth/NsecPlugin.js')).NsecPlugin;
  assert(typeof NsecPlugin === 'function');
  
  const plugin = new NsecPlugin();
  assert(plugin.getName() === 'nsec');
});

test('Framework index can be imported', async () => {
  const framework = await import('../dist/index.js');
  assert(framework.NostrFramework);
  assert(framework.EventBus);
  assert(framework.NsecPlugin);
});

test('React hooks can be imported', async () => {
  const hooks = await import('../dist/react/simple-hooks.js');
  assert(hooks.useNostrFramework);
  assert(hooks.useNostrAuth);
  assert(hooks.useNostrPublish);
});
```

### Phase 3: Runtime-Compatibility-Tests
```typescript
// test/runtime-compatibility.test.ts
test('Built plugins initialize correctly', async () => {
  const { NsecPlugin } = await import('../dist/plugins/auth/NsecPlugin.js');
  const plugin = new NsecPlugin();
  
  // Should not throw
  await plugin.initialize();
  assert(plugin.isInitialized());
});

test('Built managers work with built plugins', async () => {
  const { IdentityManager } = await import('../dist/core/IdentityManager.js');
  const { NsecPlugin } = await import('../dist/plugins/auth/NsecPlugin.js');
  
  const manager = new IdentityManager();
  const plugin = new NsecPlugin();
  
  manager.registerPlugin(plugin);
  const plugins = manager.getAvailablePlugins();
  assert(plugins.length === 1);
});

test('Framework integrates with built components', async () => {
  const { NostrFramework } = await import('../dist/index.js');
  const framework = new NostrFramework();
  
  await framework.initialize();
  assert(framework.eventBus);
  assert(framework.identityManager);
});
```

## HTML-Test-Integration

### Phase 4: HTML-Test-Compatibility
```html
<!-- Updated test-template.html -->
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>TypeScript Build Test</title>
  
  <!-- Updated ImportMap for dist builds -->
  <script type="importmap">
    {
      "imports": {
        "./framework/": "./framework/dist/",
        "./framework/core/": "./framework/dist/core/",
        "./framework/plugins/": "./framework/dist/plugins/",
        "./framework/types/": "./framework/dist/types/",
        "nostr-tools/nip19": "https://esm.sh/nostr-tools@2.17.0/nip19",
        "nostr-tools": "https://esm.sh/nostr-tools@2.17.0"
      }
    }
  </script>
</head>
<body>
  <script type="module">
    // Test built framework import
    import { NostrFramework, NsecPlugin } from './framework/index.js';
    
    console.log('Framework imported successfully');
    console.log('NsecPlugin available:', !!NsecPlugin);
    
    // Test plugin instantiation
    const plugin = new NsecPlugin();
    console.log('Plugin created:', plugin.getName());
    
    // Test framework initialization
    const framework = new NostrFramework();
    framework.initialize().then(() => {
      console.log('Framework initialized successfully');
    }).catch(error => {
      console.error('Framework initialization failed:', error);
    });
  </script>
</body>
</html>
```

### NPM Scripts für Build & Test
```json
{
  "scripts": {
    "prebuild": "npm run clean",
    "build": "tsc",
    "postbuild": "npm run test:build",
    "clean": "if exist dist rmdir /s /q dist",
    "test:build": "node test/build-verification.test.js",
    "test:html:prepare": "npm run build && echo 'Ready for HTML tests'",
    "test:html:serve": "npm run test:html:prepare && python -m http.server 8000",
    "validate:all": "npm run build && npm run test:build && echo 'Build validation complete'"
  }
}
```

## Build-Monitoring

### Continuous Build Health
```typescript
// scripts/build-health-check.ts
import { execSync } from 'child_process';
import * as fs from 'fs';

interface BuildHealth {
  buildSuccess: boolean;
  filesGenerated: number;
  expectedFiles: number;
  typeDefinitions: number;
  sourceMaps: number;
  errors: string[];
}

export function checkBuildHealth(): BuildHealth {
  const health: BuildHealth = {
    buildSuccess: false,
    filesGenerated: 0,
    expectedFiles: REQUIRED_FILES.length,
    typeDefinitions: 0,
    sourceMaps: 0,
    errors: []
  };
  
  try {
    // Run build
    execSync('npm run build', { stdio: 'pipe' });
    health.buildSuccess = true;
    
    // Count generated files
    REQUIRED_FILES.forEach(file => {
      const jsPath = path.join(DIST_DIR, file);
      const dtsPath = path.join(DIST_DIR, file.replace('.js', '.d.ts'));
      const mapPath = path.join(DIST_DIR, file + '.map');
      
      if (fs.existsSync(jsPath)) health.filesGenerated++;
      if (fs.existsSync(dtsPath)) health.typeDefinitions++;
      if (fs.existsSync(mapPath)) health.sourceMaps++;
    });
    
  } catch (error) {
    health.errors.push(error.message);
  }
  
  return health;
}

// Run health check
const health = checkBuildHealth();
console.log('Build Health Report:', health);

if (health.buildSuccess && health.filesGenerated === health.expectedFiles) {
  console.log('✅ Build is healthy');
  process.exit(0);
} else {
  console.error('❌ Build has issues');
  process.exit(1);
}
```

## Erfolgs-Validierung

### ✅ Build erfolgreich wenn:
1. TypeScript kompiliert ohne Fehler
2. Alle erwarteten .js Files generiert
3. Alle .d.ts Type-Definitionen vorhanden
4. Source-Maps für Debugging verfügbar
5. Import-Resolution funktioniert
6. HTML-Tests können built files laden
7. Runtime-Compatibility gegeben

### Fehlschlag-Indikatoren:
- TypeScript-Compiler-Fehler
- Fehlende Build-Outputs
- Import-Resolution-Fehler
- Runtime-Errors in built files

## Priorität: KRITISCH
Ohne funktionierenden Build ist das gesamte Framework unbrauchbar.

## Deliverables:
1. Build-Verification-Test-Suite
2. HTML-Test-Template mit korrekten Imports
3. Build-Health-Monitoring
4. Updated NPM Scripts
5. CI/CD Build-Pipeline
6. Build-Troubleshooting-Guide