// framework/templates/nip52.js

import { EventTemplate } from './EventTemplate.js';

/**
 * NIP-52: Calendar Event
 */
export class CalendarEventTemplate extends EventTemplate {
  constructor() {
    super({
      name: 'calendar-event',
      kind: 31923,
      nip: 'NIP-52',
      description: 'Calendar time-based event'
    });
  }

  build(data) {
    const tags = [
      ['d', data.uid || this._generateUID()],
      ['title', data.title || ''],
      ['start', data.start],
      ['end', data.end || data.start]
    ];

    if (data.location) tags.push(['location', data.location]);
    if (data.image) tags.push(['image', data.image]);
    if (data.url) tags.push(['url', data.url]);
    
    // Add custom tags
    if (data.tags && Array.isArray(data.tags)) {
      tags.push(...data.tags);
    }

    return {
      kind: 31923,
      content: data.description || '',
      tags,
      created_at: data.created_at || Math.floor(Date.now() / 1000)
    };
  }

  validate(data) {
    if (!data.title) {
      throw new Error('Title is required');
    }
    if (!data.start) {
      throw new Error('Start time is required');
    }
    return true;
  }

  parse(event) {
    const getTag = (name) => {
      const tag = event.tags.find(t => t[0] === name);
      return tag ? tag[1] : null;
    };

    return {
      uid: getTag('d'),
      title: getTag('title'),
      start: getTag('start'),
      end: getTag('end'),
      location: getTag('location'),
      image: getTag('image'),
      url: getTag('url'),
      description: event.content,
      author: event.pubkey,
      created_at: event.created_at,
      id: event.id
    };
  }

  getRequiredFields() {
    return ['title', 'start'];
  }

  getOptionalFields() {
    return ['end', 'location', 'image', 'url', 'description', 'uid', 'tags'];
  }

  _generateUID() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}