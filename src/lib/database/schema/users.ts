import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	username: text('username').notNull().unique(),
	email: text('email').notNull().unique(),
	passwordHash: blob('password_hash'), // encrypted, null for OIDC users
	role: text('role', { enum: ['admin', 'user', 'viewer'] })
		.notNull()
		.default('user'),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
	lastLogin: text('last_login'),
	oidcSubject: text('oidc_subject'),
	oidcProvider: text('oidc_provider'),
	oidcEmail: text('oidc_email'),
	oidcName: text('oidc_name'),
	oidcPicture: text('oidc_picture'),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const userSessions = sqliteTable('user_sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.references(() => users.id, { onDelete: 'cascade' })
		.notNull(),
	token: text('token').notNull().unique(),
	expiresAt: text('expires_at').notNull(),
	userAgent: text('user_agent'),
	ipAddress: text('ip_address'),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});
