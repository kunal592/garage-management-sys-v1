import * as FileSystem from 'expo-file-system';
import { getDb } from '../db/sqlite';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EntityType = 'vehicle' | 'service';

export interface ImageRecord {
  id: number;
  uri: string;
  entityType: EntityType;
  entityId: number;
  expiresAt: string;
  createdAt: string;
}

class RepositoryError extends Error {
  constructor(operation: string, cause: unknown) {
    super(`[imageRepo.${operation}] ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'RepositoryError';
  }
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/**
 * Ensures the localized private image directory exists safely.
 */
async function ensureImageDirectory(): Promise<string> {
  const dir = `${FileSystem.documentDirectory}images/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

/**
 * Saves a temporary image from the camera/picker permanently into the local DocumentDirectory
 * and establishes a TTL (Time To Live) record in SQLite.
 * 
 * @param sourceUri File system path to the temporary image.
 * @param entityType 'vehicle' or 'service'
 * @param entityId The parent record ID
 * @param ttlDays Expiration span. Default 30 days.
 */
export async function saveImage(
  sourceUri: string,
  entityType: EntityType,
  entityId: number,
  ttlDays: number = 30
): Promise<ImageRecord> {
  try {
    const dir = await ensureImageDirectory();
    
    // Hash-like deterministic filename ensuring uniqueness
    const fileName = `img_${entityType}_${entityId}_${Date.now()}.jpg`;
    const destUri = `${dir}${fileName}`;

    await FileSystem.copyAsync({ from: sourceUri, to: destUri });

    const db = await getDb();
    
    const now = Date.now();
    const expiresAt = new Date(now + ttlDays * 24 * 60 * 60 * 1000).toISOString();

    const result = await db.runAsync(
      `INSERT INTO Image (uri, entityType, entityId, expiresAt)
       VALUES (?, ?, ?, ?);`,
      destUri,
      entityType,
      entityId,
      expiresAt
    );

    const created = await db.getFirstAsync<ImageRecord>(
      'SELECT * FROM Image WHERE id = ?;',
      result.lastInsertRowId
    );
    
    if (!created) throw new Error('Failed to retrieve inserted image record');
    
    return created;
  } catch (err) {
    throw new RepositoryError('saveImage', err);
  }
}

/**
 * Fetches active (non-expired) images for a specific entity.
 */
export async function getImagesForEntity(entityType: EntityType, entityId: number): Promise<ImageRecord[]> {
  try {
    const db = await getDb();
    return await db.getAllAsync<ImageRecord>(
      `SELECT * FROM Image 
       WHERE entityType = ? AND entityId = ?
       ORDER BY createdAt DESC;`,
      entityType,
      entityId
    );
  } catch (err) {
    throw new RepositoryError('getImagesForEntity', err);
  }
}

/**
 * System boot orchestrator: 
 * Physically deletes local disk assets where TTL has expired, then cleans DB map.
 */
export async function cleanupExpiredImages(): Promise<void> {
  try {
    const db = await getDb();
    
    // 1. Identify which rows are past expiration
    const nowISO = new Date().toISOString();
    const expired = await db.getAllAsync<{ id: number; uri: string }>(
      'SELECT id, uri FROM Image WHERE expiresAt <= ?;',
      nowISO
    );

    if (expired.length === 0) return; // Silent exit if clean

    // 2. Destroy disk structures safely
    for (const record of expired) {
      await FileSystem.deleteAsync(record.uri, { idempotent: true });
    }

    // 3. Drop records
    const ids = expired.map(r => r.id);
    const placeholders = ids.map(() => '?').join(',');
    await db.runAsync(
      `DELETE FROM Image WHERE id IN (${placeholders});`,
      ...ids
    );

    console.log(`[ImageTTL] Cleaned up ${expired.length} expired images from disk.`);
  } catch (err) {
    throw new RepositoryError('cleanupExpiredImages', err);
  }
}

/**
 * Explicit manual delete function
 */
export async function deleteImage(imageId: number): Promise<void> {
  try {
    const db = await getDb();
    const record = await db.getFirstAsync<{ uri: string }>('SELECT uri FROM Image WHERE id = ?;', imageId);
    
    if (record) {
      await FileSystem.deleteAsync(record.uri, { idempotent: true });
      await db.runAsync('DELETE FROM Image WHERE id = ?;', imageId);
    }
  } catch (err) {
    throw new RepositoryError('deleteImage', err);
  }
}
