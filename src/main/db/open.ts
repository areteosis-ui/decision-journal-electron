import Database from 'better-sqlite3-multiple-ciphers'
import { promises as fs } from 'node:fs'
import { dirname } from 'node:path'

type DB = Database.Database

interface Migration {
  version: number
  sql: string
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS decisions (
        id         TEXT PRIMARY KEY,
        title      TEXT NOT NULL,
        body       TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL,
        review_at  INTEGER,
        is_sample  INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_decisions_created_at ON decisions(created_at DESC);

      CREATE TABLE IF NOT EXISTS meta (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `
  },
  {
    version: 2,
    sql: `
      ALTER TABLE decisions ADD COLUMN decided_at         INTEGER;
      ALTER TABLE decisions ADD COLUMN mental_state       TEXT NOT NULL DEFAULT '[]';
      ALTER TABLE decisions ADD COLUMN situation          TEXT NOT NULL DEFAULT '';
      ALTER TABLE decisions ADD COLUMN problem_statement  TEXT NOT NULL DEFAULT '';
      ALTER TABLE decisions ADD COLUMN variables          TEXT NOT NULL DEFAULT '';
      ALTER TABLE decisions ADD COLUMN complications      TEXT NOT NULL DEFAULT '';
      ALTER TABLE decisions ADD COLUMN alternatives       TEXT NOT NULL DEFAULT '';
      ALTER TABLE decisions ADD COLUMN range_of_outcomes  TEXT NOT NULL DEFAULT '';
      ALTER TABLE decisions ADD COLUMN expected_outcome   TEXT NOT NULL DEFAULT '';
      ALTER TABLE decisions ADD COLUMN outcome            TEXT NOT NULL DEFAULT '';
      ALTER TABLE decisions ADD COLUMN lessons_learned    TEXT NOT NULL DEFAULT '';
      ALTER TABLE decisions ADD COLUMN reviewed_at        INTEGER;
      ALTER TABLE decisions ADD COLUMN updated_at         INTEGER;

      UPDATE decisions SET decided_at = created_at WHERE decided_at IS NULL;
      UPDATE decisions SET updated_at = created_at WHERE updated_at IS NULL;
    `
  }
]

function runMigrations(db: DB): void {
  db.exec(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`)

  const row = db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get() as
    | { value: string }
    | undefined
  const current = row ? parseInt(row.value, 10) : 0

  const setVersion = db.prepare(
    `INSERT INTO meta(key, value) VALUES('schema_version', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  )

  const apply = db.transaction(() => {
    for (const m of MIGRATIONS) {
      if (m.version > current) {
        db.exec(m.sql)
        setVersion.run(String(m.version))
      }
    }
  })
  apply()
}

export async function openEncryptedDb(dbPath: string, masterKey: Buffer): Promise<DB> {
  await fs.mkdir(dirname(dbPath), { recursive: true })

  const db = new Database(dbPath)

  const hexKey = masterKey.toString('hex')
  db.pragma(`cipher='sqlcipher'`)
  db.pragma(`key="x'${hexKey}'"`)
  db.pragma(`cipher_page_size = 4096`)
  db.pragma(`kdf_iter = 256000`)
  db.pragma(`cipher_hmac_algorithm = HMAC_SHA512`)
  db.pragma(`cipher_kdf_algorithm = PBKDF2_HMAC_SHA512`)

  try {
    db.prepare('SELECT count(*) FROM sqlite_master').get()
  } catch {
    db.close()
    throw new Error('Failed to open encrypted database: wrong key or corrupted file')
  }

  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')

  runMigrations(db)

  try {
    await fs.chmod(dbPath, 0o600)
  } catch {
    // best-effort; ignore on FS that doesn't support chmod
  }

  return db
}

export function closeDb(db: DB | null): void {
  if (db) {
    try {
      db.close()
    } catch {
      // ignore
    }
  }
}
