// tests/app/page.tsx
'use client';

import Link from 'next/link';
import styles from './home.module.css';

export default function HomePage() {
  const testPages = [
    {
      name: 'NSEC Plugin Test',
      path: '/nsec',
      description: 'Test des NSEC Authentication Plugins',
      status: '✅ Konvertiert',
      original: 'test-nsec.html'
    },
    {
      name: 'NIP-07 Plugin Test',
      path: '/nip07',
      description: 'Test des NIP-07 Browser Extension Plugins',
      status: '✅ Konvertiert',
      original: 'test-nip07.html'
    },
    {
      name: 'NIP-46 Plugin Test',
      path: '/nip46',
      description: 'Test des NIP-46 Remote Signer Plugins',
      status: '✅ Konvertiert',
      original: 'test-nip46.html'
    },
    {
      name: 'Storage Plugin Test',
      path: '/storage',
      description: 'Test des Storage Plugin Systems',
      status: '✅ Konvertiert',
      original: 'test-storage.html'
    },
    {
      name: 'Signer Plugin Test',
      path: '/signer',
      description: 'Test des Signer Plugin Systems',
      status: '⏳ Ausstehend',
      original: 'test-signer.html'
    },
    {
      name: 'Event Manager Test',
      path: '/eventmanager',
      description: 'Test des Event Manager Systems',
      status: '✅ Konvertiert',
      original: 'test-eventmanager.html'
    },
    {
      name: 'Event Bus Test',
      path: '/eventbus',
      description: 'Test des Event Bus Systems',
      status: '⏳ Ausstehend',
      original: 'test-eventbus.html'
    },
    {
      name: 'Relay Manager Test',
      path: '/relay',
      description: 'Test des Relay Manager Systems',
      status: '✅ Konvertiert',
      original: 'test-relay.html'
    },
    {
      name: 'Identity Manager Test',
      path: '/identity',
      description: 'Test des Identity Manager Systems mit User-Metadaten',
      status: '✅ Konvertiert',
      original: 'test-identity.html'
    },
    {
      name: 'SQLite Storage Test',
      path: '/sqlite',
      description: 'Test des SQLite Storage Plugins mit DB-Operationen',
      status: '✅ Konvertiert',
      original: 'test-sqlite-storage.html'
    },
    {
      name: 'SQLite File Test',
      path: '/sqlite-file',
      description: 'Test des SQLite File Storage Plugins',
      status: '⏳ Ausstehend',
      original: 'test-sqlite-file.html'
    }
  ];

  const completedTests = testPages.filter(t => t.status.includes('✅')).length;
  const totalTests = testPages.length;

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <h1>🧪 Nostr Framework Test Dashboard</h1>
        <p className={styles.subtitle}>
          Next.js-konvertierte Tests für das TypeScript Nostr Framework
        </p>
        
        <div className={styles.progress}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${(completedTests / totalTests) * 100}%` }}
            />
          </div>
          <span className={styles.progressText}>
            {completedTests}/{totalTests} Tests konvertiert ({Math.round((completedTests / totalTests) * 100)}%)
          </span>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{totalTests}</div>
          <div className={styles.statLabel}>Gesamt Tests</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{completedTests}</div>
          <div className={styles.statLabel}>Konvertiert</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{totalTests - completedTests}</div>
          <div className={styles.statLabel}>Ausstehend</div>
        </div>
      </div>

      <div className={styles.testGrid}>
        {testPages.map((test) => {
          const isCompleted = test.status.includes('✅');
          
          return (
            <div key={test.path} className={`${styles.testCard} ${isCompleted ? styles.completed : styles.pending}`}>
              <div className={styles.testHeader}>
                <h3 className={styles.testName}>{test.name}</h3>
                <span className={styles.testStatus}>{test.status}</span>
              </div>
              
              <p className={styles.testDescription}>{test.description}</p>
              
              <div className={styles.testMeta}>
                <span className={styles.originalFile}>Original: {test.original}</span>
              </div>
              
              <div className={styles.testActions}>
                {isCompleted ? (
                  <Link href={test.path} className={`${styles.btn} ${styles.btnPrimary}`}>
                    🚀 Test ausführen
                  </Link>
                ) : (
                  <button disabled className={`${styles.btn} ${styles.btnDisabled}`}>
                    ⏳ In Entwicklung
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.info}>
        <h2>Migration Status</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <h3>✅ Abgeschlossen</h3>
            <ul>
              <li>TypeScript Framework Migration (100%)</li>
              <li>Next.js Test-Umgebung Setup</li>
              <li>NSEC Plugin Test Konvertierung</li>
              <li>Build-Pipeline Integration</li>
            </ul>
          </div>
          
          <div className={styles.infoCard}>
            <h3>🔄 In Arbeit</h3>
            <ul>
              <li>Test-Kompatibilität Validierung</li>
              <li>Plugin-Integration Tests</li>
              <li>Browser-API Kompatibilität</li>
              <li>Error Handling Verbesserungen</li>
            </ul>
          </div>
          
          <div className={styles.infoCard}>
            <h3>⏳ Geplant</h3>
            <ul>
              <li>Alle HTML-Tests zu React konvertieren</li>
              <li>Jest Unit Tests hinzufügen</li>
              <li>E2E Tests mit Playwright</li>
              <li>Performance Benchmarks</li>
            </ul>
          </div>
        </div>
      </div>

      <div className={styles.instructions}>
        <h2>Test-Anweisungen</h2>
        <div className={styles.stepsList}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepContent}>
              <h4>Development Server starten</h4>
              <code>cd tests && npm run dev</code>
            </div>
          </div>
          
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepContent}>
              <h4>Framework Build erstellen</h4>
              <code>cd framework && npm run build</code>
            </div>
          </div>
          
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <div className={styles.stepContent}>
              <h4>Tests im Browser ausführen</h4>
              <p>Navigiere zu den verfügbaren Test-Seiten und führe die Tests aus</p>
            </div>
          </div>
          
          <div className={styles.step}>
            <div className={styles.stepNumber}>4</div>
            <div className={styles.stepContent}>
              <h4>Ergebnisse validieren</h4>
              <p>Überprüfe die Test-Logs und -Ergebnisse in der Browser-Console</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}