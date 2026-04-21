import React, { useState, useCallback, useMemo, memo } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useServiceAlerts } from '@/hooks/useVehicles';
import { Skeleton, Breadcrumbs } from '@/components';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { formatDate } from '@/utils/formatters';
import type { UpcomingServiceAlert } from '@/data/repositories/vehicleRepo';

// ─── Pure helper — module-level, never recreated ──────────────────────────────
function getUrgencyStatus(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil(
    (new Date(dateStr).getTime() - today.getTime()) / 86_400_000,
  );
  if (diffDays <= 0) return { label: 'Today',    color: 'text-red-400',    bg: 'bg-red-500/20',    iconColor: '#f87171' };
  if (diffDays === 1) return { label: 'Tomorrow', color: 'text-amber-400',  bg: 'bg-amber-500/20',  iconColor: '#fbbf24' };
  return               { label: `In ${diffDays} days`, color: 'text-emerald-400', bg: 'bg-emerald-500/20', iconColor: '#34d399' };
}

// Stable keyExtractor outside component
function keyExtractor(item: UpcomingServiceAlert) {
  return item.vehicleId.toString();
}

// ─── Memoized alert row ───────────────────────────────────────────────────────
interface AlertRowProps {
  item: UpcomingServiceAlert;
  onCall: (phone: string) => void;
}
const AlertRow = memo(({ item, onCall }: AlertRowProps) => {
  const urgency = useMemo(() => getUrgencyStatus(item.nextServiceDate), [item.nextServiceDate]);
  const handleCall = useCallback(() => onCall(item.customerPhone), [onCall, item.customerPhone]);

  return (
    <View className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-3 flex-row items-center">
      <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${urgency.bg}`}>
        <Ionicons name="notifications" size={20} color={urgency.iconColor} />
      </View>

      <View className="flex-1">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-white font-bold text-base">{item.vehicleNumber}</Text>
          <View className={`px-2 py-0.5 rounded ${urgency.bg}`}>
            <Text className={`text-[10px] font-bold uppercase ${urgency.color}`}>
              {urgency.label}
            </Text>
          </View>
        </View>
        <Text className="text-neutral-400 text-sm">
          {item.make ? `${item.make} ${item.model ?? ''}` : 'Vehicle'}
        </Text>
        <Text className="text-neutral-500 text-xs mt-1">Due: {formatDate(item.nextServiceDate)}</Text>
      </View>

      <TouchableOpacity
        onPress={handleCall}
        className="ml-4 w-10 h-10 bg-neutral-800 rounded-full items-center justify-center"
      >
        <Ionicons name="call" size={18} color="#3b82f6" />
      </TouchableOpacity>
    </View>
  );
});

// ─── Skeleton rows (stable, no props → safe to define outside) ────────────────
const AlertSkeletonRow = memo(() => (
  <View className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-3 flex-row items-center">
    <Skeleton className="w-12 h-12 rounded-full mr-4" />
    <View className="flex-1">
      <Skeleton className="h-5 w-32 rounded mb-2" />
      <Skeleton className="h-4 w-24 rounded" />
    </View>
  </View>
));

const AlertsLoading = memo(() => (
  <View>
    <AlertSkeletonRow />
    <AlertSkeletonRow />
    <AlertSkeletonRow />
  </View>
));

const AlertsEmpty = memo(() => (
  <View className="py-12 items-center bg-neutral-900 border border-neutral-800 rounded-xl">
    <Ionicons name="checkmark-circle-outline" size={48} color="#10b981" />
    <Text className="text-neutral-400 mt-4 font-medium text-center px-4">
      You're all caught up! No vehicles are due for service in this timeframe.
    </Text>
  </View>
));

// Stable style
const LIST_CONTENT_STYLE = { paddingBottom: 100 };

// Filter options — stable array, module-level
const FILTER_OPTIONS = [
  { label: 'Next 24h',   value: 1 as const },
  { label: 'Next 48h',   value: 2 as const },
  { label: 'Next 7 Days', value: 7 as const },
];

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function AlertsTab() {
  const { setBreadcrumbs } = useBreadcrumbs();
  
  useFocusEffect(
    useCallback(() => {
      setBreadcrumbs([
        { label: 'Dashboard', path: '/' },
        { label: 'Alerts', path: '/alerts' }
      ]);
    }, [setBreadcrumbs])
  );

  const [daysAhead, setDaysAhead] = useState<1 | 2 | 7>(2);
  const { data: alerts, isLoading, refetch } = useServiceAlerts(daysAhead);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleCall = useCallback((phone: string) => {
    Linking.openURL(`tel:${phone}`);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: UpcomingServiceAlert }) => (
      <AlertRow item={item} onCall={handleCall} />
    ),
    [handleCall],
  );

  const ListEmpty = useMemo(
    () => (isLoading ? <AlertsLoading /> : <AlertsEmpty />),
    [isLoading],
  );

  return (
    <SafeAreaView className="flex-1 bg-neutral-950 px-4" edges={['top']}>
      <View className="mb-2 mt-2">
        <Text className="text-3xl font-extrabold text-white tracking-tight">Alerts</Text>
        <Text className="text-neutral-400 font-medium">Upcoming service reminders</Text>

        <View className="mt-4 -ml-4 -mr-4">
          <Breadcrumbs />
        </View>

        <View className="flex-row gap-2 mt-4">
          {FILTER_OPTIONS.map(f => (
            <TouchableOpacity
              key={f.value}
              onPress={() => setDaysAhead(f.value)}
              className={`px-4 py-1.5 rounded-full border ${
                daysAhead === f.value
                  ? 'bg-red-600/20 border-red-500'
                  : 'bg-neutral-900 border-neutral-700'
              }`}
            >
              <Text className={`font-semibold text-sm ${daysAhead === f.value ? 'text-red-400' : 'text-neutral-400'}`}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={alerts}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListEmptyComponent={ListEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={LIST_CONTENT_STYLE}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ef4444" />
        }
      />
    </SafeAreaView>
  );
}
