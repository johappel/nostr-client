// framework/core/TemplateEngine.js

import { EventBus } from './EventBus.js';

/**
 * Manages event templates for different NIPs
 */
export class TemplateEngine {
  constructor(eventBus = null) {
    this._eventBus = eventBus || new EventBus();
    this._templates = new Map();
  }

  /**
   * Register an event template
   * @param {string} name - Template identifier
   * @param {EventTemplate} template - Template instance
   */
  register(name, template) {
    if (this._templates.has(name)) {
      console.warn(`[TemplateEngine] Template "${name}" already registered, replacing`);
    }

    this._templates.set(name, template);
    console.log(`[TemplateEngine] Registered template: ${name} (kind ${template.kind})`);
    
    this._eventBus.emit('template:registered', { name, template });
  }

  /**
   * Unregister a template
   * @param {string} name - Template identifier
   */
  unregister(name) {
    if (!this._templates.has(name)) {
      console.warn(`[TemplateEngine] Template "${name}" not found`);
      return;
    }

    this._templates.delete(name);
    console.log(`[TemplateEngine] Unregistered template: ${name}`);
    
    this._eventBus.emit('template:unregistered', { name });
  }

  /**
   * Get a template by name
   * @param {string} name - Template identifier
   * @returns {EventTemplate|null}
   */
  get(name) {
    return this._templates.get(name) || null;
  }

  /**
   * Check if template exists
   * @param {string} name - Template identifier
   * @returns {boolean}
   */
  has(name) {
    return this._templates.has(name);
  }

  /**
   * Get all registered template names
   * @returns {string[]}
   */
  getTemplateNames() {
    return Array.from(this._templates.keys());
  }

  /**
   * Get templates by kind
   * @param {number} kind - Event kind
   * @returns {EventTemplate[]}
   */
  getByKind(kind) {
    const templates = [];
    for (const template of this._templates.values()) {
      if (template.kind === kind) {
        templates.push(template);
      }
    }
    return templates;
  }

  /**
   * Get templates by NIP
   * @param {string} nip - NIP identifier (e.g., 'NIP-01', 'NIP-52')
   * @returns {EventTemplate[]}
   */
  getByNip(nip) {
    const templates = [];
    for (const template of this._templates.values()) {
      if (template.nip === nip) {
        templates.push(template);
      }
    }
    return templates;
  }

  /**
   * Build unsigned event from template
   * @param {string} templateName - Template identifier
   * @param {Object} data - Event data
   * @returns {UnsignedEvent}
   */
  build(templateName, data) {
    const template = this.get(templateName);
    
    if (!template) {
      throw new Error(`Template "${templateName}" not found`);
    }

    // Validate data
    if (!template.validate(data)) {
      throw new Error(`Data validation failed for template "${templateName}"`);
    }

    try {
      const event = template.build(data);
      
      // Ensure required fields
      this._validateUnsignedEvent(event);
      
      console.log(`[TemplateEngine] Built event from template "${templateName}"`);
      this._eventBus.emit('template:built', { templateName, event });
      
      return event;
    } catch (error) {
      console.error(`[TemplateEngine] Failed to build event:`, error);
      this._eventBus.emit('template:error', { templateName, error });
      throw error;
    }
  }

  /**
   * Parse received event using template
   * @param {string} templateName - Template identifier
   * @param {SignedEvent} event - Received event
   * @returns {Object}
   */
  parse(templateName, event) {
    const template = this.get(templateName);
    
    if (!template) {
      throw new Error(`Template "${templateName}" not found`);
    }

    try {
      const parsed = template.parse(event);
      
      console.log(`[TemplateEngine] Parsed event with template "${templateName}"`);
      this._eventBus.emit('template:parsed', { templateName, event, parsed });
      
      return parsed;
    } catch (error) {
      console.error(`[TemplateEngine] Failed to parse event:`, error);
      this._eventBus.emit('template:error', { templateName, error });
      throw error;
    }
  }

  /**
   * Get template schema for documentation
   * @param {string} templateName - Template identifier
   * @returns {Object}
   */
  getSchema(templateName) {
    const template = this.get(templateName);
    
    if (!template) {
      throw new Error(`Template "${templateName}" not found`);
    }

    return template.getSchema();
  }

  /**
   * Get all template schemas
   * @returns {Object}
   */
  getAllSchemas() {
    const schemas = {};
    
    for (const [name, template] of this._templates) {
      schemas[name] = template.getSchema();
    }

    return schemas;
  }

  /**
   * Validate unsigned event structure
   * @private
   */
  _validateUnsignedEvent(event) {
    const required = ['kind', 'content', 'tags', 'created_at'];
    
    for (const field of required) {
      if (!(field in event)) {
        throw new Error(`Event missing required field: ${field}`);
      }
    }

    if (typeof event.kind !== 'number') {
      throw new Error('Event kind must be a number');
    }

    if (!Array.isArray(event.tags)) {
      throw new Error('Event tags must be an array');
    }

    if (typeof event.created_at !== 'number') {
      throw new Error('Event created_at must be a number');
    }
  }

  /**
   * Listen to template events
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    return this._eventBus.on(event, callback);
  }

  /**
   * Get event bus
   * @returns {EventBus}
   */
  getEventBus() {
    return this._eventBus;
  }
}