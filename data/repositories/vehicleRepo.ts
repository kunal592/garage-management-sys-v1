import { getDb } from '../db/sqlite';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Vehicle {
  id: number;
  customerId: number;
  vehicleNumber: string;
  make: string | null;
  model: string | null;
  year: number | null;
  nextServiceDate: string | null;
  createdAt: string;
}

/** Joined view used in lists — avoids a second query for customer name */
export interface VehicleWithCustomer extends Vehicle {
  customerName: string;
  customerPhone: string;
}

export type CreateVehicleInput = Pick<
  Vehicle,
  'customerId' | 'vehicleNumber' | 'make' | 'model' | 'year' | 'nextServiceDate'
>;

export type UpdateVehicleInput = Partial<
  Pick<Vehicle, 'vehicleNumber' | 'make' | 'model' | 'year' | 'nextServiceDate'>
>;

/** Shape returned by the Alerts screen query */
export interface UpcomingServiceAlert {
  vehicleId: number;
  vehicleNumber: string;
  make: string | null;
  model: string | null;
  nextServiceDate: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

class RepositoryError extends Error {
  constructor(operation: string, cause: unknown) {
    super(`[vehicleRepo.${operation}] ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'RepositoryError';
  }
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Insert a new vehicle under a customer.
 */
export async function createVehicle(input: CreateVehicleInput): Promise<Vehicle> {
  try {
    const db = await getDb();
    const result = await db.runAsync(
      `INSERT INTO Vehicle (customerId, vehicleNumber, make, model, year, nextServiceDate)
       VALUES (?, ?, ?, ?, ?, ?);`,
      input.customerId,
      input.vehicleNumber,
      input.make ?? null,
      input.model ?? null,
      input.year ?? null,
      input.nextServiceDate ?? null,
    );
    const created = await db.getFirstAsync<Vehicle>(
      'SELECT * FROM Vehicle WHERE id = ?;',
      result.lastInsertRowId,
    );
    if (!created) throw new Error('Row not found after insert');
    return created;
  } catch (err) {
    throw new RepositoryError('createVehicle', err);
  }
}

/**
 * All vehicles for a specific customer.
 */
export async function getVehiclesByCustomerId(customerId: number): Promise<Vehicle[]> {
  try {
    const db = await getDb();
    return await db.getAllAsync<Vehicle>(
      'SELECT * FROM Vehicle WHERE customerId = ? ORDER BY createdAt DESC;',
      customerId,
    );
  } catch (err) {
    throw new RepositoryError('getVehiclesByCustomerId', err);
  }
}

/**
 * All vehicles with joined customer info — used in search / master list.
 */
export async function getAllVehiclesWithCustomer(): Promise<VehicleWithCustomer[]> {
  try {
    const db = await getDb();
    return await db.getAllAsync<VehicleWithCustomer>(`
      SELECT
        v.*,
        c.name  AS customerName,
        c.phone AS customerPhone
      FROM Vehicle v
      INNER JOIN Customer c ON c.id = v.customerId
      ORDER BY v.createdAt DESC;
    `);
  } catch (err) {
    throw new RepositoryError('getAllVehiclesWithCustomer', err);
  }
}

/**
 * Single vehicle by id.
 */
export async function getVehicleById(id: number): Promise<Vehicle | null> {
  try {
    const db = await getDb();
    return await db.getFirstAsync<Vehicle>(
      'SELECT * FROM Vehicle WHERE id = ?;',
      id,
    );
  } catch (err) {
    throw new RepositoryError('getVehicleById', err);
  }
}

/**
 * Partial update — only specified fields are written.
 */
export async function updateVehicle(
  id: number,
  input: UpdateVehicleInput,
): Promise<Vehicle | null> {
  try {
    const db = await getDb();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (input.vehicleNumber !== undefined) { fields.push('vehicleNumber = ?'); values.push(input.vehicleNumber); }
    if (input.make !== undefined)          { fields.push('make = ?');          values.push(input.make); }
    if (input.model !== undefined)         { fields.push('model = ?');         values.push(input.model); }
    if (input.year !== undefined)          { fields.push('year = ?');          values.push(input.year); }
    if (input.nextServiceDate !== undefined) {
      fields.push('nextServiceDate = ?');
      values.push(input.nextServiceDate);
    }

    if (fields.length === 0) return getVehicleById(id);

    values.push(id);
    await db.runAsync(
      `UPDATE Vehicle SET ${fields.join(', ')} WHERE id = ?;`,
      ...values,
    );
    return getVehicleById(id);
  } catch (err) {
    throw new RepositoryError('updateVehicle', err);
  }
}

/**
 * Set nextServiceDate only — called after completing a service.
 */
export async function setNextServiceDate(
  vehicleId: number,
  nextServiceDate: string | null,
): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(
      'UPDATE Vehicle SET nextServiceDate = ? WHERE id = ?;',
      nextServiceDate,
      vehicleId,
    );
  } catch (err) {
    throw new RepositoryError('setNextServiceDate', err);
  }
}

/**
 * Delete a vehicle and all its dependent records via CASCADE.
 */
export async function deleteVehicle(id: number): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync('DELETE FROM Vehicle WHERE id = ?;', id);
  } catch (err) {
    throw new RepositoryError('deleteVehicle', err);
  }
}

/**
 * Total count of vehicles — used by dashboard.
 */
export async function countVehicles(): Promise<number> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ total: number }>(
      'SELECT COUNT(*) AS total FROM Vehicle;',
    );
    return row?.total ?? 0;
  } catch (err) {
    throw new RepositoryError('countVehicles', err);
  }
}

// ---------------------------------------------------------------------------
// Alerts query
// ---------------------------------------------------------------------------

/**
 * Returns vehicles whose nextServiceDate falls within the next `daysAhead` days.
 * Ordered by most urgent first.
 * Used exclusively by the Alerts screen.
 */
export async function getUpcomingServiceAlerts(
  daysAhead: number = 7,
): Promise<UpcomingServiceAlert[]> {
  try {
    const db = await getDb();
    return await db.getAllAsync<UpcomingServiceAlert>(`
      SELECT
        v.id           AS vehicleId,
        v.vehicleNumber,
        v.make,
        v.model,
        v.nextServiceDate,
        c.id           AS customerId,
        c.name         AS customerName,
        c.phone        AS customerPhone
      FROM Vehicle v
      INNER JOIN Customer c ON c.id = v.customerId
      WHERE
        v.nextServiceDate IS NOT NULL
        AND v.nextServiceDate <= date('now', '+' || ? || ' days')
        AND v.nextServiceDate >= date('now')
      ORDER BY v.nextServiceDate ASC;
    `, daysAhead);
  } catch (err) {
    throw new RepositoryError('getUpcomingServiceAlerts', err);
  }
}

// ---------------------------------------------------------------------------
// Image helpers (polymorphic Image table)
// ---------------------------------------------------------------------------

export interface VehicleImage {
  id: number;
  uri: string;
  entityType: 'vehicle';
  entityId: number;
  expiresAt: string;
  createdAt: string;
}

/**
 * Attach an image URI to a vehicle.
 * expiresAt is an ISO date string — TTL cleanup runs on app start.
 */
export async function addVehicleImage(
  vehicleId: number,
  uri: string,
  expiresAt: string,
): Promise<VehicleImage> {
  try {
    const db = await getDb();
    const result = await db.runAsync(
      `INSERT INTO Image (uri, entityType, entityId, expiresAt)
       VALUES (?, 'vehicle', ?, ?);`,
      uri,
      vehicleId,
      expiresAt,
    );
    const created = await db.getFirstAsync<VehicleImage>(
      'SELECT * FROM Image WHERE id = ?;',
      result.lastInsertRowId,
    );
    if (!created) throw new Error('Row not found after insert');
    return created;
  } catch (err) {
    throw new RepositoryError('addVehicleImage', err);
  }
}

/**
 * All non-expired images for a vehicle.
 */
export async function getVehicleImages(vehicleId: number): Promise<VehicleImage[]> {
  try {
    const db = await getDb();
    return await db.getAllAsync<VehicleImage>(`
      SELECT * FROM Image
      WHERE entityType = 'vehicle' AND entityId = ?
        AND expiresAt > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      ORDER BY createdAt DESC;
    `, vehicleId);
  } catch (err) {
    throw new RepositoryError('getVehicleImages', err);
  }
}
