# Publishing @johappel/nostr-framework

## Build and Publish

```bash
# 1. Build the framework
cd framework
npm run build

# 2. Publish to npm (from framework directory)
npm publish --access public

# Alternative: Publish from root directory
npm run publish:framework
```

## Version Management

### Update Version

```bash
# Update version in framework/package.json
# Then rebuild and publish
cd framework
npm version patch|minor|major
npm run build
npm publish --access public
```

### Pre-release Versions

```bash
# For beta releases
npm version 1.2.0-beta.1
npm publish --tag beta
```

## Package Structure

The published package includes:

```
dist/
├── index.js              # Main entry point
├── config.js             # Configuration
├── core/                 # All core modules
│   ├── EventBus.js
│   ├── IdentityManager.js
│   ├── RelayManager.js
│   ├── SignerManager.js
│   ├── StorageManager.js
│   ├── TemplateEngine.js
│   └── EventManager.js
├── plugins/
│   └── auth/
│       └── AuthPlugin.js
├── templates/
│   └── EventTemplate.js
└── types/
    └── index.d.ts        # TypeScript definitions
```

## Dependencies

- **Runtime**: Only `nostr-tools` as peerDependency
- **Build**: TypeScript for compilation
- **No React dependency** - Framework works in any JavaScript environment

## Testing Publication

```bash
# Create a test project
mkdir test-framework
cd test-framework
npm init -y
npm install @johappel/nostr-framework

# Test TypeScript usage
cat > test.ts << 'EOF'
import { NostrFramework, FrameworkConfig } from '@johappel/nostr-framework';

const config: FrameworkConfig = {
  relays: ['wss://relay.damus.io']
};

const framework = new NostrFramework(config);
EOF
```

## Publishing Checklist

- [ ] Update version in `framework/package.json`
- [ ] Run `npm run build` to generate dist files
- [ ] Test the built files locally
- [ ] Update README.md if needed
- [ ] Run `npm publish --access public`
- [ ] Verify package on npmjs.com
- [ ] Test installation in a fresh project

## Support

After publishing:
- Monitor npm package downloads
- Respond to issues on GitHub
- Keep dependencies updated
- Release security updates promptly