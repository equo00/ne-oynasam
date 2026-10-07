import { sqliteTable,text,integer,primaryKey,index } from 'drizzle-orm/sqlite-core';
export const library=sqliteTable('library',{userId:text('user_id').notNull(),gameId:text('game_id').notNull(),status:text('status').notNull().default('planned'),note:text('note').notNull().default(''),rating:integer('rating'),updatedAt:text('updated_at').notNull()},t=>[primaryKey({columns:[t.userId,t.gameId]}),index('library_user_idx').on(t.userId)]);
export const lists=sqliteTable('lists',{id:text('id').primaryKey(),userId:text('user_id').notNull(),name:text('name').notNull(),createdAt:text('created_at').notNull()},t=>[index('lists_user_idx').on(t.userId)]);
export const listGames=sqliteTable('list_games',{listId:text('list_id').notNull(),gameId:text('game_id').notNull()},t=>[primaryKey({columns:[t.listId,t.gameId]})]);
export const views=sqliteTable('game_views',{gameId:text('game_id').primaryKey(),count:integer('count').notNull().default(0)});
export const viewVisits=sqliteTable('view_visits',{gameId:text('game_id').notNull(),viewer:text('viewer').notNull(),day:text('day').notNull()},t=>[primaryKey({columns:[t.gameId,t.viewer,t.day]})]);
export const catalogCache=sqliteTable('catalog_cache',{id:text('id').primaryKey(),payload:text('payload').notNull(),fetchedAt:text('fetched_at').notNull()});
export const sourceGames=sqliteTable('source_games',{id:text('id').primaryKey(),qid:text('qid').notNull().unique(),payload:text('payload').notNull(),fetchedAt:text('fetched_at').notNull()});
