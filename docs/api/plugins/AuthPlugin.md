# AuthPlugin API-Referenz

Das AuthPlugin-Interface definiert die Basis für alle Authentifizierungs-Plugins im Nostr Framework. Es ermöglicht die Integration verschiedener Authentifizierungsmethoden wie NIP-07, NIP-46, Local Keys und benutzerdefinierte Lösungen.

## Import

```javascript
import { AuthPlugin } from './framework/plugins/auth/AuthPlugin.js';
```

## Basis-Interface

### Konstruktor

```javascript
constructor(config = {})
```

**Parameter:**
- `config` (Object, optional): Plugin-Konfiguration

**Eigenschaften:**
- `name` (string): Eindeutiger Plugin-Name
- `displayName` (string): Angezeigter Name
- `_initialized` (boolean): Initialisierungsstatus

### Methoden

#### initialize()

Initialisiert das Plugin. Wird einmal bei der Registrierung aufgerufen.

**Rückgabewert:**
- Promise<void>

**Beispiel:**
```javascript
async initialize() {
  // Plugin-spezifische Initialisierung
  this._markInitialized();
}
```

#### isLoggedIn()

Prüft, ob der Benutzer aktuell authentifiziert ist.

**Rückgabewert:**
- Promise<boolean>

**Beispiel:**
```javascript
async isLoggedIn() {
  return localStorage.getItem('auth_token') !== null;
}
```

#### getIdentity()

Gibt die aktuelle Benutzer-Identität zurück.

**Rückgabewert:**
- Promise<Identity|null>

**Beispiel:**
```javascript
async getIdentity() {
  if (!await this.isLoggedIn()) return null;
  
  return {
    pubkey: 'user-pubkey-hex',
    npub: 'npub1...',
    provider: this.name,
    displayName: 'User Name',
    metadata: {
      name: 'User Name',
      about: 'About user',
      picture: 'https://...'
    },
    capabilities: {
      canSign: true,
      canEncrypt: true,
      canDecrypt: true
    }
  };
}
```

#### login(credentials)

Führt die Authentifizierung durch.

**Parameter:**
- `credentials` (Object, optional): Provider-spezifische Anmeldedaten

**Rückgabewert:**
- Promise<Identity>

**Beispiel:**
```javascript
async login(credentials = {}) {
  // Provider-spezifische Login-Logik
  const token = credentials.token;
  
  // Token validieren und Benutzerdaten abrufen
  const userData = await this.validateToken(token);
  
  // Session speichern
  this.storeSession(userData);
  
  return {
    pubkey: userData.pubkey,
    npub: userData.npub,
    provider: this.name,
    displayName: userData.name,
    metadata: userData.metadata,
    capabilities: {
      canSign: true,
      canEncrypt: true,
      canDecrypt: true
    }
  };
}
```

#### logout()

Führt die Abmeldung durch.

**Rückgabewert:**
- Promise<void>

**Beispiel:**
```javascript
async logout() {
  // Session-Daten löschen
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_data');
}
```

#### getSigner()

Gibt den Signer für dieses Auth-Plugin zurück.

**Rückgabewert:**
- SignerPlugin

**Beispiel:**
```javascript
getSigner() {
  return new CustomSigner(this);
}
```

#### setupUI(elements, onChange)

Richtet UI-Elemente für die Authentifizierung ein (optional).

**Parameter:**
- `elements` (Object): UI-Elemente
- `onChange` (Function): Callback für Authentifizierungsänderungen

**Beispiel:**
```javascript
setupUI(elements, onChange) {
  elements.loginButton.onclick = async () => {
    try {
      await this.login({ token: elements.tokenInput.value });
      onChange('login');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
  
  elements.logoutButton.onclick = async () => {
    await this.logout();
    onChange('logout');
  };
}
```

#### isInitialized()

Prüft, ob das Plugin initialisiert ist.

**Rückgabewert:**
- boolean

#### _markInitialized()

Markiert das Plugin als initialisiert (geschützt).

## Typdefinitionen

### Identity

