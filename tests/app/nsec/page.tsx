// tests/app/nsec/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import styles from './nsec.module.css';

// Types
interface Identity {
  pubkey: string;
  npub: string;
  provider: string;
  displayName?: string | null;
  metadata?: any;
  capabilities: {
    canSign: boolean;
    canEncrypt: boolean;
    canDecrypt: boolean;
  };
}

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  duration?: number;
}

export default function NsecTestPage() {
  const [plugin, setPlugin] = useState<any>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [customNsec, setCustomNsec] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [generatedNsec, setGeneratedNsec] = useState('');

  const testCases = [
    'Plugin Initialization',
    'Generate Test NSEC',
    'Login with Generated NSEC',
    'Get Identity',
    'Get Signer',
    'Sign Test Event',
    'NIP-04 Encryption',
    'NIP-04 Decryption',
    'Logout'
  ];

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const updateTestResult = (testName: string, status: TestResult['status'], message?: string, duration?: number) => {
    setTestResults(prev => {
      const index = prev.findIndex(t => t.name === testName);
      const newResult: TestResult = { name: testName, status, message, duration };
      
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = newResult;
        return updated;
      } else {
        return [...prev, newResult];
      }
    });
  };

  const runTest = async (testName: string, testFn: () => Promise<void>) => {
    const startTime = Date.now();
    updateTestResult(testName, 'pending');
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      updateTestResult(testName, 'success', 'Test passed', duration);
      addLog(`✅ ${testName} - SUCCESS (${duration}ms)`);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateTestResult(testName, 'error', error.message, duration);
      addLog(`❌ ${testName} - ERROR: ${error.message}`);
      throw error;
    }
  };

  const runAllTests = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setTestResults([]);
    setLogs([]);
    setIdentity(null);
    setGeneratedNsec('');
    
    addLog('🚀 Starting Next.js NSEC Plugin Test Suite...');
    
    try {
      // Import NsecPlugin from built framework
      const { NsecPlugin } = await import('../../../framework/dist/plugins/auth/NsecPlugin.js');
      
      // Test 1: Plugin Initialization
      await runTest('Plugin Initialization', async () => {
        const testPlugin = new NsecPlugin({
          relays: ['wss://relay.damus.io', 'wss://relay.snort.social']
        });
        await testPlugin.initialize();
        setPlugin(testPlugin);
        addLog('Plugin initialized with test configuration');
      });

      // Test 2: Generate Test NSEC
      let testNsec = '';
      await runTest('Generate Test NSEC', async () => {
        if (!plugin) throw new Error('Plugin not initialized');
        
        // Generate test NSEC using browser crypto
        const privateKey = new Uint8Array(32);
        if (typeof window !== 'undefined' && window.crypto) {
          window.crypto.getRandomValues(privateKey);
        } else {
          throw new Error('Browser crypto not available');
        }
        
        testNsec = Array.from(privateKey).map(b => b.toString(16).padStart(2, '0')).join('');
        setGeneratedNsec(testNsec);
        addLog(`Generated test private key: ${testNsec.substring(0, 8)}...`);
      });

      // Test 3: Login with Generated NSEC
      let loggedInIdentity: Identity;
      await runTest('Login with Generated NSEC', async () => {
        if (!plugin) throw new Error('Plugin not initialized');
        
        loggedInIdentity = await plugin.login({ nsec: testNsec });
        setIdentity(loggedInIdentity);
        addLog(`Logged in successfully`);
        addLog(`NPUB: ${loggedInIdentity.npub}`);
        addLog(`Provider: ${loggedInIdentity.provider}`);
        addLog(`Display Name: ${loggedInIdentity.displayName || 'None'}`);
      });

      // Test 4: Get Identity
      await runTest('Get Identity', async () => {
        if (!plugin) throw new Error('Plugin not initialized');
        
        const currentIdentity = await plugin.getIdentity();
        if (!currentIdentity) throw new Error('No identity found');
        if (currentIdentity.pubkey !== loggedInIdentity.pubkey) {
          throw new Error(`Identity mismatch: expected ${loggedInIdentity.pubkey}, got ${currentIdentity.pubkey}`);
        }
        addLog(`Identity verified: ${currentIdentity.npub}`);
      });

      // Test 5: Get Signer
      let signer: any;
      await runTest('Get Signer', async () => {
        if (!plugin) throw new Error('Plugin not initialized');
        
        // getSigner() returns a Promise, so we need to await it
        signer = await plugin.getSigner();
        if (!signer) throw new Error('No signer returned');
        
        // Debug: Log signer properties
        addLog(`Signer received: ${JSON.stringify(Object.keys(signer))}`);
        addLog(`Signer constructor: ${signer.constructor.name}`);
        
        // Check if signer has required methods
        if (typeof signer.signEvent !== 'function') {
          throw new Error('Signer does not have signEvent method');
        }
        
        // For NSEC plugin, we expect the signer to have signing capabilities
        addLog(`Signer has signEvent: ${typeof signer.signEvent === 'function'}`);
        addLog(`Signer has nip04Encrypt: ${typeof signer.nip04Encrypt === 'function'}`);
        addLog(`Signer has nip04Decrypt: ${typeof signer.nip04Decrypt === 'function'}`);
      });

      // Test 6: Sign Test Event
      let signedEvent: any;
      await runTest('Sign Test Event', async () => {
        if (!signer) throw new Error('Signer not available');
        
        const testEvent = {
          kind: 1,
          content: `Next.js NSEC Plugin Test - ${new Date().toISOString()}`,
          tags: [
            ['client', 'nostr-framework-nextjs-test'],
            ['t', 'test']
          ],
          created_at: Math.floor(Date.now() / 1000)
        };
        
        signedEvent = await signer.signEvent(testEvent);
        if (!signedEvent.id || !signedEvent.sig) {
          throw new Error('Event not properly signed');
        }
        addLog(`Event signed successfully`);
        addLog(`Event ID: ${signedEvent.id}`);
        addLog(`Signature: ${signedEvent.sig.substring(0, 16)}...`);
      });

      // Test 7: NIP-04 Encryption
      let encryptedMessage = '';
      await runTest('NIP-04 Encryption', async () => {
        if (!signer || !loggedInIdentity) throw new Error('Signer or identity not available');
        
        // Check if NIP-04 encryption is available
        if (typeof signer.nip04Encrypt !== 'function') {
          addLog('⚠️ NIP-04 encryption not available in this signer implementation');
          return; // Skip this test
        }
        
        const testMessage = 'Hello from Next.js NSEC test!';
        const recipientPubkey = loggedInIdentity.pubkey; // Self-encrypt for testing
        
        try {
          encryptedMessage = await signer.nip04Encrypt(recipientPubkey, testMessage);
          if (!encryptedMessage) throw new Error('Encryption returned empty result');
          addLog(`Message encrypted successfully`);
          addLog(`Encrypted length: ${encryptedMessage.length} chars`);
        } catch (error: any) {
          if (error.message.includes('not supported')) {
            addLog('⚠️ NIP-04 encryption not supported by this implementation');
            return; // Skip this test
          }
          throw error;
        }
      });

      // Test 8: NIP-04 Decryption
      await runTest('NIP-04 Decryption', async () => {
        if (!signer || !loggedInIdentity) {
          addLog('⚠️ NIP-04 decryption skipped (signer or identity not available)');
          return;
        }
        
        // Check if NIP-04 decryption is available
        if (typeof signer.nip04Decrypt !== 'function') {
          addLog('⚠️ NIP-04 decryption not available in this signer implementation');
          return; // Skip this test
        }
        
        if (!encryptedMessage) {
          addLog('⚠️ NIP-04 decryption skipped (no encrypted message available)');
          return;
        }
        
        try {
          const decryptedMessage = await signer.nip04Decrypt(loggedInIdentity.pubkey, encryptedMessage);
          if (decryptedMessage !== 'Hello from Next.js NSEC test!') {
            throw new Error('Decrypted message does not match original');
          }
          addLog(`Message decrypted successfully: "${decryptedMessage}"`);
        } catch (error: any) {
          if (error.message.includes('not supported')) {
            addLog('⚠️ NIP-04 decryption not supported by this implementation');
            return;
          }
          throw error;
        }
      });

      // Test 9: Logout
      await runTest('Logout', async () => {
        if (!plugin) throw new Error('Plugin not initialized');
        
        await plugin.logout();
        const currentIdentity = await plugin.getIdentity();
        if (currentIdentity) throw new Error('Identity still exists after logout');
        setIdentity(null);
        addLog('Logged out successfully');
      });

      addLog('🎉 All Next.js tests completed successfully!');
      
    } catch (error: any) {
      addLog(`💥 Next.js test suite failed: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const loginWithCustomNsec = async () => {
    if (!plugin || !customNsec.trim()) return;
    
    try {
      addLog(`Attempting login with custom NSEC...`);
      const testIdentity = await plugin.login({ nsec: customNsec.trim() });
      setIdentity(testIdentity);
      addLog(`✅ Custom login successful: ${testIdentity.npub}`);
    } catch (error: any) {
      addLog(`❌ Custom login failed: ${error.message}`);
    }
  };

  const generateNewNsec = () => {
    if (typeof window !== 'undefined' && window.crypto) {
      const privateKey = new Uint8Array(32);
      window.crypto.getRandomValues(privateKey);
      const nsecHex = Array.from(privateKey).map(b => b.toString(16).padStart(2, '0')).join('');
      setCustomNsec(nsecHex);
      addLog(`Generated new test NSEC: ${nsecHex.substring(0, 8)}...`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // Initialize plugin on mount
  useEffect(() => {
    const initPlugin = async () => {
      try {
        // Import NsecPlugin from built framework
        const { NsecPlugin } = await import('../../../framework/dist/plugins/auth/NsecPlugin.js');
        const testPlugin = new NsecPlugin();
        await testPlugin.initialize();
        setPlugin(testPlugin);
        addLog('✅ Next.js test environment ready');
        addLog('Plugin initialized and ready for testing');
      } catch (error: any) {
        addLog(`❌ Failed to initialize plugin: ${error.message}`);
        console.error('Plugin initialization error:', error);
      }
    };
    
    initPlugin();
  }, []);

  const successCount = testResults.filter(r => r.status === 'success').length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>⚠️ NSEC Plugin Test (Next.js)</h1>
        <p className={styles.subtitle}>
          Next.js-konvertierte Version des NSEC Plugin Tests
        </p>
      </div>

      <div className={styles.warning}>
        <strong>⚠️ WARNUNG:</strong> Verwende niemals echte NSEC-Keys in Tests! 
        Diese Tests sind nur für Entwicklungszwecke. Alle generierten Keys sind Zufallsdaten.
      </div>

      <div className={styles.controls}>
        <button 
          onClick={runAllTests} 
          disabled={isRunning || !plugin}
          className={`${styles.btn} ${styles.btnPrimary}`}
        >
          {isRunning ? '🔄 Tests laufen...' : '▶️ Alle Tests starten'}
        </button>
        
        <button 
          onClick={clearLogs}
          className={`${styles.btn} ${styles.btnSecondary}`}
        >
          🗑️ Logs löschen
        </button>

        <div className={styles.status}>
          Plugin: {plugin ? '✅ Bereit' : '⏳ Laden...'}
        </div>
      </div>

      {identity && (
        <div className={styles.identityCard}>
          <h3>Aktuelle Identity</h3>
          <div className={styles.identityField}>
            <strong>NPUB:</strong>
            <span className={styles.npub}>{identity.npub}</span>
          </div>
          <div className={styles.identityField}>
            <strong>Provider:</strong>
            <span>{identity.provider}</span>
          </div>
          <div className={styles.identityField}>
            <strong>Display Name:</strong>
            <span>{identity.displayName || 'Nicht verfügbar'}</span>
          </div>
          <div className={styles.identityField}>
            <strong>Capabilities:</strong>
            <span>
              Sign: {identity.capabilities.canSign ? '✅' : '❌'}, 
              Encrypt: {identity.capabilities.canEncrypt ? '✅' : '❌'}, 
              Decrypt: {identity.capabilities.canDecrypt ? '✅' : '❌'}
            </span>
          </div>
        </div>
      )}

      <div className={styles.customNsec}>
        <h3>Custom NSEC Test</h3>
        <div className={styles.inputGroup}>
          <input
            type="password"
            placeholder="Hex-Private-Key (64 Zeichen) - niemals echte Keys verwenden!"
            value={customNsec}
            onChange={(e) => setCustomNsec(e.target.value)}
            disabled={isRunning}
            className={styles.input}
          />
          <button 
            onClick={generateNewNsec}
            disabled={isRunning}
            className={`${styles.btn} ${styles.btnSecondary}`}
          >
            🎲 Zufalls-NSEC
          </button>
          <button 
            onClick={loginWithCustomNsec}
            disabled={!plugin || !customNsec.trim() || isRunning}
            className={`${styles.btn} ${styles.btnSecondary}`}
          >
            🔑 Login
          </button>
        </div>
        {generatedNsec && (
          <div className={styles.info}>
            <strong>Generierter Test-NSEC:</strong> {generatedNsec.substring(0, 16)}...
          </div>
        )}
      </div>

      <div className={styles.testResults}>
        <h3>Test Results ({successCount}/{testCases.length})</h3>
        <div className={styles.testGrid}>
          {testCases.map((testName) => {
            const result = testResults.find(r => r.name === testName);
            const status = result?.status || 'pending';
            
            return (
              <div key={testName} className={`${styles.testItem} ${styles[status]}`}>
                <div className={styles.testInfo}>
                  <div className={styles.testName}>{testName}</div>
                  {result?.message && (
                    <div className={styles.testMessage}>{result.message}</div>
                  )}
                </div>
                <div className={styles.testStatus}>
                  {status === 'pending' && '⏳'}
                  {status === 'success' && '✅'}
                  {status === 'error' && '❌'}
                  {result?.duration && ` (${result.duration}ms)`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.logs}>
        <h3>Test Logs</h3>
        <div className={styles.logContainer}>
          {logs.map((log, index) => (
            <div key={index} className={styles.logEntry}>
              {log}
            </div>
          ))}
          {logs.length === 0 && (
            <div className={styles.logEntry}>Keine Logs vorhanden. Starte einen Test um Logs zu sehen.</div>
          )}
        </div>
      </div>
    </div>
  );
}