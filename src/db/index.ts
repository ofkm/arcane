import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';
import { env } from '$env/dynamic/private';

export const db = drizzle(env.DB_CONN_STRING || 'file:data/arcane.db');