```javascript
{
  pubkey: string,        // Hex public key
  npub: string,          // Bech32 npub
  provider: string,      // Provider name
  displayName?: string,  // Display name
  metadata?: Object,     // NIP-01 profile metadata
  capabilities: {
    canSign: boolean,    // Can sign events
    canEncrypt: boolean, // Can encrypt messages
    canDecrypt: boolean  // Can decrypt messages
  }
}
```

## Implementierungen

### Nip07Plugin

Browser Extension Integration (NIP-07).

```javascript
import { Nip07Plugin } from './framework/plugins/auth/Nip07Plugin.js';

const nip07Plugin = new Nip07Plugin();
identityManager.registerPlugin('nip07', nip07Plugin);

// Prüfen ob NIP-07 verfügbar
if (window.nostr) {
  const identity = await identityManager.authenticate('nip07');
}
```

### Nip46Plugin

Remote Signer Integration (NIP-46).

```javascript
import { Nip46Plugin } from './framework/plugins/auth/Nip46Plugin.js';

const nip46Plugin = new Nip46Plugin({
  bunkerUrl: 'bunker://...',
  secret: 'shared-secret'
});

identityManager.registerPlugin('nip46', nip46Plugin);

// Mit Remote Signer authentifizieren
const identity = await identityManager.authenticate('nip46', {
  permissions: ['sign_event', 'encrypt']
});
```

### LocalKeyPlugin

Lokale Private Keys.

```javascript
import { LocalKeyPlugin } from './framework/plugins/auth/LocalKeyPlugin.js';

const localKeyPlugin = new LocalKeyPlugin();
identityManager.registerPlugin('local', localKeyPlugin);

// Mit private key authentifizieren
const identity = await identityManager.authenticate('local', {
  privateKey: 'nsec1...'
});
```

## Eigenes Plugin erstellen

### Beispiel: OAuth2 Plugin

```javascript
import { AuthPlugin } from './framework/plugins/auth/AuthPlugin.js';

class OAuth2Plugin extends AuthPlugin {
  constructor(config) {
    super();
    this.name = 'oauth2';
    this.displayName = 'OAuth2 Provider';
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.authUrl = config.authUrl;
    this.tokenUrl = config.tokenUrl;
  }

  async initialize() {
    // OAuth2 Konfiguration validieren
    if (!this.clientId || !this.authUrl) {
      throw new Error('OAuth2 configuration incomplete');
    }
    
    this._markInitialized();
  }

  async isLoggedIn() {
    const token = this.getStoredToken();
    return token && !this.isTokenExpired(token);
  }

  async getIdentity() {
    if (!await this.isLoggedIn()) return null;
    
    const token = this.getStoredToken();
    const userInfo = await this.getUserInfo(token);
    
    return {
      pubkey: this.extractPubkey(userInfo),
      npub: this.toNpub(this.extractPubkey(userInfo)),
      provider: this.name,
      displayName: userInfo.name,
      metadata: {
        name: userInfo.name,
        picture: userInfo.picture,
        about: userInfo.about
      },
      capabilities: {
        canSign: true,
        canEncrypt: true,
        canDecrypt: true
      }
    };
  }

  async login() {
    // OAuth2 Flow starten
    const authUrl = this.buildAuthUrl();
    const code = await this.openAuthWindow(authUrl);
    const token = await this.exchangeCodeForToken(code);
    
    // Token speichern
    this.storeToken(token);
    
    return await this.getIdentity();
  }

  async logout() {
    this.removeStoredToken();
  }

  getSigner() {
    return new OAuth2Signer(this);
  }

  // Hilfsmethoden
  getStoredToken() {
    const data = localStorage.getItem('oauth2_token');
    return data ? JSON.parse(data) : null;
  }

  storeToken(token) {
    localStorage.setItem('oauth2_token', JSON.stringify(token));
  }

  removeStoredToken() {
    localStorage.removeItem('oauth2_token');
  }

  isTokenExpired(token) {
    return Date.now() > token.expires_at * 1000;
  }

  buildAuthUrl() {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: window.location.origin,
      scope: 'openid profile email',
      state: this.generateState()
    });
    
    return `${this.authUrl}?${params}`;
  }

  async openAuthWindow(url) {
    return new Promise((resolve, reject) => {
      const popup = window.open(url, 'oauth2', 'width=500,height=600');
      
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          reject(new Error('Auth window closed'));
        }
      }, 1000);
      
      const messageHandler = (event) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'oauth2_callback') {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          popup.close();
          
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.code);
          }
        }
      };
      
      window.addEventListener('message', messageHandler);
    });
  }

  async exchangeCodeForToken(code) {
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        redirect_uri: window.location.origin
      })
    });
    
    if (!response.ok) {
      throw new Error('Token exchange failed');
    }
    
    return await response.json();
  }

  async getUserInfo(token) {
    const response = await fetch(`${this.authUrl}/userinfo`, {
      headers: {
        'Authorization': `Bearer ${token.access_token}`
      }
    });
    
    return await response.json();
  }

  extractPubkey(userInfo) {
    // Extrahiere pubkey aus OAuth2 Benutzerinfo
    // Implementierung abhängig vom Provider
    return userInfo.pubkey || userInfo.sub;
  }

  toNpub(pubkey) {
    // Konvertiere hex zu npub
    return beacon.npubEncode(pubkey);
  }

  generateState() {
    return Math.random().toString(36).substring(2, 15);
  }
}

// Plugin registrieren
const oauth2Plugin = new OAuth2Plugin({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  authUrl: 'https://provider.com/oauth2/authorize',
  tokenUrl: 'https://provider.com/oauth2/token'
});

identityManager.registerPlugin('oauth2', oauth2Plugin);
```

