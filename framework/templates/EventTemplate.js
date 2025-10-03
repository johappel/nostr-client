// framework/templates/EventTemplate.js

/**
 * Base class for event templates
 * Defines structure and validation for specific NIPs
 */
export class EventTemplate {
  constructor(config = {}) {
    this.name = config.name || 'unnamed';
    this.kind = config.kind;
    this.nip = config.nip || null;
    this.description = config.description || '';
  }

  /**
   * Build unsigned event from data
   * @param {Object} data - Input data
   * @returns {UnsignedEvent}
   */
  build(data) {
    throw new Error(`${this.name}: build() must be implemented`);
  }

  /**
   * Validate event data before building
   * @param {Object} data - Input data
   * @returns {boolean}
   */
  validate(data) {
    // Default: accept all
    return true;
  }

  /**
   * Parse received event into structured data
   * @param {SignedEvent} event - Received event
   * @returns {Object}
   */
  parse(event) {
    // Default: return event as-is
    return event;
  }

  /**
   * Get required fields for this template
   * @returns {string[]}
   */
  getRequiredFields() {
    return [];
  }

  /**
   * Get optional fields for this template
   * @returns {string[]}
   */
  getOptionalFields() {
    return [];
  }

  /**
   * Get template schema for documentation
   * @returns {Object}
   */
  getSchema() {
    return {
      name: this.name,
      kind: this.kind,
      nip: this.nip,
      description: this.description,
      required: this.getRequiredFields(),
      optional: this.getOptionalFields()
    };
  }
}