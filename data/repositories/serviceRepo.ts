import { getDb } from '../db/sqlite';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ServiceStatus = 'Pending' | 'Performed';

export interface Service {
  id: number;
  vehicleId: number;
  status: ServiceStatus;
  notes: string | null;
  /** Stored as integer (paise/cents). Divide by 100 for display. */
  totalCost: number;
  createdAt: string;
}

/** Joined view used everywhere the UI needs vehicle + customer context */
export interface ServiceDetail extends Service {
  vehicleNumber: string;
  make: string | null;
  model: string | null;
  customerId: number;
  customerName: string;
  customerPhone: string;
  parts: ServicePart[];
}

export interface ServicePart {
  id: number;
  serviceId: number;
  name: string;
  quantity: number;
  /** Stored as integer (paise/cents). Captured at time of service. */
  priceAtTime: number;
  createdAt: string;
}

export type CreateServiceInput = Pick<Service, 'vehicleId' | 'notes'> & {
  parts: CreateServicePartInput[];
};

export type CreateServicePartInput = Pick<
  ServicePart,
  'name' | 'quantity' | 'priceAtTime'
>;

export type UpdateServiceInput = Partial<Pick<Service, 'status' | 'notes' | 'totalCost'>>;

export interface ServiceImage {
  id: number;
  uri: string;
  entityType: 'service';
  entityId: number;
  expiresAt: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

class RepositoryError extends Error {
  constructor(operation: string, cause: unknown) {
    super(`[serviceRepo.${operation}] ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'RepositoryError';
  }
}

function computeTotalCost(parts: CreateServicePartInput[]): number {
  return parts.reduce((sum, p) => sum + p.priceAtTime * p.quantity, 0);
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/**
 * Creates a service and all its parts atomically inside one transaction.
 * totalCost is computed from parts so the UI never has to calculate it.
 * Returns the id of the new service (fetch via getServiceDetail for full data).
 */
export async function createService(input: CreateServiceInput): Promise<number> {
  try {
    const db = await getDb();
    const totalCost = computeTotalCost(input.parts);
    let serviceId!: number;

    await db.withTransactionAsync(async () => {
      const serviceResult = await db.runAsync(
        `INSERT INTO Service (vehicleId, status, notes, totalCost)
         VALUES (?, 'Pending', ?, ?);`,
        input.vehicleId,
        input.notes ?? null,
        totalCost,
      );
      serviceId = serviceResult.lastInsertRowId;

      for (const part of input.parts) {
        await db.runAsync(
          `INSERT INTO ServicePart (serviceId, name, quantity, priceAtTime)
           VALUES (?, ?, ?, ?);`,
          serviceId,
          part.name,
          part.quantity,
          part.priceAtTime,
        );
      }
    });

    return serviceId;
  } catch (err) {
    throw new RepositoryError('createService', err);
  }
}

/**
 * Update service status or notes.
 * When marking as 'Performed', totalCost can be adjusted (e.g. discounts).
 */
export async function updateService(
  id: number,
  input: UpdateServiceInput,
): Promise<void> {
  try {
    const db = await getDb();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (input.status !== undefined)    { fields.push('status = ?');    values.push(input.status); }
    if (input.notes !== undefined)     { fields.push('notes = ?');     values.push(input.notes); }
    if (input.totalCost !== undefined) { fields.push('totalCost = ?'); values.push(input.totalCost); }

    if (fields.length === 0) return;

    values.push(id);
    await db.runAsync(
      `UPDATE Service SET ${fields.join(', ')} WHERE id = ?;`,
      ...values,
    );
  } catch (err) {
    throw new RepositoryError('updateService', err);
  }
}

/**
 * Marks a service as Performed.
 * Convenience wrapper around updateService.
 */
export async function markServicePerformed(id: number): Promise<void> {
  return updateService(id, { status: 'Performed' });
}

/**
 * Delete a service — cascades to ServicePart via FK.
 */
export async function deleteService(id: number): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync('DELETE FROM Service WHERE id = ?;', id);
  } catch (err) {
    throw new RepositoryError('deleteService', err);
  }
}

// ---------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------

/**
 * Add a single part to an existing service.
 * Recalculates and persists the new totalCost atomically.
 */
export async function addPartToService(
  serviceId: number,
  part: CreateServicePartInput,
): Promise<void> {
  try {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO ServicePart (serviceId, name, quantity, priceAtTime)
         VALUES (?, ?, ?, ?);`,
        serviceId,
        part.name,
        part.quantity,
        part.priceAtTime,
      );
      // Recompute totalCost from all parts to stay consistent
      await db.runAsync(
        `UPDATE Service
         SET totalCost = (
           SELECT COALESCE(SUM(priceAtTime * quantity), 0)
           FROM ServicePart
           WHERE serviceId = ?
         )
         WHERE id = ?;`,
        serviceId,
        serviceId,
      );
    });
  } catch (err) {
    throw new RepositoryError('addPartToService', err);
  }
}

