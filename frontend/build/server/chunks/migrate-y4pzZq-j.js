import { migrate } from 'drizzle-orm/libsql/migrator';
import { d as db } from './index4-SoK3Vczo.js';

async function runMigrations() {
  try {
    console.log("Running database migrations...");
    await migrate(db, { migrationsFolder: "./src/db/migrations" });
    console.log("Database migrations completed successfully");
  } catch (error) {
    console.error("Error running migrations:", error);
    throw error;
  }
}

export { runMigrations };
//# sourceMappingURL=migrate-y4pzZq-j.js.map
