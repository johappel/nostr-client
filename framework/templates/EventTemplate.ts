// framework/templates/EventTemplate.ts

import type { UnsignedEvent, SignedEvent, TemplateSchema } from '../types/index.js';

/**
 * Base class for event templates
 * All event templates must extend this class
 */
export abstract class EventTemplate {
  protected kind: number;
  protected nip: string;

  constructor(kind: number, nip: string) {
    this.kind = kind;
    this.nip = nip;
  }

  /**
   * Validate data before building event
   * @param data Data to validate
   * @returns Boolean indicating validity
   */
  abstract validate(data: any): boolean;

  /**
   * Build unsigned event from data
   * @param data Event data
   * @returns Unsigned event
   */
  abstract build(data: any): UnsignedEvent;

  /**
   * Parse received event
   * @param event Signed event
   * @returns Parsed data
   */
  abstract parse(event: SignedEvent): any;

  /**
   * Get template schema for documentation
   * @returns Template schema
   */
  abstract getSchema(): TemplateSchema;

  /**
   * Get event kind
   * @returns Event kind number
   */
  getKind(): number {
    return this.kind;
  }

  /**
   * Get NIP identifier
   * @returns NIP string
   */
  getNip(): string {
    return this.nip;
  }
}