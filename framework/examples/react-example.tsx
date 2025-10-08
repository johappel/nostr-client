// examples/react-example.tsx
// Praktisches Beispiel für React-Integration

import React, { useEffect, useState } from 'react';
import { useNostrFramework, useNostrEvents, useNostrProviders } from '@johappel/nostr-framework/react/simple-hooks';

/**
 * Einfache Nostr-Note Komponente
 */
export function NostrNoteExample() {
  const {
    framework,
    isInitialized,
    isLoading,
    currentIdentity,
    isAuthenticated,
    error,
    initialize,
    authenticate,
    logout,
    publishNote,
  } = useNostrFramework({
    relays: ['wss://relay.damus.io', 'wss://nos.lol'],
    debug: true
  });

  const { providers } = useNostrProviders(framework);
  const { events, isLoading: eventsLoading } = useNostrEvents(
    framework,
    [{ kinds: [1], limit: 10 }], // Text notes
    isAuthenticated
  );

  const [noteContent, setNoteContent] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  // Framework initialisieren
  useEffect(() => {
    initialize();
  }, [initialize]);

  const handlePublish = async () => {
    if (!noteContent.trim()) return;

    setIsPublishing(true);
    try {
      await publishNote(noteContent);
      setNoteContent('');
      alert('Note published successfully!');
    } catch (err) {
      alert('Failed to publish: ' + (err as Error).message);
    } finally {
      setIsPublishing(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>🔄 Initializing Nostr Framework...</h2>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>❌ Error</h2>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>🔐 Connect to Nostr</h2>
        <p>Please connect your Nostr wallet to continue.</p>
        
        <div style={{ marginBottom: '20px' }}>
          <h3>Available Providers:</h3>
          {providers.map(provider => (
            <button
              key={provider}
              onClick={() => authenticate(provider)}
              style={{
                margin: '5px',
                padding: '10px 15px',
                backgroundColor: '#007cba',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Connect with {provider}
            </button>
          ))}
        </div>

        {providers.length === 0 && (
          <p>
            <strong>No providers available.</strong><br/>
            Please install a Nostr browser extension like{' '}
            <a href="https://getalby.com/" target="_blank" rel="noopener noreferrer">
              Alby
            </a> or{' '}
            <a href="https://nostr-connect.com/" target="_blank" rel="noopener noreferrer">
              nos2x
            </a>.
          </p>
        )}
      </div>
    );
  }

  // Authenticated interface
  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f8ff', borderRadius: '5px' }}>
        <h2>✅ Connected to Nostr</h2>
        <p><strong>Identity:</strong> {currentIdentity?.npub}</p>
        <p><strong>Provider:</strong> {currentIdentity?.provider}</p>
        <button 
          onClick={logout}
          style={{
            padding: '5px 10px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          Disconnect
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>📝 Publish a Note</h3>
        <textarea
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          placeholder="What's on your mind?"
          style={{
            width: '100%',
            height: '100px',
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            fontSize: '14px',
            resize: 'vertical'
          }}
        />
        <div style={{ marginTop: '10px' }}>
          <button
            onClick={handlePublish}
            disabled={isPublishing || !noteContent.trim()}
            style={{
              padding: '10px 20px',
              backgroundColor: isPublishing ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: isPublishing ? 'not-allowed' : 'pointer'
            }}
          >
            {isPublishing ? '🔄 Publishing...' : '📤 Publish Note'}
          </button>
        </div>
      </div>

      <div>
        <h3>📰 Recent Notes</h3>
        {eventsLoading ? (
          <p>Loading events...</p>
        ) : events.length === 0 ? (
          <p>No events found. Try publishing a note!</p>
        ) : (
          <div>
            {events.slice(0, 5).map((event) => (
              <div
                key={event.id}
                style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '5px',
                  padding: '15px',
                  marginBottom: '10px',
                  backgroundColor: '#fafafa'
                }}
              >
                <p style={{ margin: '0 0 10px 0' }}>{event.content}</p>
                <small style={{ color: '#666' }}>
                  {new Date(event.created_at * 1000).toLocaleString()} | 
                  {event.pubkey.slice(0, 8)}...
                </small>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Wrapper-Komponente für einfache Integration
export function NostrApp() {
  return (
    <div>
      <h1>Nostr Framework React Example</h1>
      <NostrNoteExample />
    </div>
  );
}