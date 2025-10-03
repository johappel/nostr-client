// framework/core/EventManager.test.js

import { EventManager } from './EventManager.js';
import { TemplateEngine } from './TemplateEngine.js';
import { SignerManager } from './SignerManager.js';
import { MockSigner } from '../plugins/signer/MockSigner.js';
import { TextNoteTemplate } from '../templates/nip01.js';

export function runEventManagerTests() {
  console.group('EventManager Tests');
  
  const results = { passed: 0, failed: 0, tests: [] };

  async function asyncTest(name, fn) {
    try {
      await fn();
      results.passed++;
      results.tests.push({ name, status: 'PASS' });
      console.log(`✓ ${name}`);
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: 'FAIL', error });
      console.error(`✗ ${name}:`, error.message);
    }
  }

  (async () => {
    // Setup
    const templateEngine = new TemplateEngine();
    templateEngine.register('text-note', new TextNoteTemplate());

    const signerManager = new SignerManager();
    signerManager.setSigner(new MockSigner());

    const eventManager = new EventManager();
    eventManager.setTemplateEngine(templateEngine);
    eventManager.setSignerManager(signerManager);

    await asyncTest('createUnsignedEvent() creates event', async () => {
      const event = eventManager.createUnsignedEvent('text-note', {
        content: 'Test'
      });
      if (!event.kind || !event.content) {
        throw new Error('Invalid event structure');
      }
    });

    await asyncTest('createEvent() signs event', async () => {
      const event = await eventManager.createEvent('text-note', {
        content: 'Test'
      });
      if (!event.id || !event.sig) {
        throw new Error('Event not signed');
      }
    });

    await asyncTest('parseEvent() parses event', async () => {
      const event = await eventManager.createEvent('text-note', {
        content: 'Parse me'
      });
      const parsed = eventManager.parseEvent('text-note', event);
      if (parsed.content !== 'Parse me') {
        throw new Error('Parsing failed');
      }
    });

    await asyncTest('Cache stores events', async () => {
      const event = await eventManager.createEvent('text-note', {
        content: 'Cache test'
      });
      const cached = eventManager.getCachedEvent(event.id);
      if (!cached || cached.id !== event.id) {
        throw new Error('Event not cached');
      }
    });

    await asyncTest('Cache stats work', async () => {
      const stats = eventManager.getCacheStats();
      if (typeof stats.size !== 'number') {
        throw new Error('Invalid stats');
      }
    });

    await asyncTest('Clear cache works', async () => {
      await eventManager.createEvent('text-note', { content: 'Test' });
      eventManager.clearCache();
      if (eventManager.getCacheStats().size !== 0) {
        throw new Error('Cache not cleared');
      }
    });

    await asyncTest('Events fire correctly', async () => {
      let eventFired = false;
      eventManager.on('event:signed', () => eventFired = true);
      
      await eventManager.createEvent('text-note', { content: 'Test' });
      
      if (!eventFired) throw new Error('Event not fired');
    });

    await asyncTest('getAllCachedEvents() returns array', async () => {
      eventManager.clearCache();
      await eventManager.createEvent('text-note', { content: 'Test 1' });
      await eventManager.createEvent('text-note', { content: 'Test 2' });
      
      const cached = eventManager.getAllCachedEvents();
      if (!Array.isArray(cached)) {
        throw new Error(`getAllCachedEvents should return array, got ${typeof cached}`);
      }
      if (cached.length !== 2) {
        throw new Error(`Expected 2 cached events, got ${cached.length}`);
      }
    });

    await asyncTest('getCachedEvent() returns null for missing event', async () => {
      const cached = eventManager.getCachedEvent('non-existent-id');
      if (cached !== null) {
        throw new Error('Should return null for missing event');
      }
    });

    await asyncTest('Throws error without template engine', async () => {
      const manager = new EventManager();
      let errorThrown = false;
      try {
        manager.createUnsignedEvent('text-note', { content: 'Test' });
      } catch (error) {
        errorThrown = error.message.includes('TemplateEngine not set');
      }
      if (!errorThrown) throw new Error('Should throw error without template engine');
    });

    await asyncTest('Throws error without signer manager', async () => {
      const manager = new EventManager();
      manager.setTemplateEngine(templateEngine);
      let errorThrown = false;
      try {
        await manager.createEvent('text-note', { content: 'Test' });
      } catch (error) {
        errorThrown = error.message.includes('SignerManager not set');
      }
      if (!errorThrown) throw new Error('Should throw error without signer manager');
    });

    console.groupEnd();
    console.log('\n📊 Test Results:');
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Total: ${results.passed + results.failed}`);
    
    return results;
  })();
}

if (typeof window !== 'undefined') {
  window.runEventManagerTests = runEventManagerTests;
  console.log('💡 Run tests with: runEventManagerTests()');
}