/**
 * Remove a part and recompute the service totalCost.
 */
export async function removePartFromService(partId: number): Promise<void> {
  try {
    const db = await getDb();
    // Find serviceId first
    const part = await db.getFirstAsync<{ serviceId: number }>(
      'SELECT serviceId FROM ServicePart WHERE id = ?;',
      partId,
    );
    if (!part) return;

    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM ServicePart WHERE id = ?;', partId);
      await db.runAsync(
        `UPDATE Service
         SET totalCost = (
           SELECT COALESCE(SUM(priceAtTime * quantity), 0)
           FROM ServicePart
           WHERE serviceId = ?
         )
         WHERE id = ?;`,
        part.serviceId,
        part.serviceId,
      );
    });
  } catch (err) {
    throw new RepositoryError('removePartFromService', err);
  }
}

/**
 * All parts for a service.
 */
export async function getPartsByServiceId(serviceId: number): Promise<ServicePart[]> {
  try {
    const db = await getDb();
    return await db.getAllAsync<ServicePart>(
      'SELECT * FROM ServicePart WHERE serviceId = ? ORDER BY createdAt ASC;',
      serviceId,
    );
  } catch (err) {
    throw new RepositoryError('getPartsByServiceId', err);
  }
}

// ---------------------------------------------------------------------------
// Read queries
// ---------------------------------------------------------------------------

/**
 * Full service record with vehicle, customer, and parts.
 * This is the main detail view query.
 */
export async function getServiceDetail(serviceId: number): Promise<ServiceDetail | null> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<Omit<ServiceDetail, 'parts'>>(`
      SELECT
        s.*,
        v.vehicleNumber,
        v.make,
        v.model,
        c.id    AS customerId,
        c.name  AS customerName,
        c.phone AS customerPhone
      FROM Service s
      INNER JOIN Vehicle  v ON v.id = s.vehicleId
      INNER JOIN Customer c ON c.id = v.customerId
      WHERE s.id = ?;
    `, serviceId);

    if (!row) return null;

    const parts = await getPartsByServiceId(serviceId);
    return { ...row, parts };
  } catch (err) {
    throw new RepositoryError('getServiceDetail', err);
  }
}

/**
 * All services for a vehicle, newest first.
 */
export async function getServicesByVehicleId(vehicleId: number): Promise<Service[]> {
  try {
    const db = await getDb();
    return await db.getAllAsync<Service>(
      'SELECT * FROM Service WHERE vehicleId = ? ORDER BY createdAt DESC;',
      vehicleId,
    );
  } catch (err) {
    throw new RepositoryError('getServicesByVehicleId', err);
  }
}

/**
 * Recent N services with vehicle and customer context.
 * Used by the Dashboard's recent activity list.
 */
export async function getRecentServices(limit: number = 10): Promise<ServiceDetail[]> {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync<Omit<ServiceDetail, 'parts'>>(`
      SELECT
        s.*,
        v.vehicleNumber,
        v.make,
        v.model,
        c.id    AS customerId,
        c.name  AS customerName,
        c.phone AS customerPhone
      FROM Service s
      INNER JOIN Vehicle  v ON v.id = s.vehicleId
      INNER JOIN Customer c ON c.id = v.customerId
      ORDER BY s.createdAt DESC
      LIMIT ?;
    `, limit);

    // Attach parts for each — small N so N+1 is acceptable here
    return await Promise.all(
      rows.map(async (row) => ({
        ...row,
        parts: await getPartsByServiceId(row.id),
      })),
    );
  } catch (err) {
    throw new RepositoryError('getRecentServices', err);
  }
}

