import {
  createClient,
  type Client,
  type InArgs,
  type InStatement,
  type ResultSet,
} from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

import type { DbConfig } from './types';

const isCloudflareWorker =
  typeof globalThis !== 'undefined' && 'Cloudflare' in globalThis;

const SQLITE_BUSY_TIMEOUT_MS = 5000;

// SQLite/libsql singleton
let sqliteDbInstance: ReturnType<typeof drizzle> | null = null;

function createAsyncMutex() {
  let locked = false;
  const waiters: Array<() => void> = [];
  return {
    async acquire() {
      if (!locked) {
        locked = true;
        return;
      }
      await new Promise<void>((resolve) => {
        waiters.push(resolve);
      });
    },
    release() {
      const next = waiters.shift();
      if (next) next();
      else locked = false;
    },
  };
}

/**
 * libsql file client drops the underlying DB handle after every
 * `transaction()` (`#db = null`), so a one-shot `PRAGMA busy_timeout`
 * does not stick. Re-apply per connection and serialize writers so
 * generate + poll / credit txs do not hit SQLITE_BUSY immediately.
 */
function wrapFileSqliteClient(client: Client): Client {
  const mutex = createAsyncMutex();
  // libsql's runtime execute() also accepts (sql, args), but the 0.14 typings
  // only declare execute(stmt). Type the bound fn to match the runtime API.
  const rawExecute = client.execute.bind(client) as (
    stmt: InStatement,
    args?: InArgs
  ) => Promise<ResultSet>;
  const rawBatch = client.batch.bind(client);
  const rawTransaction = client.transaction.bind(client);
  const rawExecuteMultiple = client.executeMultiple.bind(client);
  const rawMigrate = client.migrate.bind(client);
  let walEnabled = false;

  const ensurePragmas = async () => {
    await rawExecute(`PRAGMA busy_timeout = ${SQLITE_BUSY_TIMEOUT_MS}`);
    if (!walEnabled) {
      await rawExecute('PRAGMA journal_mode = WAL');
      walEnabled = true;
    }
  };

  const withLock = async <T>(fn: () => Promise<T>): Promise<T> => {
    await mutex.acquire();
    try {
      await ensurePragmas();
      return await fn();
    } finally {
      mutex.release();
    }
  };

  (client as any).execute = (stmt: any, args?: any) =>
    withLock(() =>
      args !== undefined ? rawExecute(stmt, args) : rawExecute(stmt)
    );

  (client as any).batch = (stmts: any, mode?: any) =>
    withLock(() => rawBatch(stmts, mode));

  (client as any).executeMultiple = (sql: string) =>
    withLock(() => rawExecuteMultiple(sql));

  (client as any).migrate = (stmts: any) => withLock(() => rawMigrate(stmts));

  (client as any).transaction = async (mode?: any) => {
    await mutex.acquire();
    let released = false;
    const releaseOnce = () => {
      if (released) return;
      released = true;
      mutex.release();
    };
    try {
      await ensurePragmas();
      const tx = await rawTransaction(mode);
      for (const method of ['commit', 'rollback', 'close'] as const) {
        const raw = (tx as any)[method].bind(tx);
        (tx as any)[method] = async (...args: any[]) => {
          try {
            return await raw(...args);
          } finally {
            releaseOnce();
          }
        };
      }
      return tx;
    } catch (error) {
      releaseOnce();
      throw error;
    }
  };

  return client;
}

function createLocalSqliteClient(config: DbConfig) {
  const options: Record<string, string> = {};
  if (config.database_auth_token) {
    options.authToken = config.database_auth_token;
  }
  const client = createClient({
    url: config.database_url!,
    ...options,
  });
  if (String(config.database_url || '').startsWith('file:')) {
    return wrapFileSqliteClient(client);
  }
  return client;
}

export function createSqliteDb(config: DbConfig) {
  const databaseUrl = config.database_url;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  const options: Record<string, string> = {};
  if (config.database_auth_token) {
    options.authToken = config.database_auth_token;
  }

  // In Cloudflare Workers, create new connection each time
  if (isCloudflareWorker) {
    const client = createClient({
      url: databaseUrl,
      ...options,
    });
    return drizzle({ client });
  }

  // Singleton mode: reuse existing instance
  if (config.db_singleton_enabled === 'true') {
    if (sqliteDbInstance) return sqliteDbInstance;

    const client = createLocalSqliteClient(config);
    sqliteDbInstance = drizzle({ client });
    return sqliteDbInstance;
  }

  // Non-singleton mode: create new connection each time
  const client = createLocalSqliteClient(config);
  return drizzle({ client });
}
