import '../global.css';

import { Stack, Slot, ErrorBoundaryProps, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { SplashScreen } from '@/components';
import { BreadcrumbProvider } from '@/hooks/useBreadcrumbs';
import { initDatabase } from '@/data/db/sqlite';
import { runAutoBackupPolicy } from '@/hooks/useBackup';
import { cleanupExpiredImages } from '@/data/repositories/imageRepo';

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaView className="flex-1 bg-neutral-950 items-center justify-center p-6">
      <View className="bg-red-500/20 w-24 h-24 rounded-full items-center justify-center mb-6">
        <Ionicons name="warning-outline" size={48} color="#ef4444" />
      </View>
      <Text className="text-white text-3xl font-extrabold text-center tracking-tight mb-2">
        System Error
      </Text>
      <Text className="text-neutral-400 text-center mb-8 px-4 leading-relaxed">
        {error.message || 'An unexpected error occurred in the Garage OS. Please try restarting.'}
      </Text>
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={retry}
        className="bg-blue-600 px-8 py-4 rounded-xl flex-row items-center justify-center w-full shadow-lg shadow-blue-900/50"
      >
        <Ionicons name="refresh" size={20} color="white" />
        <Text className="text-white font-bold ml-2 text-lg">Reload Application</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<Error | null>(null);

  useEffect(() => {
    initDatabase()
      .then(async () => {
        setDbReady(true);
        // Once DB is structurally mapped, execute background cleanup & backup arrays
        await Promise.allSettled([
          cleanupExpiredImages(),
          runAutoBackupPolicy()
        ]);
      })
      .catch((err) => {
        console.error('[DB] Failed to initialize database:', err);
        setDbError(err instanceof Error ? err : new Error(String(err)));
      });
  }, []);

  if (dbError) {
    return <ErrorBoundary error={dbError} retry={async () => setDbError(null)} />;
  }

  // Block rendering until DB is ready — prevents any repository call
  // from running against an uninitialised schema.
  if (!dbReady) {
    return <SplashScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryProvider>
        <BreadcrumbProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
        </BreadcrumbProvider>
      </QueryProvider>
    </GestureHandlerRootView>
  );
}
