// framework/core/TemplateEngine.ts

import { EventBus } from './EventBus.js';
import type {
  UnsignedEvent,
  SignedEvent,
  EventTemplate,
  TemplateSchema,
  EventCallback,
  EventUnsubscriber
} from '../types/index.js';

/**
 * Manages event templates for different NIPs
 */
export class TemplateEngine {
  private _eventBus: EventBus;
  private _templates = new Map<string, EventTemplate>();

  constructor(eventBus: EventBus | null = null) {
    this._eventBus = eventBus || new EventBus();
  }

  /**
   * Register an event template
   * @param name Template identifier
   * @param template Template instance
   */
  register(name: string, template: EventTemplate): void {
    if (this._templates.has(name)) {
      console.warn(`[TemplateEngine] Template "${name}" already registered, replacing`);
    }

    this._templates.set(name, template);
    console.log(`[TemplateEngine] Registered template: ${name} (kind ${template.kind})`);

    this._eventBus.emit('template:registered', { name, template });
  }

  /**
   * Unregister a template
   * @param name Template identifier
   */
  unregister(name: string): void {
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
   * @param name Template identifier
   * @returns Template instance or null
   */
  get(name: string): EventTemplate | null {
    return this._templates.get(name) || null;
  }

  /**
   * Check if template exists
   * @param name Template identifier
   * @returns Boolean indicating existence
   */
  has(name: string): boolean {
    return this._templates.has(name);
  }

  /**
   * Get all registered template names
   * @returns Array of template names
   */
  getTemplateNames(): string[] {
    return Array.from(this._templates.keys());
  }

  /**
   * Get templates by kind
   * @param kind Event kind
   * @returns Array of templates
   */
  getByKind(kind: number): EventTemplate[] {
    const templates: EventTemplate[] = [];
    for (const template of this._templates.values()) {
      if (template.kind === kind) {
        templates.push(template);
      }
    }
    return templates;
  }

  /**
   * Get templates by NIP
   * @param nip NIP identifier (e.g., 'NIP-01', 'NIP-52')
   * @returns Array of templates
   */
  getByNip(nip: string): EventTemplate[] {
    const templates: EventTemplate[] = [];
    for (const template of this._templates.values()) {
      if (template.nip === nip) {
        templates.push(template);
      }
    }
    return templates;
  }

  /**
   * Build unsigned event from template
   * @param templateName Template identifier
   * @param data Event data
   * @returns Unsigned event
   */
  build(templateName: string, data: any): UnsignedEvent {
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
   * @param templateName Template identifier
   * @param event Received event
   * @returns Parsed data
   */
  parse(templateName: string, event: SignedEvent): any {
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
   * @param templateName Template identifier
   * @returns Template schema
   */
  getSchema(templateName: string): TemplateSchema {
    const template = this.get(templateName);

    if (!template) {
      throw new Error(`Template "${templateName}" not found`);
    }

    return template.getSchema();
  }

  /**
   * Get all template schemas
   * @returns Object with all schemas
   */
  getAllSchemas(): Record<string, TemplateSchema> {
    const schemas: Record<string, TemplateSchema> = {};

    for (const [name, template] of this._templates) {
      schemas[name] = template.getSchema();
    }

    return schemas;
  }

  /**
   * Validate unsigned event structure
   * @private
   */
  private _validateUnsignedEvent(event: UnsignedEvent): void {
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
   * @param event Event name
   * @param callback Callback function
   * @returns Unsubscribe function
   */
  on(event: string, callback: EventCallback): EventUnsubscriber {
    return this._eventBus.on(event, callback);
  }

  /**
   * Get event bus
   * @returns EventBus instance
   */
  getEventBus(): EventBus {
    return this._eventBus;
  }
}