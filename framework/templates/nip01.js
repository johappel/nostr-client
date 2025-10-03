// framework/templates/nip01.js

import { EventTemplate } from './EventTemplate.js';

/**
 * NIP-01: Text Note
 */
export class TextNoteTemplate extends EventTemplate {
  constructor() {
    super({
      name: 'text-note',
      kind: 1,
      nip: 'NIP-01',
      description: 'Basic text note'
    });
  }

  build(data) {
    return {
      kind: 1,
      content: data.content || '',
      tags: data.tags || [],
      created_at: data.created_at || Math.floor(Date.now() / 1000)
    };
  }

  validate(data) {
    if (!data.content && data.content !== '') {
      throw new Error('Content is required');
    }
    return true;
  }

  parse(event) {
    return {
      content: event.content,
      tags: event.tags,
      author: event.pubkey,
      created_at: event.created_at,
      id: event.id
    };
  }

  getRequiredFields() {
    return ['content'];
  }

  getOptionalFields() {
    return ['tags', 'created_at'];
  }
}

/**
 * NIP-01: Set Metadata
 */
export class SetMetadataTemplate extends EventTemplate {
  constructor() {
    super({
      name: 'set-metadata',
      kind: 0,
      nip: 'NIP-01',
      description: 'User profile metadata'
    });
  }

  build(data) {
    const metadata = {
      name: data.name,
      about: data.about,
      picture: data.picture,
      nip05: data.nip05,
      lud16: data.lud16,
      website: data.website,
      banner: data.banner
    };

    // Remove undefined fields
    Object.keys(metadata).forEach(key => 
      metadata[key] === undefined && delete metadata[key]
    );

    return {
      kind: 0,
      content: JSON.stringify(metadata),
      tags: [],
      created_at: data.created_at || Math.floor(Date.now() / 1000)
    };
  }

  parse(event) {
    try {
      const metadata = JSON.parse(event.content);
      return {
        ...metadata,
        pubkey: event.pubkey,
        updated_at: event.created_at
      };
    } catch (error) {
      console.error('Failed to parse metadata:', error);
      return { pubkey: event.pubkey };
    }
  }

  getOptionalFields() {
    return ['name', 'about', 'picture', 'nip05', 'lud16', 'website', 'banner'];
  }
}