/**
 * Paginated service list with joined vehicle + customer.
 * Used by the Services screen master list.
 */
export async function getServicesPaginated(
  limit: number,
  offset: number,
  status?: ServiceStatus,
): Promise<Omit<ServiceDetail, 'parts'>[]> {
  try {
    const db = await getDb();
    if (status) {
      return await db.getAllAsync<Omit<ServiceDetail, 'parts'>>(`
        SELECT
          s.*,
          v.vehicleNumber,
          v.make,
          v.model,
          c.id    AS customerId,
          c.name  AS customerName,
          c.phone AS customerPhone
        FROM Service s
        INNER JOIN Vehicle  v ON v.id = s.vehicleId
        INNER JOIN Customer c ON c.id = v.customerId
        WHERE s.status = ?
        ORDER BY s.createdAt DESC
        LIMIT ? OFFSET ?;
      `, status, limit, offset);
    }
    return await db.getAllAsync<Omit<ServiceDetail, 'parts'>>(`
      SELECT
        s.*,
        v.vehicleNumber,
        v.make,
        v.model,
        c.id    AS customerId,
        c.name  AS customerName,
        c.phone AS customerPhone
      FROM Service s
      INNER JOIN Vehicle  v ON v.id = s.vehicleId
      INNER JOIN Customer c ON c.id = v.customerId
      ORDER BY s.createdAt DESC
      LIMIT ? OFFSET ?;
    `, limit, offset);
  } catch (err) {
    throw new RepositoryError('getServicesPaginated', err);
  }
}

// ---------------------------------------------------------------------------
// Image helpers
// ---------------------------------------------------------------------------

/**
 * Attach an image to a service record.
 */
export async function addServiceImage(
  serviceId: number,
  uri: string,
  expiresAt: string,
): Promise<ServiceImage> {
  try {
    const db = await getDb();
    const result = await db.runAsync(
      `INSERT INTO Image (uri, entityType, entityId, expiresAt)
       VALUES (?, 'service', ?, ?);`,
      uri,
      serviceId,
      expiresAt,
    );
    const created = await db.getFirstAsync<ServiceImage>(
      'SELECT * FROM Image WHERE id = ?;',
      result.lastInsertRowId,
    );
    if (!created) throw new Error('Row not found after insert');
    return created;
  } catch (err) {
    throw new RepositoryError('addServiceImage', err);
  }
}

/**
 * All non-expired images for a service.
 */
export async function getServiceImages(serviceId: number): Promise<ServiceImage[]> {
  try {
    const db = await getDb();
    return await db.getAllAsync<ServiceImage>(`
      SELECT * FROM Image
      WHERE entityType = 'service' AND entityId = ?
        AND expiresAt > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      ORDER BY createdAt DESC;
    `, serviceId);
  } catch (err) {
    throw new RepositoryError('getServiceImages', err);
  }
}

// ---------------------------------------------------------------------------
// TTL cleanup (called on app start)
// ---------------------------------------------------------------------------

/**
 * Returns URIs of expired images so the caller can delete files from disk,
 * then removes their metadata rows from the DB.
 * Runs in a transaction so file list and DB state stay in sync.
 */
export async function purgeExpiredImages(): Promise<string[]> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();

    const expired = await db.getAllAsync<{ uri: string }>(
      `SELECT uri FROM Image WHERE expiresAt <= ?;`,
      now,
    );
    const uris = expired.map((r) => r.uri);

    if (uris.length > 0) {
      await db.runAsync(
        `DELETE FROM Image WHERE expiresAt <= ?;`,
        now,
      );
    }

    return uris;
  } catch (err) {
    throw new RepositoryError('purgeExpiredImages', err);
  }
}