## Best Practices

1. **Security**: Sensitive Daten niemals im Klartext speichern
2. **Token Management**: Token-Refresh implementieren
3. **Error Handling**: Klare Fehlermeldungen bereitstellen
4. **UI Integration**: Responsive UI-Elemente bereitstellen
5. **Validation**: Eingaben validieren vor der Verarbeitung

## Sicherheit

1. **PKCE**: Proof Key for Code Exchange verwenden
2. **State Parameter**: CSRF-Schutz implementieren
3. **Token Storage**: Sichere Speicherung von Tokens
4. **Scope Limitation**: Minimale Berechtigungen anfordern
5. **HTTPS**: Immer HTTPS für OAuth2-Flows verwenden

## Fehlerbehandlung

```javascript
try {
  const identity = await identityManager.authenticate('oauth2');
} catch (error) {
  if (error.message.includes('access_denied')) {
    console.log('User denied access');
  } else if (error.message.includes('invalid_client')) {
    console.error('Invalid client configuration');
  } else {
    console.error('Authentication failed:', error);
  }
}
```

## Testing

```javascript
// Mock für Tests
class MockAuthPlugin extends AuthPlugin {
  constructor() {
    super();
    this.name = 'mock';
    this.displayName = 'Mock Auth';
    this._loggedIn = false;
  }

  async initialize() {
    this._markInitialized();
  }

  async isLoggedIn() {
    return this._loggedIn;
  }

  async login(credentials) {
    this._loggedIn = true;
    return {
      pubkey: 'mock-pubkey',
      npub: 'npub1mock',
      provider: 'mock',
      capabilities: { canSign: true, canEncrypt: true, canDecrypt: true }
    };
  }

  async logout() {
    this._loggedIn = false;
  }

  getSigner() {
    return new MockSigner();
  }
}
```

## Integration

```javascript
// Plugin im IdentityManager registrieren
identityManager.registerPlugin('oauth2', oauth2Plugin);

// Verfügbarkeit prüfen
const available = await identityManager.getAvailablePlugins();
if (available.includes('oauth2')) {
  // Authentifizierung durchführen
  const identity = await identityManager.authenticate('oauth2');
}
```

## Nächste Schritte

- [Nip07Plugin](./Nip07Plugin.md) - Browser Extension Integration
- [Nip46Plugin](./Nip46Plugin.md) - Remote Signer Integration
- [LocalKeyPlugin](./LocalKeyPlugin.md) - Lokale Private Keys
- [SignerPlugin](./SignerPlugin.md) - Signier-Interface