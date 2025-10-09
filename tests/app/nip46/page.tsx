// tests/app/nip46/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import styles from './nip46.module.css';

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

interface ConnectionInfo {
  connected: boolean;
  bunkerUrl?: string;
  pubkey?: string;
  relay?: string;
  error?: string;
}

export default function Nip46TestPage() {
  const [plugin, setPlugin] = useState<any>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    connected: false
  });
  const [bunkerUrl, setBunkerUrl] = useState('bunker://npub1test@relay.example.com');
  const [customBunker, setCustomBunker] = useState('');

  const testCases = [
    'Plugin Initialization',
    'Bunker URL Validation',
    'Connect to Remote Signer',
    'Get Remote Public Key',
    'Login with Remote Signer',
    'Get Identity',
    'Get Remote Signer',
    'Sign Test Event',
    'Get Signer Info',
    'NIP-04 Encryption (if supported)',
    'NIP-04 Decryption (if supported)',
    'Disconnect',
    'Connection Cleanup'
  ];

  const sampleBunkerUrls = [
    'bunker://65011testc24bf97b36c393?relay=wss://relay.nsec.app&secret=geheim',
    'bunker://npub1test@relay.damus.io',
    'bunker://npub1test@nos.lol'
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

  const parseBunkerUrl = (url: string) => {
    try {
      if (!url.startsWith('bunker://')) {
        throw new Error('URL must start with bunker://');
      }
      
      const withoutProtocol = url.slice(9); // Remove 'bunker://'
      const [pubkeyPart, queryString] = withoutProtocol.split('?');
      
      if (!pubkeyPart) {
        throw new Error('Invalid bunker URL format. Missing pubkey');
      }
      
      let relay = '';
      let secret = '';
      
      if (queryString) {
        const params = new URLSearchParams(queryString);
        relay = params.get('relay') || '';
        secret = params.get('secret') || '';
      } else {
        // Legacy format: bunker://pubkey@relay
        const [pubkey, relayPart] = pubkeyPart.split('@');
        return { pubkey, relay: relayPart || '', secret: '' };
      }
      
      return { pubkey: pubkeyPart, relay, secret };
    } catch (error: any) {
      throw new Error(`Invalid bunker URL: ${error.message}`);
    }
  };

  const connectToRealBunker = async () => {
    if (!plugin || !bunkerUrl) {
      addLog('❌ Plugin not initialized or no bunker URL', 'error');
      return;
    }

    try {
      addLog('🔗 Attempting real bunker connection with automatic fallback...', 'info');
      addLog(`Bunker URL: ${bunkerUrl}`, 'info');
      
      // Parse the bunker URL
      const parsed = parseBunkerUrl(bunkerUrl);
      addLog(`Pubkey: ${parsed.pubkey}`, 'info');
      addLog(`Relay: ${parsed.relay}`, 'info');
      addLog(`Has secret: ${parsed.secret ? 'Yes' : 'No'}`, 'info');
      
      // Use the plugin's new connectToRemoteSigner method with automatic fallback
      const connectedIdentity = await plugin.connectToRemoteSigner(bunkerUrl);
      
      if (connectedIdentity) {
        setIdentity(connectedIdentity);
        setConnectionInfo({
          connected: true,
          bunkerUrl,
          pubkey: connectedIdentity.pubkey,
          relay: parsed.relay
        });
        addLog('✅ Real bunker connection successful!', 'success');
        addLog(`Connected as: ${connectedIdentity.npub}`, 'success');
        addLog(`Provider: ${connectedIdentity.provider}`, 'info');
      } else {
        throw new Error('Connection succeeded but no identity returned');
      }
    } catch (error: any) {
      addLog(`❌ Real bunker connection failed: ${error.message}`, 'error');
      setConnectionInfo({ connected: false, error: error.message });
    }
  };



  const runAllTests = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setTestResults([]);
    setLogs([]);
    setIdentity(null);
    setConnectionInfo({ connected: false });
    
    addLog('🚀 Starting Next.js NIP-46 Plugin Test Suite...', 'info');
    
    try {
      // Import Nip46Plugin from built framework
      const { Nip46Plugin } = await import('../../../framework/dist/plugins/auth/Nip46Plugin.js');
      
      // Test 1: Plugin Initialization
      let testPlugin: any;
      await runTest('Plugin Initialization', async () => {
        // Initialize with test configuration - disable auto-opening of auth URLs
        testPlugin = new Nip46Plugin({
          testMode: true, // Prevent auto-opening browser tabs
          onauth: null    // Explicitly disable auth handler to prevent window.open()
        });
        await testPlugin.initialize();
        setPlugin(testPlugin);
        addLog('NIP-46 Plugin initialized successfully (Test Mode)', 'info');
        addLog('⚠️ Auto-opening of auth URLs is disabled in test mode', 'warn');
      });

      // Test 2: Bunker URL Validation
      await runTest('Bunker URL Validation', async () => {
        const testUrl = bunkerUrl || 'bunker://npub1test@relay.example.com';
        
        try {
          const parsed = parseBunkerUrl(testUrl);
          addLog(`✅ URL parsed: pubkey=${parsed.pubkey.substring(0, 16)}..., relay=${parsed.relay}`, 'info');
        } catch (error: any) {
          throw new Error(`Bunker URL validation failed: ${error.message}`);
        }
        
        setBunkerUrl(testUrl);
      });

      // For remaining tests, we'll simulate them since NIP-46 requires real remote signers
      // Test 3: Connect to Remote Signer
      await runTest('Connect to Remote Signer', async () => {
        const currentUrl = bunkerUrl || 'bunker://npub1test@relay.example.com';
        
        // In a real implementation, this would connect to the remote signer
        // For testing, we'll simulate the connection process
        addLog('⚠️ SIMULATION: In production, this would connect to remote signer', 'warn');
        addLog(`Attempting connection to: ${currentUrl}`, 'info');
        
        // Simulate connection delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // For demo purposes, we'll mark as "connected" (simulated)
        setConnectionInfo({
          connected: true,
          bunkerUrl: currentUrl,
          relay: parseBunkerUrl(currentUrl).relay,
          pubkey: parseBunkerUrl(currentUrl).pubkey
        });
        
        addLog('✅ SIMULATION: Connection established', 'success');
      });

      // Test 4: Get Remote Public Key
      let remotePubkey = '';
      let isConnected = false;
      await runTest('Get Remote Public Key', async () => {
        const currentUrl = bunkerUrl || 'bunker://npub1test@relay.example.com';
        
        // Simulate getting remote public key
        remotePubkey = parseBunkerUrl(currentUrl).pubkey;
        isConnected = true;
        addLog(`✅ SIMULATION: Remote pubkey: ${remotePubkey}`, 'info');
      });

      // Test 5: Login with Remote Signer
      let loggedInIdentity: Identity;
      await runTest('Login with Remote Signer', async () => {
        if (!testPlugin) throw new Error('Plugin not initialized');
        if (!isConnected) throw new Error('Not connected to remote signer');
        
        // Simulate login process
        addLog('⚠️ SIMULATION: In production, this would require user authorization', 'warn');
        
        const currentUrl = bunkerUrl || 'bunker://npub1test@relay.example.com';
        
        loggedInIdentity = {
          pubkey: remotePubkey.startsWith('npub') ? 'simulated-hex-pubkey' : remotePubkey,
          npub: remotePubkey.startsWith('npub') ? remotePubkey : 'npub1simulated',
          provider: 'nip46-remote-signer',
          displayName: 'Remote Signer (Simulated)',
          metadata: { bunkerUrl: currentUrl },
          capabilities: {
            canSign: true,
            canEncrypt: true,
            canDecrypt: true
          }
        };
        
        setIdentity(loggedInIdentity);
        addLog(`✅ SIMULATION: Login successful`, 'success');
        addLog(`NPUB: ${loggedInIdentity.npub}`, 'info');
        addLog(`Provider: ${loggedInIdentity.provider}`, 'info');
      });

      // Test 6: Get Identity
      await runTest('Get Identity', async () => {
        if (!testPlugin) throw new Error('Plugin not initialized');
        
        // Simulate getting current identity
        if (!loggedInIdentity) {
          throw new Error('No identity available');
        }
        
        addLog(`✅ SIMULATION: Identity verified: ${loggedInIdentity.npub}`, 'success');
      });

      // Test 7: Get Remote Signer
      let remoteSigner: any;
      await runTest('Get Remote Signer', async () => {
        if (!testPlugin) throw new Error('Plugin not initialized');
        
        // Simulate getting remote signer
        remoteSigner = {
          type: 'nip46-remote',
          pubkey: loggedInIdentity.pubkey,
          signEvent: async (event: any) => {
            addLog('⚠️ SIMULATION: Would send signing request to remote signer', 'warn');
            return { ...event, sig: 'simulated-signature', id: 'simulated-event-id' };
          },
          nip04Encrypt: async (pubkey: string, plaintext: string) => {
            addLog('⚠️ SIMULATION: Would encrypt via remote signer', 'warn');
            return 'simulated-encrypted-content';
          },
          nip04Decrypt: async (pubkey: string, ciphertext: string) => {
            addLog('⚠️ SIMULATION: Would decrypt via remote signer', 'warn');
            return 'simulated-decrypted-content';
          }
        };
        
        addLog(`✅ SIMULATION: Remote signer obtained`, 'success');
        addLog(`Signer type: ${remoteSigner.type}`, 'info');
      });

      // Test 8: Sign Test Event
      let signedEvent: any;
      await runTest('Sign Test Event', async () => {
        if (!remoteSigner) throw new Error('Remote signer not available');
        
        const testEvent = {
          kind: 1,
          content: `Next.js NIP-46 Plugin Test - ${new Date().toISOString()}`,
          tags: [
            ['client', 'nostr-framework-nextjs-test'],
            ['t', 'test'],
            ['t', 'nip46']
          ],
          created_at: Math.floor(Date.now() / 1000)
        };
        
        signedEvent = await remoteSigner.signEvent(testEvent);
        
        addLog(`✅ SIMULATION: Event signed`, 'success');
        addLog(`Event ID: ${signedEvent.id}`, 'info');
        addLog(`Signature: ${signedEvent.sig}`, 'info');
      });

      // Test 9: Get Signer Info
      await runTest('Get Signer Info', async () => {
        if (!remoteSigner) throw new Error('Remote signer not available');
        
        addLog(`Signer pubkey: ${remoteSigner.pubkey}`, 'info');
        addLog(`Signer type: ${remoteSigner.type}`, 'info');
        addLog(`Has signEvent: ${typeof remoteSigner.signEvent === 'function'}`, 'info');
        addLog(`Has nip04Encrypt: ${typeof remoteSigner.nip04Encrypt === 'function'}`, 'info');
        addLog(`Has nip04Decrypt: ${typeof remoteSigner.nip04Decrypt === 'function'}`, 'info');
      });

      // Test 10: NIP-04 Encryption
      let encryptedMessage = '';
      await runTest('NIP-04 Encryption (if supported)', async () => {
        if (!remoteSigner || !loggedInIdentity) {
          runSkippedTest('NIP-04 Encryption (if supported)', 'Remote signer or identity not available');
          return;
        }
        
        const testMessage = 'Hello from Next.js NIP-46 test!';
        
        try {
          encryptedMessage = await remoteSigner.nip04Encrypt(loggedInIdentity.pubkey, testMessage);
          addLog(`✅ SIMULATION: Message encrypted`, 'success');
          addLog(`Encrypted: ${encryptedMessage}`, 'info');
        } catch (error: any) {
          runSkippedTest('NIP-04 Encryption (if supported)', `Encryption failed: ${error.message}`);
        }
      });

      // Test 11: NIP-04 Decryption
      await runTest('NIP-04 Decryption (if supported)', async () => {
        if (!remoteSigner || !loggedInIdentity || !encryptedMessage) {
          runSkippedTest('NIP-04 Decryption (if supported)', 'Prerequisites not met');
          return;
        }
        
        try {
          const decryptedMessage = await remoteSigner.nip04Decrypt(loggedInIdentity.pubkey, encryptedMessage);
          addLog(`✅ SIMULATION: Message decrypted: "${decryptedMessage}"`, 'success');
        } catch (error: any) {
          runSkippedTest('NIP-04 Decryption (if supported)', `Decryption failed: ${error.message}`);
        }
      });

      // Test 12: Disconnect
      await runTest('Disconnect', async () => {
        if (!testPlugin) throw new Error('Plugin not initialized');
        
        // Simulate disconnect
        addLog('⚠️ SIMULATION: Disconnecting from remote signer', 'warn');
        
        setConnectionInfo({ connected: false });
        setIdentity(null);
        
        addLog('✅ SIMULATION: Disconnected successfully', 'success');
      });

      // Test 13: Connection Cleanup
      await runTest('Connection Cleanup', async () => {
        if (!testPlugin) throw new Error('Plugin not initialized');
        
        // Simulate cleanup
        await testPlugin.logout();
        addLog('✅ SIMULATION: Plugin cleanup completed', 'success');
      });

      addLog('🎉 All Next.js NIP-46 tests completed successfully!', 'success');
      addLog('ℹ️ Note: This test used simulations since NIP-46 requires real remote signers', 'info');
      
    } catch (error: any) {
      addLog(`💥 Next.js NIP-46 test suite failed: ${error.message}`, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const testConnection = async () => {
    if (!bunkerUrl && !customBunker) {
      addLog('❌ Please enter a bunker URL', 'error');
      return;
    }
    
    const testUrl = customBunker || bunkerUrl;
    
    try {
      addLog(`🔍 Testing connection to: ${testUrl}`, 'info');
      const parsed = parseBunkerUrl(testUrl);
      addLog(`✅ URL valid: pubkey=${parsed.pubkey.substring(0, 16)}..., relay=${parsed.relay}`, 'success');
      setBunkerUrl(testUrl);
      
      // In production, this would attempt actual connection
      addLog('⚠️ SIMULATION: In production, this would test the actual connection', 'warn');
    } catch (error: any) {
      addLog(`❌ Connection test failed: ${error.message}`, 'error');
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // Initialize plugin on component mount
  useEffect(() => {
    const initializePlugin = async () => {
      try {
        // Import and initialize Nip46Plugin from built framework
        const { Nip46Plugin } = await import('../../../framework/dist/plugins/auth/Nip46Plugin.js');
        const nip46 = new Nip46Plugin({
          testMode: true, // Prevent auto-opening browser tabs
          onauth: null    // Explicitly disable auth handler
        });
        await nip46.initialize();
        
        // NOTE: setupGlobalEvents() is intentionally NOT called in test mode
        // This prevents automatic opening of browser tabs when auth URLs are generated
        // if (typeof nip46.setupGlobalEvents === 'function') {
        //   nip46.setupGlobalEvents();
        // }
        addLog('⚠️ Global events disabled in test mode to prevent auto-opening tabs', 'warn');
        
        setPlugin(nip46);
        addLog('NIP-46 Plugin initialized successfully', 'success');
      } catch (error: any) {
        addLog(`Plugin initialization failed: ${error.message}`, 'error');
      }
    };

    initializePlugin();
  }, []);

  const successCount = testResults.filter(r => r.status === 'success').length;
  const skippedCount = testResults.filter(r => r.status === 'skipped').length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🔗 NIP-46 Plugin Test (Next.js)</h1>
        <p className={styles.subtitle}>
          Next.js-konvertierte Version des NIP-46 Remote Signer Tests
        </p>
      </div>

      <div className={styles.warning}>
        <strong>⚠️ HINWEIS:</strong> NIP-46 Tests werden simuliert, da echte Remote Signer 
        komplexe Setups und Autorisierungen erfordern. In Produktion würden echte 
        Verbindungen zu Remote Signers hergestellt.
      </div>

      <div className={styles.connectionSection}>
        <h3>Connection Configuration</h3>
        <div className={styles.connectionStatus}>
          <div className={`${styles.statusIndicator} ${connectionInfo.connected ? styles.connected : styles.disconnected}`}>
            {connectionInfo.connected ? '🟢 Connected (Simulated)' : '🔴 Disconnected'}
          </div>
          {connectionInfo.connected && (
            <div className={styles.connectionDetails}>
              <div>Bunker URL: {connectionInfo.bunkerUrl}</div>
              <div>Relay: {connectionInfo.relay}</div>
              <div>Pubkey: {connectionInfo.pubkey?.substring(0, 16)}...</div>
            </div>
          )}
        </div>

        <div className={styles.urlConfig}>
          <div className={styles.inputGroup}>
            <label htmlFor="bunkerUrl">Bunker URL:</label>
            <input
              id="bunkerUrl"
              type="text"
              placeholder="bunker://npub1...@relay.example.com"
              value={customBunker}
              onChange={(e) => setCustomBunker(e.target.value)}
              className={styles.input}
            />
            <button 
              onClick={() => {
                if (customBunker) {
                  setBunkerUrl(customBunker);
                  addLog(`Bunker URL aktualisiert: ${customBunker}`, 'info');
                }
              }} 
              className={`${styles.btn} ${styles.btnSecondary}`}
            >
              ✅ URL setzen
            </button>
          </div>
          
          <div className={styles.sampleUrls}>
            <strong>Sample URLs:</strong>
            {sampleBunkerUrls.map((url, index) => (
              <div key={index} className={styles.sampleUrl}>
                <code>{url}</code>
                <button 
                  onClick={() => setCustomBunker(url)} 
                  className={`${styles.btn} ${styles.btnSmall}`}
                >
                  Use
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.controls}>
        <button 
          onClick={runAllTests} 
          disabled={isRunning}
          className={`${styles.btn} ${styles.btnPrimary}`}
        >
          {isRunning ? '🔄 Tests laufen...' : '▶️ Simulation Tests'}
        </button>
        
        <button 
          onClick={connectToRealBunker} 
          disabled={!plugin || !bunkerUrl || connectionInfo.connected}
          className={`${styles.btn} ${styles.btnPrimary}`}
        >
          🔗 Echte Verbindung (Auto-Fallback)
        </button>



        <button 
          onClick={() => {
            setConnectionInfo({ connected: false });
            setIdentity(null);
            addLog('Verbindung getrennt', 'info');
          }}
          disabled={!connectionInfo.connected}
          className={`${styles.btn} ${styles.btnSecondary}`}
        >
          ❌ Trennen
        </button>
        
        <button 
          onClick={clearLogs}
          className={`${styles.btn} ${styles.btnSecondary}`}
        >
          🗑️ Logs löschen
        </button>

        <div className={styles.status}>
          Connection: {connectionInfo.connected ? '✅ Connected' : '❌ Disconnected'}
        </div>
      </div>

      {identity && (
        <div className={styles.identityCard}>
          <h3>Remote Identity</h3>
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
            <strong>Bunker URL:</strong>
            <span>{identity.metadata?.bunkerUrl || 'N/A'}</span>
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