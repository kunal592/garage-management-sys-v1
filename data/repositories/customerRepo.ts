import { getDb } from '../db/sqlite';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Customer {
  id: number;
  name: string;
  phone: string;
  createdAt: string;
}

export type CreateCustomerInput = Pick<Customer, 'name' | 'phone'>;
export type UpdateCustomerInput = Partial<Pick<Customer, 'name' | 'phone'>>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

class RepositoryError extends Error {
  constructor(operation: string, cause: unknown) {
    super(`[customerRepo.${operation}] ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'RepositoryError';
  }
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Insert a new customer.
 * Returns the newly created Customer row.
 * Throws if the phone number already exists (UNIQUE constraint).
 */
export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  try {
    const db = await getDb();
    const result = await db.runAsync(
      'INSERT INTO Customer (name, phone) VALUES (?, ?);',
      input.name,
      input.phone,
    );
    const created = await db.getFirstAsync<Customer>(
      'SELECT * FROM Customer WHERE id = ?;',
      result.lastInsertRowId,
    );
    if (!created) throw new Error('Row not found after insert');
    return created;
  } catch (err) {
    throw new RepositoryError('createCustomer', err);
  }
}

/**
 * Fetch all customers, newest first.
 * Supports optional search by name or phone (case-insensitive).
 */
export async function getAllCustomers(search?: string): Promise<Customer[]> {
  try {
    const db = await getDb();
    if (search && search.trim() !== '') {
      const pattern = `%${search.trim()}%`;
      return await db.getAllAsync<Customer>(
        `SELECT * FROM Customer
         WHERE name LIKE ? OR phone LIKE ?
         ORDER BY createdAt DESC;`,
        pattern,
        pattern,
      );
    }
    return await db.getAllAsync<Customer>(
      'SELECT * FROM Customer ORDER BY createdAt DESC;',
    );
  } catch (err) {
    throw new RepositoryError('getAllCustomers', err);
  }
}

/**
 * Paginated customer list for large datasets.
 */
export async function getCustomersPaginated(
  limit: number,
  offset: number,
): Promise<Customer[]> {
  try {
    const db = await getDb();
    return await db.getAllAsync<Customer>(
      'SELECT * FROM Customer ORDER BY createdAt DESC LIMIT ? OFFSET ?;',
      limit,
      offset,
    );
  } catch (err) {
    throw new RepositoryError('getCustomersPaginated', err);
  }
}

/**
 * Fetch a single customer by id.
 * Returns null if not found.
 */
export async function getCustomerById(id: number): Promise<Customer | null> {
  try {
    const db = await getDb();
    return await db.getFirstAsync<Customer>(
      'SELECT * FROM Customer WHERE id = ?;',
      id,
    );
  } catch (err) {
    throw new RepositoryError('getCustomerById', err);
  }
}

/**
 * Update name and/or phone for an existing customer.
 * Only provided fields are updated (partial update).
 */
export async function updateCustomer(
  id: number,
  input: UpdateCustomerInput,
): Promise<Customer | null> {
  try {
    const db = await getDb();
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (input.name !== undefined) { fields.push('name = ?'); values.push(input.name); }
    if (input.phone !== undefined) { fields.push('phone = ?'); values.push(input.phone); }

    if (fields.length === 0) return getCustomerById(id);

    values.push(id);
    await db.runAsync(
      `UPDATE Customer SET ${fields.join(', ')} WHERE id = ?;`,
      ...values,
    );
    return getCustomerById(id);
  } catch (err) {
    throw new RepositoryError('updateCustomer', err);
  }
}

/**
 * Delete a customer by id.
 * Cascades to: Vehicle → Service → ServicePart (via FK ON DELETE CASCADE).
 */
export async function deleteCustomer(id: number): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync('DELETE FROM Customer WHERE id = ?;', id);
  } catch (err) {
    throw new RepositoryError('deleteCustomer', err);
  }
}

/**
 * Total count of customers — used by dashboard.
 */
export async function countCustomers(): Promise<number> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ total: number }>(
      'SELECT COUNT(*) AS total FROM Customer;',
    );
    return row?.total ?? 0;
  } catch (err) {
    throw new RepositoryError('countCustomers', err);
  }
}
