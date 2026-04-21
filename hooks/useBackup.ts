import { useState, useCallback, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { exportAllData } from '@/data/repositories/dashboardRepo';

const LAST_BACKUP_KEY = '@last_backup_date';

export function useBackup() {
  const [isExporting, setIsExporting] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(LAST_BACKUP_KEY).then((date) => {
      if (date) setLastBackupDate(date);
    });
  }, []);

  const createBackup = useCallback(async () => {
    try {
      setIsExporting(true);

      // 1. Ensure backup directory exists
      if (!FileSystem.documentDirectory) {
        throw new Error('File system access not available on this device.');
      }
      const backupDir = `${FileSystem.documentDirectory}backups/`;
      const dirInfo = await FileSystem.getInfoAsync(backupDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });
      }

      // 2. Format name: garagems-backup-YYYY-MM.json
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const fileName = `garagems-backup-${year}-${month}.json`;
      const fileUri = `${backupDir}${fileName}`;

      // 3. Export all data to JSON
      const dbData = await exportAllData();
      const jsonString = JSON.stringify(dbData, null, 2);

      // 4. Save to filesystem
      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // 5. Store last backup date
      const timestamp = now.toISOString();
      await AsyncStorage.setItem(LAST_BACKUP_KEY, timestamp);
      setLastBackupDate(timestamp);

      // (Optional) Tell consumer the exact file location
      return fileUri;
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    isExporting,
    lastBackupDate,
    createBackup,
  };
}
