// framework/index.js

// Core modules
export { EventBus } from './core/EventBus.js';
export { IdentityManager } from './core/IdentityManager.js';

// Plugin interfaces
export { AuthPlugin } from './plugins/auth/AuthPlugin.js';

// Test exports
export { runEventBusTests } from './core/EventBus.test.js';
export { runIdentityManagerTests } from './core/IdentityManager.test.js';