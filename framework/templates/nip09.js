// framework/templates/nip09.js

import { EventTemplate } from './EventTemplate.js';

/**
 * NIP-09: Event Deletion
 */
export class EventDeletionTemplate extends EventTemplate {
  constructor() {
    super({
      name: 'delete-event',
      kind: 5,
      nip: 'NIP-09',
      description: 'Event deletion request'
    });
  }

  build(data) {
    const eventIds = Array.isArray(data.eventIds) ? data.eventIds : [data.eventIds];
    
    const tags = eventIds.map(id => ['e', id]);

    return {
      kind: 5,
      content: data.reason || '',
      tags,
      created_at: data.created_at || Math.floor(Date.now() / 1000)
    };
  }

  validate(data) {
    if (!data.eventIds || (Array.isArray(data.eventIds) && data.eventIds.length === 0)) {
      throw new Error('At least one event ID is required');
    }
    return true;
  }

  parse(event) {
    const eventIds = event.tags
      .filter(t => t[0] === 'e')
      .map(t => t[1]);

    return {
      eventIds,
      reason: event.content,
      author: event.pubkey,
      created_at: event.created_at
    };
  }

  getRequiredFields() {
    return ['eventIds'];
  }

  getOptionalFields() {
    return ['reason'];
  }
}