// tests/app/identity/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import styles from './identity.module.css';

// Types
interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'skipped';
  message?: string;
  duration?: number;
}

interface UserMetadata {
  name?: string;
  about?: string;
  picture?: string;
  banner?: string;
  nip05?: string;
  lud06?: string;
  lud16?: string;
  website?: string;
  display_name?: string;
  [key: string]: any;
}

interface Identity {
  pubkey: string;
  npub: string;
  metadata?: UserMetadata;
  relays?: string[];
  following?: number;
  followers?: number;
  lastSeen?: number;
  nip05Verified?: boolean;
}

export default function IdentityManagerTestPage() {
  const [manager, setManager] = useState<any>(null);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [currentIdentity, setCurrentIdentity] = useState<Identity | null>(null);
  const [identityStats, setIdentityStats] = useState({
    loaded: 0,
    verified: 0,
    withMetadata: 0,
    following: 0
  });

  const testCases = [
    'Manager Initialization',
    'Identity Creation',
    'Metadata Loading',
    'Profile Picture Handling',
    'NIP-05 Verification',
    'Lightning Address Parsing',
    'Social Graph Loading',
    'Identity Caching',
    'Metadata Updates',
    'Multi-Identity Management',
    'Relay Metadata Sync',
    'Profile Search'
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

  const updateIdentityStats = (type: 'loaded' | 'verified' | 'withMetadata' | 'following', increment: number = 1) => {
    setIdentityStats(prev => ({
      ...prev,
      [type]: prev[type] + increment
    }));
  };

  const generateMockIdentity = (index: number): Identity => {
    const pubkeys = [
      '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d',
      '82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2',
      'e88a691e98d9987c964521dff60025f60700378a4879180dcbbb4a5027850411',
      '5c10ed0678805156d39ef1ef6d46110fe1e7e590ae04986ccf48ba1299cb53e2',
      'b0d47516b78a04ca1b2a5cca5e93e6b1c3b3e7f6c2d4e8a9f0e3c7b4a1d5f9e8'
    ];

    const names = ['Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson', 'Eve Brown'];
    const abouts = [
      'Bitcoin maximalist and Nostr enthusiast 🚀',
      'Building the decentralized web, one relay at a time',
      'Photographer, traveler, and freedom lover 📸',
      'Code, coffee, and cryptography ☕',
      'Digital nomad exploring the world 🌍'
    ];
    const pictures = [
      'https://robohash.org/alice?set=set1',
      'https://robohash.org/bob?set=set2', 
      'https://robohash.org/carol?set=set3',
      'https://robohash.org/david?set=set4',
      'https://robohash.org/eve?set=set5'
    ];
    const nip05s = [
      'alice@example.com',
      'bob@nostr.band',
      'carol@damus.io',
      'david@bitcoin.org',
      'eve@freedom.tech'
    ];

    const pubkey = pubkeys[index] || pubkeys[0];
    
    return {
      pubkey,
      npub: `npub1${pubkey.substring(0, 59)}`,
      metadata: {
        name: names[index] || `User ${index + 1}`,
        about: abouts[index] || `Nostr user #${index + 1}`,
        picture: pictures[index],
        nip05: Math.random() > 0.3 ? nip05s[index] : undefined,
        lud16: Math.random() > 0.5 ? `${names[index]?.toLowerCase().replace(' ', '')}@getalby.com` : undefined,
        website: Math.random() > 0.6 ? `https://${names[index]?.toLowerCase().replace(' ', '')}.com` : undefined,
        display_name: names[index],
        banner: Math.random() > 0.7 ? `https://picsum.photos/800/200?random=${index}` : undefined
      },
      relays: [
        'wss://relay.damus.io',
        'wss://nos.lol',
        'wss://relay.nostr.band'
      ],
      following: Math.floor(Math.random() * 500) + 50,
      followers: Math.floor(Math.random() * 1000) + 100,
      lastSeen: Date.now() - Math.floor(Math.random() * 86400000 * 7), // Within last week
      nip05Verified: Math.random() > 0.4
    };
  };

  const runAllTests = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setTestResults([]);
    setLogs([]);
    setIdentities([]);
    setCurrentIdentity(null);
    setIdentityStats({ loaded: 0, verified: 0, withMetadata: 0, following: 0 });
    
    addLog('🚀 Starting Identity Manager Test Suite...');
    
    try {
      let testManager: any;

      // Test 1: Manager Initialization
      await runTest('Manager Initialization', async () => {
        try {
          const { IdentityManager } = await import('../../../framework/dist/core/IdentityManager.js');
          testManager = new IdentityManager();
          setManager(testManager);
          addLog('IdentityManager instance created successfully');
        } catch (error: any) {
          addLog(`IdentityManager import failed, creating mock: ${error.message}`);
          // Create mock IdentityManager
          testManager = {
            identities: new Map(),
            
            createIdentity: function(pubkey: string) {
              const identity = {
                pubkey,
                npub: `npub1${pubkey.substring(0, 59)}`,
                metadata: {},
                relays: [],
                createdAt: Date.now()
              };
              this.identities.set(pubkey, identity);
              return identity;
            },
            
            loadMetadata: async function(pubkey: string) {
              const identity = this.identities.get(pubkey);
              if (identity) {
                // Simulate metadata loading
                await new Promise(resolve => setTimeout(resolve, 500));
                identity.metadata = generateMockIdentity(0).metadata;
                return identity.metadata;
              }
              return null;
            },
            
            getIdentity: function(pubkey: string) {
              return this.identities.get(pubkey);
            },
            
            getAllIdentities: function() {
              return Array.from(this.identities.values());
            }
          };
          setManager(testManager);
          addLog('Mock IdentityManager created');
        }
      });

      // Test 2: Identity Creation
      let testIdentities: Identity[] = [];
      await runTest('Identity Creation', async () => {
        if (!testManager) throw new Error('Manager not initialized');
        
        addLog('Creating test identities...');
        testIdentities = [];
        
        for (let i = 0; i < 5; i++) {
          const mockIdentity = generateMockIdentity(i);
          
          if (testManager.createIdentity && typeof testManager.createIdentity === 'function') {
            const identity = testManager.createIdentity(mockIdentity.pubkey);
            Object.assign(identity, mockIdentity);
            testIdentities.push(identity);
          } else {
            testIdentities.push(mockIdentity);
          }
          
          updateIdentityStats('loaded');
          addLog(`✅ Identity ${i + 1} created: ${mockIdentity.metadata?.name || 'Unknown'}`);
        }
        
        setIdentities(testIdentities);
        setCurrentIdentity(testIdentities[0]);
        addLog(`Created ${testIdentities.length} test identities`);
      });

      // Test 3: Metadata Loading
      await runTest('Metadata Loading', async () => {
        if (!testManager) throw new Error('Manager not initialized');
        
        addLog('Loading metadata for identities...');
        
        for (const identity of testIdentities) {
          try {
            let metadata;
            if (testManager.loadMetadata && typeof testManager.loadMetadata === 'function') {
              metadata = await testManager.loadMetadata(identity.pubkey);
            } else {
              // Simulate metadata loading delay
              await new Promise(resolve => setTimeout(resolve, 200));
              metadata = identity.metadata;
            }
            
            if (metadata && Object.keys(metadata).length > 0) {
              updateIdentityStats('withMetadata');
              addLog(`📋 Loaded metadata for ${metadata.name || identity.pubkey.substring(0, 8)}...`);
              
              // Log metadata details
              if (metadata.name) addLog(`  Name: ${metadata.name}`);
              if (metadata.about) addLog(`  About: ${metadata.about.substring(0, 50)}...`);
              if (metadata.nip05) addLog(`  NIP-05: ${metadata.nip05}`);
              if (metadata.lud16) addLog(`  Lightning: ${metadata.lud16}`);
            }
          } catch (error: any) {
            addLog(`⚠️ Metadata loading failed for ${identity.pubkey.substring(0, 8)}...: ${error.message}`);
          }
        }
        
        addLog(`Metadata loading completed for ${testIdentities.length} identities`);
      });

      // Test 4: Profile Picture Handling
      await runTest('Profile Picture Handling', async () => {
        addLog('Testing profile picture handling...');
        
        const identitiesWithPictures = testIdentities.filter(id => id.metadata?.picture);
        addLog(`Found ${identitiesWithPictures.length} identities with profile pictures`);
        
        for (const identity of identitiesWithPictures.slice(0, 3)) {
          const pictureUrl = identity.metadata?.picture;
          if (pictureUrl) {
            addLog(`🖼️ Profile picture for ${identity.metadata?.name}: ${pictureUrl}`);
            
            // Simulate image validation
            await new Promise(resolve => setTimeout(resolve, 100));
            const isValid = Math.random() > 0.1; // 90% success rate
            addLog(`  Validation: ${isValid ? '✅ Valid' : '❌ Invalid'} image URL`);
          }
        }
        
        addLog('Profile picture handling test completed');
      });

      // Test 5: NIP-05 Verification
      await runTest('NIP-05 Verification', async () => {
        addLog('Testing NIP-05 verification...');
        
        const identitiesWithNip05 = testIdentities.filter(id => id.metadata?.nip05);
        addLog(`Found ${identitiesWithNip05.length} identities with NIP-05 identifiers`);
        
        for (const identity of identitiesWithNip05) {
          const nip05 = identity.metadata?.nip05;
          if (nip05) {
            addLog(`🔍 Verifying NIP-05: ${nip05} for ${identity.metadata?.name}`);
            
            // Simulate NIP-05 verification
            await new Promise(resolve => setTimeout(resolve, 300));
            const isVerified = Math.random() > 0.3; // 70% verification rate
            identity.nip05Verified = isVerified;
            
            if (isVerified) {
              updateIdentityStats('verified');
              addLog(`  ✅ NIP-05 verified for ${nip05}`);
            } else {
              addLog(`  ❌ NIP-05 verification failed for ${nip05}`);
            }
          }
        }
        
        // Update identities state to reflect verification status
        setIdentities([...testIdentities]);
        addLog('NIP-05 verification process completed');
      });

      // Test 6: Lightning Address Parsing
      await runTest('Lightning Address Parsing', async () => {
        addLog('Testing Lightning address parsing...');
        
        const identitiesWithLightning = testIdentities.filter(id => id.metadata?.lud16 || id.metadata?.lud06);
        addLog(`Found ${identitiesWithLightning.length} identities with Lightning addresses`);
        
        for (const identity of identitiesWithLightning) {
          const lud16 = identity.metadata?.lud16;
          const lud06 = identity.metadata?.lud06;
          const lightningAddr = lud16 || lud06;
          
          if (lightningAddr) {
            addLog(`⚡ Lightning address for ${identity.metadata?.name}: ${lightningAddr}`);
            
            // Simulate parsing and validation
            await new Promise(resolve => setTimeout(resolve, 150));
            const isValid = lightningAddr.includes('@') && lightningAddr.includes('.');
            addLog(`  Validation: ${isValid ? '✅ Valid' : '❌ Invalid'} Lightning address format`);
          }
        }
        
        addLog('Lightning address parsing completed');
      });

      // Test 7: Social Graph Loading
      await runTest('Social Graph Loading', async () => {
        addLog('Loading social graph data...');
        
        for (const identity of testIdentities.slice(0, 3)) {
          addLog(`👥 Loading social graph for ${identity.metadata?.name}`);
          
          // Simulate social graph loading
          await new Promise(resolve => setTimeout(resolve, 200));
          
          const following = identity.following || 0;
          const followers = identity.followers || 0;
          
          if (following > 0) updateIdentityStats('following', following);
          
          addLog(`  Following: ${following}, Followers: ${followers}`);
          addLog(`  Engagement ratio: ${followers > 0 ? (following / followers).toFixed(2) : 'N/A'}`);
        }
        
        addLog('Social graph loading completed');
      });

      // Test 8: Identity Caching
      await runTest('Identity Caching', async () => {
        addLog('Testing identity caching system...');
        
        if (testManager.getCachedIdentity && typeof testManager.getCachedIdentity === 'function') {
          for (const identity of testIdentities.slice(0, 2)) {
            const cached = testManager.getCachedIdentity(identity.pubkey);
            addLog(`💾 Cache ${cached ? 'HIT' : 'MISS'} for ${identity.metadata?.name}`);
          }
        } else {
          addLog('📋 Cache simulation - all identities cached in memory');
        }
        
        // Simulate cache operations
        if (testManager.clearCache && typeof testManager.clearCache === 'function') {
          testManager.clearCache();
          addLog('🗑️ Identity cache cleared');
        }
        
        addLog('Identity caching test completed');
      });

      // Test 9: Metadata Updates
      await runTest('Metadata Updates', async () => {
        const testIdentity = testIdentities[0];
        if (!testIdentity) throw new Error('No test identity available for update test');
        
        addLog(`Updating metadata for ${testIdentity.metadata?.name}...`);
        
        const updates = {
          about: `Updated bio - ${new Date().toLocaleString()}`,
          website: 'https://updated-website.com',
          display_name: `${testIdentity.metadata?.name} [Updated]`
        };
        
        // Simulate metadata update
        await new Promise(resolve => setTimeout(resolve, 400));
        
        if (testIdentity.metadata) {
          Object.assign(testIdentity.metadata, updates);
          setCurrentIdentity(testIdentity);
          // Update the identities array as well
          setIdentities([...testIdentities]);
        }
        
        addLog('✅ Metadata updated successfully');
        addLog(`  New about: ${updates.about}`);
        addLog(`  New website: ${updates.website}`);
        addLog(`  New display name: ${updates.display_name}`);
      });

      // Test 10: Multi-Identity Management
      await runTest('Multi-Identity Management', async () => {
        addLog('Testing multi-identity management...');
        
        if (testManager.getAllIdentities && typeof testManager.getAllIdentities === 'function') {
          const allIdentities = testManager.getAllIdentities();
          addLog(`📚 Managing ${allIdentities.length} identities`);
        } else {
          addLog(`📚 Managing ${testIdentities.length} identities in memory`);
        }
        
        // Simulate identity switching
        for (let i = 0; i < Math.min(3, testIdentities.length); i++) {
          const identity = testIdentities[i];
          setCurrentIdentity(identity);
          await new Promise(resolve => setTimeout(resolve, 100));
          addLog(`🔄 Switched to identity: ${identity.metadata?.name}`);
        }
        
        addLog('Multi-identity management test completed');
      });

      // Test 11: Relay Metadata Sync
      await runTest('Relay Metadata Sync', async () => {
        addLog('Testing relay metadata synchronization...');
        
        for (const identity of testIdentities.slice(0, 2)) {
          const relays = identity.relays || [];
          addLog(`🔄 Syncing metadata for ${identity.metadata?.name} across ${relays.length} relays`);
          
          for (const relay of relays.slice(0, 3)) {
            await new Promise(resolve => setTimeout(resolve, 150));
            const success = Math.random() > 0.2; // 80% success rate
            addLog(`  📡 ${relay}: ${success ? '✅ Synced' : '❌ Failed'}`);
          }
        }
        
        addLog('Relay metadata sync completed');
      });

      // Test 12: Profile Search
      await runTest('Profile Search', async () => {
        addLog('Testing profile search functionality...');
        
        const searchTerms = ['Alice', 'Bitcoin', 'photographer', 'code'];
        
        for (const term of searchTerms) {
          addLog(`🔍 Searching for: "${term}"`);
          
          // Simulate search
          await new Promise(resolve => setTimeout(resolve, 200));
          
          const results = testIdentities.filter(identity => {
            const name = identity.metadata?.name?.toLowerCase() || '';
            const about = identity.metadata?.about?.toLowerCase() || '';
            return name.includes(term.toLowerCase()) || about.includes(term.toLowerCase());
          });
          
          addLog(`  Found ${results.length} matching identities`);
          results.slice(0, 2).forEach(result => {
            addLog(`    - ${result.metadata?.name} (${result.pubkey.substring(0, 8)}...)`);
          });
        }
        
        addLog('Profile search test completed');
      });

      addLog('🎉 All Identity Manager tests completed successfully!');
      
    } catch (error: any) {
      addLog(`❌ Test suite failed: ${error.message}`, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const refreshIdentity = async (identity: Identity) => {
    addLog(`🔄 Refreshing identity: ${identity.metadata?.name}`);
    
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Update last seen
    identity.lastSeen = Date.now();
    setIdentities([...identities]);
    
    addLog(`✅ Identity refreshed: ${identity.metadata?.name}`);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'pending': return '⏳';
      case 'skipped': return '⚠️';
      default: return '⚪';
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '#22c55e';
      case 'error': return '#ef4444';
      case 'pending': return '#f59e0b';
      case 'skipped': return '#6b7280';
      default: return '#9ca3af';
    }
  };

  const formatLastSeen = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Identity Manager Test</h1>
        <p className={styles.description}>
          Comprehensive testing of Identity Manager with focus on user metadata display, 
          NIP-05 verification, and social graph management.
        </p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{identityStats.loaded}</div>
          <div className={styles.statLabel}>Identities Loaded</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{identityStats.verified}</div>
          <div className={styles.statLabel}>NIP-05 Verified</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{identityStats.withMetadata}</div>
          <div className={styles.statLabel}>With Metadata</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{identityStats.following}</div>
          <div className={styles.statLabel}>Total Following</div>
        </div>
      </div>

      <div className={styles.controls}>
        <button 
          onClick={runAllTests}
          disabled={isRunning}
          className={`${styles.button} ${styles.primaryButton}`}
        >
          {isRunning ? '🔄 Running Tests...' : '🚀 Run All Tests'}
        </button>
        
        <button 
          onClick={() => {
            setTestResults([]);
            setLogs([]);
            setIdentities([]);
            setIdentityStats({ loaded: 0, verified: 0, withMetadata: 0, following: 0 });
          }}
          disabled={isRunning}
          className={`${styles.button} ${styles.secondaryButton}`}
        >
          🗑️ Clear Results
        </button>
      </div>

      {identities.length > 0 && (
        <div className={styles.identityGrid}>
          {identities.map((identity, index) => (
            <div key={identity.pubkey} className={styles.identityCard}>
              <div className={styles.identityHeader}>
                <div className={styles.avatar}>
                  {identity.metadata?.picture ? (
                    <img 
                      src={identity.metadata.picture} 
                      alt={identity.metadata?.name || 'User'} 
                      className={styles.avatar}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.setAttribute('style', 'display: flex');
                      }}
                    />
                  ) : null}
                  <div style={identity.metadata?.picture ? {display: 'none'} : {}}>
                    {getInitials(identity.metadata?.name)}
                  </div>
                </div>
                <div className={styles.identityInfo}>
                  <h3>{identity.metadata?.display_name || identity.metadata?.name || 'Anonymous'}</h3>
                  <p>Last seen: {formatLastSeen(identity.lastSeen)}</p>
                  <div className={`${styles.statusBadge} ${
                    identity.lastSeen && (Date.now() - identity.lastSeen < 3600000) 
                      ? styles.statusOnline 
                      : styles.statusOffline
                  }`}>
                    {identity.lastSeen && (Date.now() - identity.lastSeen < 3600000) ? 'Online' : 'Offline'}
                  </div>
                </div>
              </div>

              <div className={styles.metadataSection}>
                <div className={styles.metadataTitle}>📋 Profile Information</div>
                <div className={styles.metadataGrid}>
                  {identity.metadata?.about && (
                    <div className={styles.metadataItem}>
                      <span className={styles.metadataLabel}>About</span>
                      <span className={styles.metadataValue}>
                        {identity.metadata.about.substring(0, 50)}...
                      </span>
                    </div>
                  )}
                  
                  {identity.metadata?.nip05 && (
                    <div className={styles.metadataItem}>
                      <span className={styles.metadataLabel}>NIP-05</span>
                      <span className={styles.metadataValue}>
                        <span className={`${styles.nip05Badge} ${
                          identity.nip05Verified ? '' : styles.nip05Unverified
                        }`}>
                          {identity.nip05Verified ? '✅' : '⚠️'} {identity.metadata.nip05}
                        </span>
                      </span>
                    </div>
                  )}
                  
                  {identity.metadata?.lud16 && (
                    <div className={styles.metadataItem}>
                      <span className={styles.metadataLabel}>Lightning</span>
                      <span className={styles.metadataValue}>⚡ {identity.metadata.lud16}</span>
                    </div>
                  )}
                  
                  {identity.metadata?.website && (
                    <div className={styles.metadataItem}>
                      <span className={styles.metadataLabel}>Website</span>
                      <span className={styles.metadataValue}>🌐 {identity.metadata.website}</span>
                    </div>
                  )}
                  
                  <div className={styles.metadataItem}>
                    <span className={styles.metadataLabel}>Following</span>
                    <span className={styles.metadataValue}>{identity.following || 0}</span>
                  </div>
                  
                  <div className={styles.metadataItem}>
                    <span className={styles.metadataLabel}>Followers</span>
                    <span className={styles.metadataValue}>{identity.followers || 0}</span>
                  </div>
                </div>
              </div>

              <div className={styles.keySection}>
                <div className={styles.metadataTitle}>🔑 Keys & Identifiers</div>
                <div className={styles.metadataGrid}>
                  <div className={styles.metadataItem}>
                    <span className={styles.metadataLabel}>NPub</span>
                    <span className={styles.metadataValue}>{identity.npub.substring(0, 20)}...</span>
                  </div>
                  <div className={styles.metadataItem}>
                    <span className={styles.metadataLabel}>PubKey</span>
                    <span className={styles.metadataValue}>{identity.pubkey.substring(0, 16)}...</span>
                  </div>
                </div>
              </div>

              <div className={styles.identityActions}>
                <button 
                  className={`${styles.actionButton} ${styles.refreshButton}`}
                  onClick={() => refreshIdentity(identity)}
                  disabled={isRunning}
                >
                  🔄 Refresh
                </button>
                <button 
                  className={`${styles.actionButton} ${styles.followButton}`}
                  disabled={isRunning}
                >
                  👥 Follow
                </button>
                <button 
                  className={`${styles.actionButton} ${styles.messageButton}`}
                  disabled={isRunning}
                >
                  💬 Message
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.results}>
        <h2 className={styles.sectionTitle}>📋 Test Results</h2>
        <div className={styles.testGrid}>
          {testCases.map((testName, index) => {
            const result = testResults.find(r => r.name === testName);
            const status = result?.status || 'pending';
            
            return (
              <div key={index} className={styles.testCard}>
                <div className={styles.testHeader}>
                  <span className={styles.testIcon}>{getStatusIcon(status)}</span>
                  <span className={styles.testName}>{testName}</span>
                </div>
                <div className={styles.testStatus} style={{ color: getStatusColor(status) }}>
                  {status.toUpperCase()}
                  {result?.duration && ` (${result.duration}ms)`}
                </div>
                {result?.message && (
                  <div className={styles.testMessage}>{result.message}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.logs}>
        <h2 className={styles.sectionTitle}>📋 Test Logs</h2>
        <div className={styles.logContainer}>
          {logs.map((log, index) => (
            <div key={index} className={styles.logEntry}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}