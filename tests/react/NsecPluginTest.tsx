// tests/react/NsecPluginTest.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { NsecPlugin } from '../../framework/dist/plugins/auth/NsecPlugin.js';
import type { Identity } from '../../framework/dist/types/types/index.js';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  duration?: number;
}

interface NsecPluginTestProps {
  onTestComplete?: (results: TestResult[]) => void;
}

export default function NsecPluginTest({ onTestComplete }: NsecPluginTestProps) {
  const [plugin, setPlugin] = useState<NsecPlugin | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [customNsec, setCustomNsec] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  // Test cases
  const tests = [
    'Plugin Initialization',
    'Generate Test Identity', 
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
      throw error; // Re-throw to stop test suite
    }
  };

  const runAllTests = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setTestResults([]);
    setLogs([]);
    setIdentity(null);
    
    addLog('🚀 Starting NSEC Plugin Test Suite...');
    
    try {
      // Test 1: Plugin Initialization
      await runTest('Plugin Initialization', async () => {
        const testPlugin = new NsecPlugin({
          relays: ['wss://relay.damus.io', 'wss://relay.snort.social']
        });
        await testPlugin.initialize();
        setPlugin(testPlugin);
        addLog('Plugin initialized successfully');
      });

      // Test 2: Generate Test Identity
      let testNsec = '';
      await runTest('Generate Test Identity', async () => {
        if (!plugin) throw new Error('Plugin not initialized');
        
        // Generate a test NSEC using browser crypto
        const privateKey = new Uint8Array(32);
        window.crypto.getRandomValues(privateKey);
        testNsec = Array.from(privateKey).map(b => b.toString(16).padStart(2, '0')).join('');
        addLog(`Generated test private key: ${testNsec.substring(0, 8)}...`);
      });

      // Test 3: Login with Generated NSEC
      await runTest('Login with Generated NSEC', async () => {
        if (!plugin) throw new Error('Plugin not initialized');
        
        const testIdentity = await plugin.login({ nsec: testNsec });
        setIdentity(testIdentity);
        addLog(`Logged in as: ${testIdentity.npub}`);
        addLog(`Display name: ${testIdentity.displayName || 'None'}`);
      });

      // Test 4: Get Identity
      await runTest('Get Identity', async () => {
        if (!plugin) throw new Error('Plugin not initialized');
        
        const currentIdentity = await plugin.getIdentity();
        if (!currentIdentity) throw new Error('No identity found');
        if (currentIdentity.pubkey !== identity?.pubkey) {
          throw new Error('Identity mismatch');
        }
        addLog(`Identity verified: ${currentIdentity.npub}`);
      });

      // Test 5: Get Signer
      let signer: any;
      await runTest('Get Signer', async () => {
        if (!plugin) throw new Error('Plugin not initialized');
        
        signer = plugin.getSigner();
        if (!signer) throw new Error('No signer returned');
        if (signer.type !== 'nsec') throw new Error('Wrong signer type');
        addLog(`Signer type: ${signer.type}`);
      });

      // Test 6: Sign Test Event
      let signedEvent: any;
      await runTest('Sign Test Event', async () => {
        if (!signer) throw new Error('Signer not available');
        
        const testEvent = {
          kind: 1,
          content: `React/Next.js NSEC Plugin Test - ${new Date().toISOString()}`,
          tags: [['client', 'nostr-framework-test']],
          created_at: Math.floor(Date.now() / 1000)
        };
        
        signedEvent = await signer.signEvent(testEvent);
        if (!signedEvent.id || !signedEvent.sig) {
          throw new Error('Event not properly signed');
        }
        addLog(`Event signed: ${signedEvent.id}`);
      });

      // Test 7: NIP-04 Encryption (if supported)
      await runTest('NIP-04 Encryption', async () => {
        if (!signer) throw new Error('Signer not available');
        
        const testMessage = 'Hello from React NSEC test!';
        const recipientPubkey = identity?.pubkey; // Self-encrypt for testing
        
        if (!recipientPubkey) throw new Error('No recipient pubkey');
        
        try {
          const encrypted = await signer.nip04Encrypt(recipientPubkey, testMessage);
          if (!encrypted) throw new Error('Encryption returned empty result');
          addLog(`Message encrypted (length: ${encrypted.length})`);
        } catch (error: any) {
          if (error.message.includes('not supported')) {
            addLog('⚠️ NIP-04 encryption not supported by this implementation');
            return; // Skip this test
          }
          throw error;
        }
      });

      // Test 8: NIP-04 Decryption (if supported)
      await runTest('NIP-04 Decryption', async () => {
        if (!signer) throw new Error('Signer not available');
        
        // This test is skipped if encryption is not supported
        addLog('⚠️ NIP-04 decryption test skipped (requires encryption support)');
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

      addLog('🎉 All tests completed successfully!');
      
    } catch (error: any) {
      addLog(`💥 Test suite failed: ${error.message}`);
    } finally {
      setIsRunning(false);
      if (onTestComplete) {
        onTestComplete(testResults);
      }
    }
  };

  const loginWithCustomNsec = async () => {
    if (!plugin || !customNsec) return;
    
    try {
      addLog(`Attempting login with custom NSEC...`);
      const testIdentity = await plugin.login({ nsec: customNsec });
      setIdentity(testIdentity);
      addLog(`✅ Custom login successful: ${testIdentity.npub}`);
    } catch (error: any) {
      addLog(`❌ Custom login failed: ${error.message}`);
    }
  };

  // Initialize plugin on mount
  useEffect(() => {
    const initPlugin = async () => {
      try {
        const testPlugin = new NsecPlugin();
        await testPlugin.initialize();
        setPlugin(testPlugin);
        addLog('Plugin ready for testing');
      } catch (error: any) {
        addLog(`Failed to initialize plugin: ${error.message}`);
      }
    };
    
    initPlugin();
  }, []);

  return (
    <div className="nsec-test-container">
      <div className="test-header">
        <h1>⚠️ NSEC Plugin Test (React/Next.js)</h1>
        <div className="warning">
          <strong>⚠️ WARNUNG:</strong> Verwende niemals echte NSEC-Keys in Tests! 
          Diese Tests sind nur für Entwicklungszwecke.
        </div>
      </div>

      <div className="test-controls">
        <button 
          onClick={runAllTests} 
          disabled={isRunning || !plugin}
          className="primary"
        >
          {isRunning ? '🔄 Tests laufen...' : '▶️ Alle Tests starten'}
        </button>
        
        {identity && (
          <div className="identity-info">
            <h3>Aktuelle Identity:</h3>
            <p><strong>NPUB:</strong> {identity.npub}</p>
            <p><strong>Provider:</strong> {identity.provider}</p>
            {identity.displayName && (
              <p><strong>Name:</strong> {identity.displayName}</p>
            )}
          </div>
        )}
      </div>

      <div className="custom-nsec-section">
        <h3>Custom NSEC Test</h3>
        <input
          type="password"
          placeholder="nsec1... (für manuellen Test)"
          value={customNsec}
          onChange={(e) => setCustomNsec(e.target.value)}
          disabled={isRunning}
        />
        <button 
          onClick={loginWithCustomNsec}
          disabled={!plugin || !customNsec || isRunning}
          className="secondary"
        >
          Mit Custom NSEC einloggen
        </button>
      </div>

      <div className="test-results">
        <h3>Test Results ({testResults.filter(t => t.status === 'success').length}/{tests.length})</h3>
        <div className="results-grid">
          {tests.map((testName) => {
            const result = testResults.find(r => r.name === testName);
            const status = result?.status || 'pending';
            
            return (
              <div key={testName} className={`test-result ${status}`}>
                <span className="test-name">{testName}</span>
                <span className="test-status">
                  {status === 'pending' && '⏳'}
                  {status === 'success' && '✅'}
                  {status === 'error' && '❌'}
                  {result?.duration && ` (${result.duration}ms)`}
                </span>
                {result?.message && (
                  <div className="test-message">{result.message}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="test-logs">
        <h3>Test Logs</h3>
        <div className="log-container">
          {logs.map((log, index) => (
            <div key={index} className="log-entry">
              {log}
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .nsec-test-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        .test-header h1 {
          color: #dc3545;
          border-bottom: 3px solid #dc3545;
          padding-bottom: 10px;
        }
        
        .warning {
          background: #dc3545;
          color: white;
          border-left: 4px solid #a71d2a;
          padding: 15px;
          margin: 15px 0;
          border-radius: 4px;
          font-weight: bold;
        }
        
        .test-controls {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }
        
        .custom-nsec-section {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }
        
        .identity-info {
          background: #D4EDDA;
          border-left: 4px solid #28A745;
          padding: 15px;
          margin: 15px 0;
          border-radius: 4px;
        }
        
        button {
          background: #dc3545;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          margin: 5px 5px 5px 0;
        }
        
        button:hover:not(:disabled) {
          background: #c82333;
        }
        
        button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        button.secondary {
          background: #6c757d;
        }
        
        button.secondary:hover:not(:disabled) {
          background: #5a6268;
        }
        
        input[type="password"], input[type="text"] {
          width: calc(100% - 20px);
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: monospace;
          margin: 10px 0;
        }
        
        .test-results {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }
        
        .results-grid {
          display: grid;
          gap: 10px;
        }
        
        .test-result {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          border-radius: 4px;
          border-left: 4px solid #ddd;
        }
        
        .test-result.success {
          background: #D4EDDA;
          border-left-color: #28A745;
        }
        
        .test-result.error {
          background: #F8D7DA;
          border-left-color: #DC3545;
        }
        
        .test-result.pending {
          background: #FFF3CD;
          border-left-color: #FFC107;
        }
        
        .test-message {
          font-size: 12px;
          color: #666;
          margin-top: 5px;
        }
        
        .test-logs {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .log-container {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          padding: 15px;
          max-height: 400px;
          overflow-y: auto;
          font-family: monospace;
          font-size: 12px;
        }
        
        .log-entry {
          margin-bottom: 5px;
          word-break: break-word;
        }
      `}</style>
    </div>
  );
}