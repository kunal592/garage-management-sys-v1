import * as SQLite from 'expo-sqlite';

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

const DB_NAME = 'garage.db';

/**
 * Singleton database handle.
 * expo-sqlite v14 uses openDatabaseAsync — awaited once at app start.
 * All repository functions receive this handle via getDb().
 */
let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  return _db;
}

// ---------------------------------------------------------------------------
// Bootstrap — call once from root layout
// ---------------------------------------------------------------------------

/**
 * Opens the DB, enables WAL journal mode and foreign key enforcement,
 * then creates all tables and indexes if they do not already exist.
 *
 * WAL = Write-Ahead Logging → dramatically faster concurrent writes on mobile.
 */
export async function initDatabase(): Promise<void> {
  const db = await getDb();

  // Performance primitives — must run before any DDL/DML
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  // Cache size in pages (negative = KiB). 8 MB cache reduces disk I/O.
  await db.execAsync('PRAGMA cache_size = -8000;');

  await db.withTransactionAsync(async () => {
    await createTables(db);
    await createIndexes(db);
  });
}

// ---------------------------------------------------------------------------
// DDL — Tables
// ---------------------------------------------------------------------------

async function createTables(db: SQLite.SQLiteDatabase): Promise<void> {
  // --- Customer -----------------------------------------------------------
  // Root entity. Everything flows from a customer → vehicle → service.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS Customer (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      phone       TEXT    NOT NULL UNIQUE,
      createdAt   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);

  // --- Vehicle ------------------------------------------------------------
  // Belongs to exactly one Customer.
  // vehicleNumber is unique across the fleet (registration plate).
  // nextServiceDate is nullable — set when a service schedules next visit.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS Vehicle (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      customerId      INTEGER NOT NULL,
      vehicleNumber   TEXT    NOT NULL UNIQUE,
      make            TEXT,
      model           TEXT,
      year            INTEGER,
      nextServiceDate TEXT,
      createdAt       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

      CONSTRAINT fk_vehicle_customer
        FOREIGN KEY (customerId) REFERENCES Customer(id)
        ON DELETE CASCADE
    );
  `);

  // --- Service ------------------------------------------------------------
  // A service record for a vehicle visit.
  // totalCost is stored as INTEGER (paise/cents) to avoid floating-point errors.
  // status is constrained to known values at the DB layer.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS Service (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicleId   INTEGER NOT NULL,
      status      TEXT    NOT NULL DEFAULT 'Pending'
                          CHECK(status IN ('Pending', 'Performed')),
      notes       TEXT,
      totalCost   INTEGER NOT NULL DEFAULT 0,
      createdAt   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

      CONSTRAINT fk_service_vehicle
        FOREIGN KEY (vehicleId) REFERENCES Vehicle(id)
        ON DELETE CASCADE
    );
  `);

  // --- ServicePart --------------------------------------------------------
  // Line-items within a service.
  // priceAtTime captures the price at the moment of service — critical so
  // historical totals remain accurate if prices change later.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ServicePart (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      serviceId   INTEGER NOT NULL,
      name        TEXT    NOT NULL,
      quantity    INTEGER NOT NULL DEFAULT 1,
      priceAtTime INTEGER NOT NULL DEFAULT 0,
      createdAt   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

      CONSTRAINT fk_servicepart_service
        FOREIGN KEY (serviceId) REFERENCES Service(id)
        ON DELETE CASCADE
    );
  `);

  // --- Image --------------------------------------------------------------
  // Stores local file URIs for images captured during a service.
  // entityType + entityId allow one Image table to serve Vehicle or Service
  // without adding nullable FK columns.
  // expiresAt drives the TTL cleanup on app launch (see IMAGE HANDLING spec).
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS Image (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      uri         TEXT    NOT NULL,
      entityType  TEXT    NOT NULL CHECK(entityType IN ('vehicle', 'service')),
      entityId    INTEGER NOT NULL,
      expiresAt   TEXT    NOT NULL,
      createdAt   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);
}

// ---------------------------------------------------------------------------
// DDL — Indexes
// ---------------------------------------------------------------------------
// Only index columns that are:
//   (a) used in WHERE clauses in repository queries, or
//   (b) foreign keys (SQLite does NOT auto-index FK columns)

async function createIndexes(db: SQLite.SQLiteDatabase): Promise<void> {
  // Vehicle → look up by customer (FK) and by plate
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_vehicle_customerId
      ON Vehicle(customerId);
  `);

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_vehicle_nextServiceDate
      ON Vehicle(nextServiceDate)
      WHERE nextServiceDate IS NOT NULL;
  `);

  // Service → look up by vehicle (FK), status filter, and date range
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_service_vehicleId
      ON Service(vehicleId);
  `);

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_service_status
      ON Service(status);
  `);

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_service_createdAt
      ON Service(createdAt);
  `);

  // ServicePart → always queried by serviceId (FK)
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_servicepart_serviceId
      ON ServicePart(serviceId);
  `);

  // Image → TTL cleanup queries by expiresAt; entity lookup
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_image_expiresAt
      ON Image(expiresAt);
  `);

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_image_entity
      ON Image(entityType, entityId);
  `);
}

// ---------------------------------------------------------------------------
// Teardown (dev/testing only)
// ---------------------------------------------------------------------------

/**
 * Drops all tables in reverse dependency order.
 * USE ONLY in development / test resets — never call in production.
 */
export async function dropAllTables(): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.execAsync('DROP TABLE IF EXISTS Image;');
    await db.execAsync('DROP TABLE IF EXISTS ServicePart;');
    await db.execAsync('DROP TABLE IF EXISTS Service;');
    await db.execAsync('DROP TABLE IF EXISTS Vehicle;');
    await db.execAsync('DROP TABLE IF EXISTS Customer;');
  });
}
