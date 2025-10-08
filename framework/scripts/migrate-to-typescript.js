#!/usr/bin/env node
// framework/scripts/migrate-to-typescript.js

import { promises as fs } from 'fs';
import path from 'path';

const frameworkDir = process.cwd();

// JavaScript-Dateien, die entfernt werden können (haben TypeScript-Äquivalente)
const jsFilesToRemove = [
  // Core modules
  'core/EventBus.js',
  'core/EventManager.js', 
  'core/IdentityManager.js',
  'core/RelayManager.js',
  'core/SignerManager.js',
  'core/StorageManager.js',
  'core/TemplateEngine.js',
  
  // Root files
  'index.js',
  'config.js',
  
  // Templates (haben TypeScript-Äquivalente)
  'templates/EventTemplate.js',
  
  // Plugins (haben TypeScript-Äquivalente)
  'plugins/auth/AuthPlugin.js',
  'plugins/auth/Nip07Plugin.js',
  'plugins/auth/Nip46Plugin.js',
  'plugins/auth/NsecPlugin.js',
  'plugins/signer/SignerPlugin.js',
  'plugins/signer/MockSigner.js',
  'plugins/storage/StoragePlugin.js',
  'plugins/storage/LocalStoragePlugin.js',
  'plugins/storage/SQLitePlugin.js',
  'plugins/storage/SQLiteFilePlugin.js',
];

// Test-Dateien bleiben vorerst
const jsTestFilesToKeep = [
  'core/EventBus.test.js',
  'core/EventManager.test.js',
  'core/IdentityManager.test.js',
  'core/RelayManager.test.js',
  'core/SignerManager.test.js',
  'core/StorageManager.test.js',
];

// Template-Dateien ohne TypeScript-Äquivalent bleiben vorerst
const jsTemplateFilesToKeep = [
  'templates/index.js',
  'templates/nip01.js',
  'templates/nip09.js',
  'templates/nip52.js',
];

async function removeJavaScriptFiles() {
  console.log('🚀 Starting migration to TypeScript...\n');
  
  let removedCount = 0;
  let keptCount = 0;
  
  for (const filePath of jsFilesToRemove) {
    const fullPath = path.join(frameworkDir, filePath);
    
    try {
      // Prüfen ob TypeScript-Äquivalent existiert
      const tsPath = fullPath.replace('.js', '.ts');
      const tsExists = await fs.access(tsPath).then(() => true).catch(() => false);
      
      if (tsExists) {
        await fs.access(fullPath);
        await fs.unlink(fullPath);
        console.log(`✅ Removed: ${filePath} (TypeScript equivalent exists)`);
        removedCount++;
      } else {
        console.log(`⚠️  Kept: ${filePath} (no TypeScript equivalent found)`);
        keptCount++;
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`ℹ️  Skipped: ${filePath} (file not found)`);
      } else {
        console.error(`❌ Error processing ${filePath}:`, error.message);
      }
    }
  }
  
  console.log(`\n📊 Migration Summary:`);
  console.log(`   - JavaScript files removed: ${removedCount}`);
  console.log(`   - JavaScript files kept: ${keptCount}`);
  console.log(`   - Test files kept: ${jsTestFilesToKeep.length}`);
  console.log(`   - Template files kept: ${jsTemplateFilesToKeep.length}`);
  
  console.log(`\n✨ Next steps:`);
  console.log(`   1. Run: npm run build`);
  console.log(`   2. Test the TypeScript build`);
  console.log(`   3. Update remaining templates to TypeScript`);
  console.log(`   4. Convert test files to TypeScript`);
}

async function validateTypeScriptFiles() {
  console.log('\n🔍 Validating TypeScript files...\n');
  
  const tsFiles = [
    'core/EventBus.ts',
    'core/EventManager.ts', 
    'core/IdentityManager.ts',
    'core/RelayManager.ts',
    'core/SignerManager.ts',
    'core/StorageManager.ts',
    'core/TemplateEngine.ts',
    'index.ts',
    'config.ts',
    'types/index.ts',
  ];
  
  let validCount = 0;
  let missingCount = 0;
  
  for (const filePath of tsFiles) {
    const fullPath = path.join(frameworkDir, filePath);
    
    try {
      await fs.access(fullPath);
      console.log(`✅ Found: ${filePath}`);
      validCount++;
    } catch (error) {
      console.log(`❌ Missing: ${filePath}`);
      missingCount++;
    }
  }
  
  console.log(`\n📊 TypeScript Validation:`);
  console.log(`   - TypeScript files found: ${validCount}`);
  console.log(`   - TypeScript files missing: ${missingCount}`);
  
  return missingCount === 0;
}

async function updateImports() {
  console.log('\n🔧 Updating import statements...\n');
  
  // TypeScript-Dateien finden und .js-Imports aktualisieren
  const tsFiles = await findTypeScriptFiles(frameworkDir);
  
  for (const filePath of tsFiles) {
    try {
      let content = await fs.readFile(filePath, 'utf-8');
      let updated = false;
      
      // .js-Imports zu .js lassen (für TypeScript-Kompatibilität)
      // aber prüfen ob sie korrekt sind
      const jsImportRegex = /from\s+['"](\.\.?\/[^'"]*?)\.js['"]/g;
      const matches = content.matchAll(jsImportRegex);
      
      for (const match of matches) {
        const importPath = match[1];
        const fullImportPath = path.resolve(path.dirname(filePath), importPath + '.ts');
        
        try {
          await fs.access(fullImportPath);
          // Import ist korrekt, TypeScript-Datei existiert
        } catch (error) {
          console.log(`⚠️  Potentially broken import in ${filePath}: ${match[0]}`);
        }
      }
      
      if (updated) {
        await fs.writeFile(filePath, content, 'utf-8');
        console.log(`✅ Updated imports in: ${path.relative(frameworkDir, filePath)}`);
      }
    } catch (error) {
      console.error(`❌ Error updating ${filePath}:`, error.message);
    }
  }
}

async function findTypeScriptFiles(dir) {
  const files = [];
  
  async function scanDir(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory() && !['node_modules', 'dist', '.git'].includes(entry.name)) {
        await scanDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  }
  
  await scanDir(dir);
  return files;
}

// Script ausführen
async function main() {
  try {
    const isValid = await validateTypeScriptFiles();
    
    if (!isValid) {
      console.log('\n❌ Some TypeScript files are missing. Please ensure all files are migrated first.');
      process.exit(1);
    }
    
    await removeJavaScriptFiles();
    await updateImports();
    
    console.log('\n🎉 Migration to TypeScript completed successfully!');
    console.log('\nRun "npm run build" to test the TypeScript compilation.');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}