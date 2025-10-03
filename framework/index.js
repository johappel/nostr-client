// framework/index.js

// Core modules
export { EventBus } from './core/EventBus.js';
export { IdentityManager } from './core/IdentityManager.js';

// Plugin interfaces
export { AuthPlugin } from './plugins/auth/AuthPlugin.js';

// Auth plugins
export { Nip07Plugin } from './plugins/auth/Nip07Plugin.js';

// Test exports
export { runEventBusTests } from './core/EventBus.test.js';
export { runIdentityManagerTests } from './core/IdentityManager.test.js';