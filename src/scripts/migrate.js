import pool from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function runMigrations() {
    try {
        const migrationsDir = path.join(__dirname, '../../migrations');
        const files = fs.readdirSync(migrationsDir).sort();
        for (const file of files) {
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
            console.log(`Running migration: ${file}`);
            await pool.query(sql);
        }
        console.log('✅ All migrations completed');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Migration error:', error);
        process.exit(1);
    }
}
runMigrations();
//# sourceMappingURL=migrate.js.map