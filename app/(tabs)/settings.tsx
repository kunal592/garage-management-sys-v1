import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { Breadcrumbs } from '@/components';
import { useBackup } from '@/hooks/useBackup';
import { formatDate } from '@/utils/formatters';
import * as FileSystem from 'expo-file-system';

export default function SettingsTab() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const { isExporting, lastBackupDate, createBackup } = useBackup();

  useFocusEffect(
    useCallback(() => {
      setBreadcrumbs([
        { label: 'Dashboard', path: '/' },
        { label: 'Settings', path: '/settings' }
      ]);
    }, [setBreadcrumbs])
  );

  const handleExport = async () => {
    try {
      const uri = await createBackup();
      Alert.alert(
        'Backup Successful',
        `All data exported reliably.\n\nSaved to: \n${uri?.replace(FileSystem.documentDirectory || '', '[AppDocs]/')}`,
        [{ text: 'OK', style: 'default' }]
      );
    } catch (err) {
      console.error('Backup failure:', err);
      Alert.alert('Backup Failed', err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-950 px-4" edges={['top']}>
      <View className="mb-2 mt-2">
        <Text className="text-3xl font-extrabold text-white tracking-tight">Settings</Text>
        <Text className="text-neutral-400 font-medium">App configuration & data management</Text>
      </View>
      <Breadcrumbs />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Data Security Section */}
        <View className="mt-6 mb-6">
          <Text className="text-neutral-500 font-semibold uppercase tracking-wider mb-2 text-xs">
            Data Security
          </Text>
          
          <View className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 mb-4">
            <View className="flex-row items-center mb-4">
              <View className="bg-blue-500/20 w-10 h-10 rounded-full items-center justify-center mr-4">
                <Ionicons name="cloud-download-outline" size={20} color="#3b82f6" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-lg mb-0.5">Database Backup</Text>
                <Text className="text-neutral-400 text-sm">
                  {lastBackupDate ? `Last backup: ${formatDate(lastBackupDate)}` : 'No previous backups found.'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleExport}
              disabled={isExporting}
              className={`rounded-xl py-3.5 items-center flex-row justify-center border ${
                isExporting 
                  ? 'bg-neutral-800 border-neutral-700' 
                  : 'bg-neutral-800 border-neutral-700 active:bg-neutral-700'
              }`}
            >
              <Ionicons 
                name={isExporting ? 'sync' : 'save-outline'} 
                size={18} 
                color={isExporting ? '#9ca3af' : 'white'} 
              />
              <Text className={`font-bold ml-2 ${isExporting ? 'text-neutral-400' : 'text-white'}`}>
                {isExporting ? 'Exporting...' : 'Export Offline Data Structure'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Global Build Info */}
        <View className="flex-row justify-between items-center px-2 py-4 border-t border-neutral-800/50 mt-10 opacity-70">
           <Text className="text-neutral-500 font-medium">Garage OS Version</Text>
           <Text className="text-neutral-400 font-bold">1.0.0 (Local Build)</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
