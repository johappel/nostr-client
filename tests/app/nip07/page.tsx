// tests/app/nip07/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import styles from './nip07.module.css';

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
  status: 'pending' | 'success' | 'error' | 'skipped';
  message?: string;
  duration?: number;
}

interface ExtensionInfo {
  available: boolean;
  hasGetPublicKey: boolean;
  hasSignEvent: boolean;
  hasGetRelays: boolean;
  hasNip04Encrypt: boolean;
  hasNip04Decrypt: boolean;
  version?: string;
}

export default function Nip07TestPage() {
  const [plugin, setPlugin] = useState<any>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [extensionInfo, setExtensionInfo] = useState<ExtensionInfo | null>(null);
  const [isExtensionLoading, setIsExtensionLoading] = useState(true);

  const testCases = [
    'Plugin Initialization',
    'Extension Detection',
    'Get Public Key',
    'Login with Extension',
    'Get Identity',
    'Get Signer',
    'Sign Test Event',
    'Get Relays',
    'NIP-04 Encryption',
    'NIP-04 Decryption',
    'Logout'
  ];

  const addLog = (message: string, type: 'log' | 'info' | 'warn' | 'error' | 'success' = 'log') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev, logEntry]);
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
      addLog(`✅ ${testName} - SUCCESS (${duration}ms)`, 'success');
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateTestResult(testName, 'error', error.message, duration);
      addLog(`❌ ${testName} - ERROR: ${error.message}`, 'error');
      throw error;
    }
  };

  const runSkippedTest = (testName: string, reason: string) => {
    updateTestResult(testName, 'skipped', reason);
    addLog(`⚠️ ${testName} - SKIPPED: ${reason}`, 'warn');
  };

  const waitForExtension = async (maxWaitMs: number = 3000): Promise<boolean> => {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      if (typeof window !== 'undefined' && (window as any).nostr) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
  };

  const checkExtensionCapabilities = (): ExtensionInfo => {
    if (typeof window === 'undefined' || !(window as any).nostr) {
      return {
        available: false,
        hasGetPublicKey: false,
        hasSignEvent: false,
        hasGetRelays: false,
        hasNip04Encrypt: false,
        hasNip04Decrypt: false
      };
    }

    const nostr = (window as any).nostr;
    return {
      available: true,
      hasGetPublicKey: typeof nostr.getPublicKey === 'function',
      hasSignEvent: typeof nostr.signEvent === 'function',
      hasGetRelays: typeof nostr.getRelays === 'function',
      hasNip04Encrypt: typeof nostr.nip04?.encrypt === 'function',
      hasNip04Decrypt: typeof nostr.nip04?.decrypt === 'function',
      version: nostr.version || 'Unknown'
    };
  };

  const runAllTests = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setTestResults([]);
    setLogs([]);
    setIdentity(null);
    
    addLog('🚀 Starting Next.js NIP-07 Plugin Test Suite...', 'info');
    
    try {
      // Import Nip07Plugin from built framework
      const { Nip07Plugin } = await import('../../../framework/dist/plugins/auth/Nip07Plugin.js');
      
      // Test 1: Plugin Initialization
      let testPlugin: any;
      await runTest('Plugin Initialization', async () => {
        testPlugin = new Nip07Plugin();
        await testPlugin.initialize();
        setPlugin(testPlugin);
        addLog('NIP-07 Plugin initialized', 'info');
      });

      // Test 2: Extension Detection
      await runTest('Extension Detection', async () => {
        if (!testPlugin) throw new Error('Plugin not initialized');
        
        addLog('⏳ Waiting for NIP-07 extension...', 'info');
        const extensionAvailable = await waitForExtension(3000);
        
        if (!extensionAvailable) {
          throw new Error('No NIP-07 extension detected after 3 seconds');
        }
        
        const info = checkExtensionCapabilities();
        setExtensionInfo(info);
        
        addLog(`✅ Extension detected: ${info.version}`, 'success');
        addLog(`Available methods: getPublicKey=${info.hasGetPublicKey}, signEvent=${info.hasSignEvent}, getRelays=${info.hasGetRelays}`, 'info');
      });

      // Test 3: Get Public Key
      let publicKey = '';
      await runTest('Get Public Key', async () => {
        if (!extensionInfo?.hasGetPublicKey) {
          throw new Error('Extension does not support getPublicKey');
        }
        
        const nostr = (window as any).nostr;
        publicKey = await nostr.getPublicKey();
        
        if (!publicKey || publicKey.length !== 64) {
          throw new Error('Invalid public key received');
        }
        
        addLog(`Public key: ${publicKey.substring(0, 16)}...`, 'info');
      });

      // Test 4: Login with Extension
      let loggedInIdentity: Identity;
      await runTest('Login with Extension', async () => {
        if (!testPlugin) throw new Error('Plugin not initialized');
        
        loggedInIdentity = await testPlugin.login();
        setIdentity(loggedInIdentity);
        addLog(`Logged in successfully`, 'success');
        addLog(`NPUB: ${loggedInIdentity.npub}`, 'info');
        addLog(`Provider: ${loggedInIdentity.provider}`, 'info');
        addLog(`Display Name: ${loggedInIdentity.displayName || 'None'}`, 'info');
      });

      // Test 5: Get Identity
      await runTest('Get Identity', async () => {
        if (!testPlugin) throw new Error('Plugin not initialized');
        
        const currentIdentity = await testPlugin.getIdentity();
        if (!currentIdentity) throw new Error('No identity found');
        if (currentIdentity.pubkey !== loggedInIdentity.pubkey) {
          throw new Error(`Identity mismatch: expected ${loggedInIdentity.pubkey}, got ${currentIdentity.pubkey}`);
        }
        addLog(`Identity verified: ${currentIdentity.npub}`, 'success');
      });

      // Test 6: Get Signer
      let signer: any;
      await runTest('Get Signer', async () => {
        if (!testPlugin) throw new Error('Plugin not initialized');
        
        signer = await testPlugin.getSigner();
        if (!signer) throw new Error('No signer returned');
        
        // Check if signer has required methods
        if (typeof signer.signEvent !== 'function') {
          throw new Error('Signer does not have signEvent method');
        }
        
        addLog(`Signer obtained with signEvent capability`, 'success');
      });

      // Test 7: Sign Test Event
      let signedEvent: any;
      await runTest('Sign Test Event', async () => {
        if (!signer) throw new Error('Signer not available');
        
        const testEvent = {
          kind: 1,
          content: `Next.js NIP-07 Plugin Test - ${new Date().toISOString()}`,
          tags: [
            ['client', 'nostr-framework-nextjs-test'],
            ['t', 'test'],
            ['t', 'nip07']
          ],
          created_at: Math.floor(Date.now() / 1000)
        };
        
        signedEvent = await signer.signEvent(testEvent);
        if (!signedEvent.id || !signedEvent.sig) {
          throw new Error('Event not properly signed');
        }
        addLog(`Event signed successfully`, 'success');
        addLog(`Event ID: ${signedEvent.id}`, 'info');
        addLog(`Signature: ${signedEvent.sig.substring(0, 16)}...`, 'info');
      });

      // Test 8: Get Relays
      await runTest('Get Relays', async () => {
        if (!extensionInfo?.hasGetRelays) {
          runSkippedTest('Get Relays', 'Extension does not support getRelays');
          return;
        }
        
        const nostr = (window as any).nostr;
        const relays = await nostr.getRelays();
        
        if (!relays || typeof relays !== 'object') {
          throw new Error('Invalid relays response');
        }
        
        const relayCount = Object.keys(relays).length;
        addLog(`Retrieved ${relayCount} relay configurations`, 'success');
        
        if (relayCount > 0) {
          const firstRelay = Object.keys(relays)[0];
          addLog(`First relay: ${firstRelay}`, 'info');
        }
      });

      // Test 9: NIP-04 Encryption
      let encryptedMessage = '';
      await runTest('NIP-04 Encryption', async () => {
        if (!extensionInfo?.hasNip04Encrypt) {
          runSkippedTest('NIP-04 Encryption', 'Extension does not support NIP-04 encryption');
          return;
        }
        
        if (!signer || !loggedInIdentity) throw new Error('Signer or identity not available');
        
        const testMessage = 'Hello from Next.js NIP-07 test!';
        const recipientPubkey = loggedInIdentity.pubkey; // Self-encrypt for testing
        
        try {
          const nostr = (window as any).nostr;
          encryptedMessage = await nostr.nip04.encrypt(recipientPubkey, testMessage);
          
          if (!encryptedMessage) throw new Error('Encryption returned empty result');
          addLog(`Message encrypted successfully`, 'success');
          addLog(`Encrypted length: ${encryptedMessage.length} chars`, 'info');
        } catch (error: any) {
          if (error.message.includes('not supported') || error.message.includes('denied')) {
            runSkippedTest('NIP-04 Encryption', 'Encryption not supported or denied by user');
            return;
          }
          throw error;
        }
      });

      // Test 10: NIP-04 Decryption
      await runTest('NIP-04 Decryption', async () => {
        if (!extensionInfo?.hasNip04Decrypt) {
          runSkippedTest('NIP-04 Decryption', 'Extension does not support NIP-04 decryption');
          return;
        }
        
        if (!loggedInIdentity) throw new Error('Identity not available');
        
        if (!encryptedMessage) {
          runSkippedTest('NIP-04 Decryption', 'No encrypted message available');
          return;
        }
        
        try {
          const nostr = (window as any).nostr;
          const decryptedMessage = await nostr.nip04.decrypt(loggedInIdentity.pubkey, encryptedMessage);
          
          if (decryptedMessage !== 'Hello from Next.js NIP-07 test!') {
            throw new Error('Decrypted message does not match original');
          }
          addLog(`Message decrypted successfully: "${decryptedMessage}"`, 'success');
        } catch (error: any) {
          if (error.message.includes('not supported') || error.message.includes('denied')) {
            runSkippedTest('NIP-04 Decryption', 'Decryption not supported or denied by user');
            return;
          }
          throw error;
        }
      });

      // Test 11: Logout
      await runTest('Logout', async () => {
        if (!testPlugin) throw new Error('Plugin not initialized');
        
        await testPlugin.logout();
        const currentIdentity = await testPlugin.getIdentity();
        if (currentIdentity) throw new Error('Identity still exists after logout');
        setIdentity(null);
        addLog('Logged out successfully', 'success');
      });

      addLog('🎉 All Next.js NIP-07 tests completed successfully!', 'success');
      
    } catch (error: any) {
      addLog(`💥 Next.js NIP-07 test suite failed: ${error.message}`, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // Initialize extension check on mount
  useEffect(() => {
    const initExtensionCheck = async () => {
      setIsExtensionLoading(true);
      addLog('🔍 Checking for NIP-07 extension...', 'info');
      
      // Wait for extension to potentially load
      const extensionFound = await waitForExtension(3000);
      
      if (extensionFound) {
        const info = checkExtensionCapabilities();
        setExtensionInfo(info);
        addLog(`✅ Extension detected: ${info.version || 'Unknown version'}`, 'success');
      } else {
        setExtensionInfo({
          available: false,
          hasGetPublicKey: false,
          hasSignEvent: false,
          hasGetRelays: false,
          hasNip04Encrypt: false,
          hasNip04Decrypt: false
        });
        addLog('❌ No NIP-07 extension found', 'warn');
      }
      
      setIsExtensionLoading(false);
    };
    
    initExtensionCheck();
  }, []);

  const successCount = testResults.filter(r => r.status === 'success').length;
  const skippedCount = testResults.filter(r => r.status === 'skipped').length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🔌 NIP-07 Plugin Test (Next.js)</h1>
        <p className={styles.subtitle}>
          Next.js-konvertierte Version des NIP-07 Browser Extension Tests
        </p>
      </div>

      <div className={styles.warning}>
        <strong>ℹ️ HINWEIS:</strong> Dieser Test erfordert eine NIP-07-kompatible Browser-Extension 
        (wie Alby, nos2x, oder Flamingo). Ohne Extension werden die meisten Tests übersprungen.
      </div>

      <div className={styles.extensionStatus}>
        <h3>Extension Status</h3>
        {isExtensionLoading ? (
          <div className={styles.loading}>⏳ Checking for extension...</div>
        ) : extensionInfo?.available ? (
          <div className={styles.extensionInfo}>
            <div className={styles.statusGood}>✅ NIP-07 Extension detected</div>
            <div className={styles.capabilities}>
              <div>Version: {extensionInfo.version || 'Unknown'}</div>
              <div>getPublicKey: {extensionInfo.hasGetPublicKey ? '✅' : '❌'}</div>
              <div>signEvent: {extensionInfo.hasSignEvent ? '✅' : '❌'}</div>
              <div>getRelays: {extensionInfo.hasGetRelays ? '✅' : '❌'}</div>
              <div>NIP-04 encrypt: {extensionInfo.hasNip04Encrypt ? '✅' : '❌'}</div>
              <div>NIP-04 decrypt: {extensionInfo.hasNip04Decrypt ? '✅' : '❌'}</div>
            </div>
          </div>
        ) : (
          <div className={styles.extensionInfo}>
            <div className={styles.statusBad}>❌ No NIP-07 Extension found</div>
            <div className={styles.help}>
              <p>Please install a NIP-07 compatible browser extension:</p>
              <ul>
                <li><a href="https://getalby.com/" target="_blank" rel="noopener">Alby</a></li>
                <li><a href="https://github.com/fiatjaf/nos2x" target="_blank" rel="noopener">nos2x</a></li>
                <li><a href="https://github.com/getflamingo/flamingo" target="_blank" rel="noopener">Flamingo</a></li>
              </ul>
              <p>After installation, refresh this page.</p>
            </div>
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <button 
          onClick={runAllTests} 
          disabled={isRunning}
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
          Extension: {extensionInfo?.available ? '✅ Bereit' : '❌ Nicht verfügbar'}
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

      <div className={styles.testResults}>
        <h3>Test Results ({successCount}/{testCases.length}, {skippedCount} skipped)</h3>
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
                  {status === 'skipped' && '⚠️'}
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