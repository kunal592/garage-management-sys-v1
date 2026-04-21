import { getDb } from '../db/sqlite';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Top-level statistics card data */
export interface DashboardStats {
  totalCustomers: number;
  totalVehicles: number;
  /** Sum of Performed services today. Integer (paise/cents). */
  dailyRevenue: number;
  /** Total Performed services today */
  dailyServiceCount: number;
  /** Number of Pending services */
  pendingServices: number;
}

/** Used by the Dashboard recent activity list */
export interface RecentServiceRow {
  id: number;
  vehicleNumber: string;
  make: string | null;
  model: string | null;
  customerName: string;
  customerPhone: string;
  status: string;
  totalCost: number;
  createdAt: string;
}

/** Monthly revenue data point — used by Analytics chart */
export interface MonthlyRevenue {
  /** Format: 'YYYY-MM' */
  month: string;
  /** Sum of totalCost for Performed services. Integer (paise/cents). */
  revenue: number;
  serviceCount: number;
}

/** Top service parts by usage frequency */
export interface TopPart {
  name: string;
  usageCount: number;
  totalRevenue: number;
}

/** Top customers by spend */
export interface TopCustomer {
  customerId: number;
  customerName: string;
  customerPhone: string;
  totalSpend: number;
  serviceCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

class RepositoryError extends Error {
  constructor(operation: string, cause: unknown) {
    super(`[dashboardRepo.${operation}] ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'RepositoryError';
  }
}

// ---------------------------------------------------------------------------
// Dashboard stats (single aggregation query for performance)
// ---------------------------------------------------------------------------

/**
 * Fetches all top-level dashboard KPIs in as few queries as possible.
 * Runs three focused COUNT/SUM queries — each hits a single indexed table.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const db = await getDb();

    const counts = await db.getFirstAsync<{
      totalCustomers: number;
      totalVehicles: number;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM Customer) AS totalCustomers,
        (SELECT COUNT(*) FROM Vehicle)  AS totalVehicles;
    `);

    const todayRevenue = await db.getFirstAsync<{
      dailyRevenue: number;
      dailyServiceCount: number;
    }>(`
      SELECT
        COALESCE(SUM(totalCost), 0) AS dailyRevenue,
        COUNT(*)                    AS dailyServiceCount
      FROM Service
      WHERE status = 'Performed'
        AND date(createdAt) = date('now');
    `);

    const pending = await db.getFirstAsync<{ pendingServices: number }>(`
      SELECT COUNT(*) AS pendingServices
      FROM Service
      WHERE status = 'Pending';
    `);

    return {
      totalCustomers:   counts?.totalCustomers   ?? 0,
      totalVehicles:    counts?.totalVehicles     ?? 0,
      dailyRevenue:     todayRevenue?.dailyRevenue      ?? 0,
      dailyServiceCount: todayRevenue?.dailyServiceCount ?? 0,
      pendingServices:  pending?.pendingServices  ?? 0,
    };
  } catch (err) {
    throw new RepositoryError('getDashboardStats', err);
  }
}

// ---------------------------------------------------------------------------
// Recent services list
// ---------------------------------------------------------------------------

/**
 * Lightweight recent service rows for the Dashboard activity feed.
 * Does NOT load parts — keeps the query fast.
 * Defaults to last 10 records.
 */
export async function getRecentServiceRows(limit: number = 10): Promise<RecentServiceRow[]> {
  try {
    const db = await getDb();
    return await db.getAllAsync<RecentServiceRow>(`
      SELECT
        s.id,
        v.vehicleNumber,
        v.make,
        v.model,
        c.name  AS customerName,
        c.phone AS customerPhone,
        s.status,
        s.totalCost,
        s.createdAt
      FROM Service s
      INNER JOIN Vehicle  v ON v.id = s.vehicleId
      INNER JOIN Customer c ON c.id = v.customerId
      ORDER BY s.createdAt DESC
      LIMIT ?;
    `, limit);
  } catch (err) {
    throw new RepositoryError('getRecentServiceRows', err);
  }
}

// ---------------------------------------------------------------------------
// Analytics — Monthly revenue
// ---------------------------------------------------------------------------

/**
 * Revenue and service count grouped by month for the last N months.
 * Only counts Performed services (Pending = no money collected yet).
 * Returns results ordered oldest → newest for charting.
 *
 * @param months - Number of months to look back (default 6)
 */
export async function getMonthlyRevenue(months: number = 6): Promise<MonthlyRevenue[]> {
  try {
    const db = await getDb();
    return await db.getAllAsync<MonthlyRevenue>(`
      SELECT
        strftime('%Y-%m', createdAt)    AS month,
        COALESCE(SUM(totalCost), 0)     AS revenue,
        COUNT(*)                        AS serviceCount
      FROM Service
      WHERE
        status    = 'Performed'
        AND createdAt >= date('now', '-' || ? || ' months')
      GROUP BY strftime('%Y-%m', createdAt)
      ORDER BY month ASC;
    `, months);
  } catch (err) {
    throw new RepositoryError('getMonthlyRevenue', err);
  }
}

// ---------------------------------------------------------------------------
// Analytics — Top parts
// ---------------------------------------------------------------------------

/**
 * Most-used service parts across all Performed services.
 * Grouped and sorted by usage count descending.
 *
 * @param limit - Number of top parts to return (default 10)
 */
export async function getTopParts(limit: number = 10): Promise<TopPart[]> {
  try {
    const db = await getDb();
    return await db.getAllAsync<TopPart>(`
      SELECT
        sp.name,
        SUM(sp.quantity)                         AS usageCount,
        COALESCE(SUM(sp.priceAtTime * sp.quantity), 0) AS totalRevenue
      FROM ServicePart sp
      INNER JOIN Service s ON s.id = sp.serviceId
      WHERE s.status = 'Performed'
      GROUP BY sp.name
      ORDER BY usageCount DESC
      LIMIT ?;
    `, limit);
  } catch (err) {
    throw new RepositoryError('getTopParts', err);
  }
}

// ---------------------------------------------------------------------------
// Analytics — Top customers
// ---------------------------------------------------------------------------

/**
 * Customers ranked by total spend across all Performed services.
 *
 * @param limit - Number of top customers to return (default 10)
 */
export async function getTopCustomers(limit: number = 10): Promise<TopCustomer[]> {
  try {
    const db = await getDb();
    return await db.getAllAsync<TopCustomer>(`
      SELECT
        c.id                             AS customerId,
        c.name                           AS customerName,
        c.phone                          AS customerPhone,
        COALESCE(SUM(s.totalCost), 0)   AS totalSpend,
        COUNT(s.id)                      AS serviceCount
      FROM Customer c
      INNER JOIN Vehicle  v ON v.customerId = c.id
      INNER JOIN Service  s ON s.vehicleId  = v.id
      WHERE s.status = 'Performed'
      GROUP BY c.id
      ORDER BY totalSpend DESC
      LIMIT ?;
    `, limit);
  } catch (err) {
    throw new RepositoryError('getTopCustomers', err);
  }
}

// ---------------------------------------------------------------------------
// Backup — full data export
// ---------------------------------------------------------------------------

/**
 * Returns every row from every table as plain objects for JSON serialisation.
 * Used exclusively by the backup feature — not for normal UI queries.
 */
export async function exportAllData(): Promise<{
  customers: unknown[];
  vehicles: unknown[];
  services: unknown[];
  serviceParts: unknown[];
  images: unknown[];
}> {
  try {
    const db = await getDb();
    const [customers, vehicles, services, serviceParts, images] = await Promise.all([
      db.getAllAsync('SELECT * FROM Customer ORDER BY id ASC;'),
      db.getAllAsync('SELECT * FROM Vehicle ORDER BY id ASC;'),
      db.getAllAsync('SELECT * FROM Service ORDER BY id ASC;'),
      db.getAllAsync('SELECT * FROM ServicePart ORDER BY id ASC;'),
      db.getAllAsync('SELECT * FROM Image ORDER BY id ASC;'),
    ]);
    return { customers, vehicles, services, serviceParts, images };
  } catch (err) {
    throw new RepositoryError('exportAllData', err);
  }
}

/**
 * Clears all tables in safe dependency order and re-inserts rows from a backup.
 * Runs entirely inside a single transaction — atomically replaces all data.
 * Called by the Restore flow.
 */
export async function importAllData(data: {
  customers: Record<string, unknown>[];
  vehicles: Record<string, unknown>[];
  services: Record<string, unknown>[];
  serviceParts: Record<string, unknown>[];
  images: Record<string, unknown>[];
}): Promise<void> {
  try {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      // Clear in reverse dependency order
      await db.execAsync('DELETE FROM Image;');
      await db.execAsync('DELETE FROM ServicePart;');
      await db.execAsync('DELETE FROM Service;');
      await db.execAsync('DELETE FROM Vehicle;');
      await db.execAsync('DELETE FROM Customer;');

      for (const row of data.customers) {
        await db.runAsync(
          'INSERT INTO Customer (id, name, phone, createdAt) VALUES (?, ?, ?, ?);',
          row.id as number, row.name as string, row.phone as string, row.createdAt as string,
        );
      }
      for (const row of data.vehicles) {
        await db.runAsync(
          `INSERT INTO Vehicle (id, customerId, vehicleNumber, make, model, year, nextServiceDate, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          row.id as number, row.customerId as number, row.vehicleNumber as string,
          (row.make ?? null) as string | null, (row.model ?? null) as string | null,
          (row.year ?? null) as number | null, (row.nextServiceDate ?? null) as string | null,
          row.createdAt as string,
        );
      }
      for (const row of data.services) {
        await db.runAsync(
          `INSERT INTO Service (id, vehicleId, status, notes, totalCost, createdAt)
           VALUES (?, ?, ?, ?, ?, ?);`,
          row.id as number, row.vehicleId as number, row.status as string,
          (row.notes ?? null) as string | null, row.totalCost as number, row.createdAt as string,
        );
      }
      for (const row of data.serviceParts) {
        await db.runAsync(
          `INSERT INTO ServicePart (id, serviceId, name, quantity, priceAtTime, createdAt)
           VALUES (?, ?, ?, ?, ?, ?);`,
          row.id as number, row.serviceId as number, row.name as string,
          row.quantity as number, row.priceAtTime as number, row.createdAt as string,
        );
      }
      for (const row of data.images) {
        await db.runAsync(
          `INSERT INTO Image (id, uri, entityType, entityId, expiresAt, createdAt)
           VALUES (?, ?, ?, ?, ?, ?);`,
          row.id as number, row.uri as string, row.entityType as string,
          row.entityId as number, row.expiresAt as string, row.createdAt as string,
        );
      }
    });
  } catch (err) {
    throw new RepositoryError('importAllData', err);
  }
}
