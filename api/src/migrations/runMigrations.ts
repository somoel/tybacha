import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../infrastructure/db/pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '../../migrations');

async function ensureMigrationsTable(connection: Awaited<ReturnType<typeof pool.getConnection>>): Promise<void> {
  await connection.query(`
    create table if not exists schema_migrations (
      id          int auto_increment primary key,
      filename    varchar(255) not null unique,
      applied_at  datetime(3) default current_timestamp(3) not null
    )
  `);
}

interface MigrationRow extends RowDataPacket {
  filename: string;
}

async function getAppliedMigrations(connection: Awaited<ReturnType<typeof pool.getConnection>>): Promise<Set<string>> {
  const [rows] = await connection.query<MigrationRow[]>(
    'select filename from schema_migrations order by id',
  );
  return new Set(rows.map((row) => row.filename));
}

async function isExistingDatabase(connection: Awaited<ReturnType<typeof pool.getConnection>>): Promise<boolean> {
  const [rows] = await connection.query<RowDataPacket[]>(
    `select count(*) as cnt from information_schema.tables
     where table_schema = database() and table_name != 'schema_migrations'`,
  );
  return rows[0].cnt > 0;
}

async function markAsApplied(
  connection: Awaited<ReturnType<typeof pool.getConnection>>,
  filenames: string[],
): Promise<void> {
  for (const filename of filenames) {
    await connection.query(
      'insert ignore into schema_migrations (filename) values (:filename)',
      { filename },
    );
  }
}

async function getMigrationFiles(): Promise<string[]> {
  const entries = await readdir(MIGRATIONS_DIR);
  return entries
    .filter((file) => file.endsWith('.sql'))
    .sort();
}

async function applyMigration(
  connection: Awaited<ReturnType<typeof pool.getConnection>>,
  filename: string,
): Promise<void> {
  const filePath = join(MIGRATIONS_DIR, filename);
  const sql = await readFile(filePath, 'utf-8');

  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  await connection.beginTransaction();
  try {
    for (const statement of statements) {
      await connection.query(statement);
    }

    await connection.query(
      'insert into schema_migrations (filename) values (:filename)',
      { filename },
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function main(): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await ensureMigrationsTable(connection);
    let applied = await getAppliedMigrations(connection);
    const files = await getMigrationFiles();

    // Bootstrap: si no hay registros pero la BD ya existe, marcar migraciones previas
    if (applied.size === 0 && files.length > 1 && await isExistingDatabase(connection)) {
      const alreadyApplied = files.slice(0, -1);
      console.log(`BD existente detectada. Marcando ${alreadyApplied.length} migracion(es) previa(s) como aplicadas...`);
      await markAsApplied(connection, alreadyApplied);
      applied = await getAppliedMigrations(connection);
    }

    const pending = files.filter((file) => !applied.has(file));

    if (pending.length === 0) {
      console.log('No hay migraciones pendientes.');
      return;
    }

    console.log(`Migraciones pendientes: ${pending.length}`);
    console.log('---');

    for (const file of pending) {
      console.log(`Aplicando: ${file}`);
      await applyMigration(connection, file);
      console.log(`  OK`);
    }

    console.log('---');
    console.log(`Migraciones aplicadas: ${pending.length}`);
  } catch (error) {
    console.error('Error al aplicar migraciones:', error);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

await main();
