import { useState, useCallback, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { exportAllData, importAllData } from '@/data/repositories/dashboardRepo';
import { queryClient } from '@/components/providers/QueryProvider';

const LAST_BACKUP_KEY = '@last_backup_date';

/** Core backup generator logic oblivious to React state */
export async function generateBackupFile(): Promise<string> {
  if (!FileSystem.documentDirectory) {
    throw new Error('File system access not available on this device.');
  }
  const backupDir = `${FileSystem.documentDirectory}backups/`;
  const dirInfo = await FileSystem.getInfoAsync(backupDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });
  }

  // Format name: garagems-backup-YYYY-MM.json
  const now = new Date();
  const year = now.getFullYear();
  // We include DD so multiple backups in a month just overwrite the day,
  // but if the user asked for YYYY-MM exactly, let's stick to it unless it conflicts.
  // Actually, requested: garagems-backup-YYYY-MM.json
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const fileName = `garagems-backup-${year}-${month}.json`;
  const fileUri = `${backupDir}${fileName}`;

  // Export all data to JSON
  const dbData = await exportAllData();
  const jsonString = JSON.stringify(dbData, null, 2);

  // Save to filesystem
  await FileSystem.writeAsStringAsync(fileUri, jsonString, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const timestamp = now.toISOString();
  await AsyncStorage.setItem(LAST_BACKUP_KEY, timestamp);

  return fileUri;
}

/** 
 * Enforces the 30-day auto-backup policy and the 6-file retention limit.
 * Designed to be called exactly once on app boot.
 */
export async function runAutoBackupPolicy(): Promise<void> {
  try {
    const lastStr = await AsyncStorage.getItem(LAST_BACKUP_KEY);
    let shouldBackup = false;

    if (!lastStr) {
      shouldBackup = true;
    } else {
      const daysSince = (Date.now() - new Date(lastStr).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince >= 30) {
        shouldBackup = true;
      }
    }

    if (shouldBackup) {
      await generateBackupFile();
    }

    // Now enforce the 6-file retention policy
    if (!FileSystem.documentDirectory) return;
    const backupDir = `${FileSystem.documentDirectory}backups/`;
    const dirInfo = await FileSystem.getInfoAsync(backupDir);
    if (!dirInfo.exists) return;

    const files = await FileSystem.readDirectoryAsync(backupDir);
    const backupFiles = files.filter(f => f.startsWith('garagems-backup') && f.endsWith('.json'));
    
    // Sort chronologically (oldest to newest based on YYYY-MM in filename)
    backupFiles.sort();

    // If we have more than 6, delete the oldest
    if (backupFiles.length > 6) {
      const excessFiles = backupFiles.slice(0, backupFiles.length - 6);
      for (const oldFile of excessFiles) {
        await FileSystem.deleteAsync(`${backupDir}${oldFile}`, { idempotent: true });
      }
    }

  } catch (err) {
    console.error('[AutoBackupPolicy] Failed to run enforcement:', err);
  }
}

export function useBackup() {
  const [isExporting, setIsExporting] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);

  const loadDate = useCallback(() => {
    AsyncStorage.getItem(LAST_BACKUP_KEY).then((date) => {
      if (date) setLastBackupDate(date);
    });
  }, []);

  useEffect(() => {
    loadDate();
  }, [loadDate]);

  const createBackup = useCallback(async () => {
    try {
      setIsExporting(true);
      const uri = await generateBackupFile();
      // Reload date from storage locally so UI updates instantly
      loadDate();
      return uri;
    } finally {
      setIsExporting(false);
    }
  }, [loadDate]);

  const restoreBackup = useCallback(async () => {
    try {
      setIsExporting(true); // Reusing the exporting state as a general loading flag

      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return false;

      const fileUri = result.assets[0].uri;
      const fileString = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const parsed = JSON.parse(fileString);

      // Validate signature
      if (!parsed.customers || !parsed.vehicles || !parsed.services || !parsed.serviceParts || !parsed.images) {
        throw new Error('Invalid backup file structure. Cannot restore.');
      }

      await importAllData(parsed);

      // Successfully replaced DB -> Clear all React Query in-memory caches!
      queryClient.clear();
      
      return true;

    } catch (err) {
      throw err;
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    isExporting,
    lastBackupDate,
    createBackup,
    restoreBackup,
  };
}
