import { sqliteTable, text, integer, real, AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  updated_at: integer('updated_at'),
  deleted_at: integer('deleted_at'),
  snapshot_of: text('snapshot_of'),
});

export const nodes = sqliteTable('nodes', {
  id: text('id').primaryKey(),
  project_id: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  parent_id: text('parent_id').references((): AnySQLiteColumn => nodes.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  x_position: real('x_position').notNull(),
  y_position: real('y_position').notNull(),
  node_type: text('node_type').notNull(),
  manuscript: text('manuscript'),
  notes: text('notes'),
  metadata: text('metadata', { mode: 'json' }),
  updated_at: integer('updated_at'),
  deleted_at: integer('deleted_at'),
});

export const edges = sqliteTable('edges', {
  id: text('id').primaryKey(),
  project_id: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  source_id: text('source_id').notNull(),
  target_id: text('target_id').notNull(),
  source_handle: text('source_handle'),
  target_handle: text('target_handle'),
  label: text('label'),
  // How many times the target's title is mentioned in the source's text --
  // drives edge thickness/glow so well-trodden connections look load-bearing
  strength: integer('strength').default(1),
  // Relationship category (references/causes/supports/contradicts/foreshadows)
  // -- separate from label, which is freeform text on top
  edge_type: text('edge_type').default('references'),
});
