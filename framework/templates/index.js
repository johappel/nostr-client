// framework/templates/index.js

export { EventTemplate } from './EventTemplate.js';
export { TextNoteTemplate, SetMetadataTemplate } from './nip01.js';
export { CalendarEventTemplate } from './nip52.js';
export { EventDeletionTemplate } from './nip09.js';

/**
 * Register all standard templates
 * @param {TemplateEngine} engine - Template engine instance
 */
export async function registerStandardTemplates(engine) {
  const { TextNoteTemplate, SetMetadataTemplate } = await import('./nip01.js');
  const { CalendarEventTemplate } = await import('./nip52.js');
  const { EventDeletionTemplate } = await import('./nip09.js');

  engine.register('text-note', new TextNoteTemplate());
  engine.register('set-metadata', new SetMetadataTemplate());
  engine.register('calendar-event', new CalendarEventTemplate());
  engine.register('delete-event', new EventDeletionTemplate());

  console.log('[TemplateEngine] Standard templates registered');
}