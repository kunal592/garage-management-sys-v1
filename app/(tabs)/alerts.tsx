import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useServiceAlerts } from '@/hooks/useVehicles';
import { Skeleton } from '@/components';
import { formatDate } from '@/utils/formatters';
import { UpcomingServiceAlert } from '@/data/repositories/vehicleRepo';

// Helper to determine the status color based on urgency
function getUrgencyStatus(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dateStr);
  
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return { label: 'Today', color: 'text-red-400', bg: 'bg-red-500/20' };
  if (diffDays === 1) return { label: 'Tomorrow', color: 'text-amber-400', bg: 'bg-amber-500/20' };
  return { label: `In ${diffDays} days`, color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
}

export default function AlertsTab() {
  // Configurable days ahead
  const [daysAhead, setDaysAhead] = useState<1 | 2 | 7>(2);
  const { data: alerts, isLoading, refetch } = useServiceAlerts(daysAhead);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleCallCustomer = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const renderAlertItem = ({ item }: { item: UpcomingServiceAlert }) => {
    const urgency = getUrgencyStatus(item.nextServiceDate);

    return (
      <View className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-3 flex-row items-center">
        <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${urgency.bg}`}>
          <Ionicons name="notifications" size={20} color={urgency.color === 'text-red-400' ? '#f87171' : urgency.color === 'text-amber-400' ? '#fbbf24' : '#34d399'} />
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
          <Text className="text-neutral-500 text-xs mt-1">
            Due: {formatDate(item.nextServiceDate)}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => handleCallCustomer(item.customerPhone)}
          className="ml-4 w-10 h-10 bg-neutral-800 rounded-full items-center justify-center"
        >
          <Ionicons name="call" size={18} color="#3b82f6" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-950 px-4" edges={['top']}>
      {/* Header */}
      <View className="mb-6 mt-2">
        <Text className="text-3xl font-extrabold text-white tracking-tight">Alerts</Text>
        <Text className="text-neutral-400 font-medium">Upcoming service reminders</Text>

        {/* Filters */}
        <View className="flex-row gap-2 mt-4">
          {[
            { label: 'Next 24h', value: 1 },
            { label: 'Next 48h', value: 2 },
            { label: 'Next 7 Days', value: 7 },
          ].map((filter) => {
            const isActive = daysAhead === filter.value;
            return (
              <TouchableOpacity
                key={filter.value}
                onPress={() => setDaysAhead(filter.value as any)}
                className={`px-4 py-1.5 rounded-full border ${
                  isActive ? 'bg-red-600/20 border-red-500' : 'bg-neutral-900 border-neutral-700'
                }`}
              >
                <Text className={`font-semibold text-sm ${isActive ? 'text-red-400' : 'text-neutral-400'}`}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={alerts}
        keyExtractor={(item) => item.vehicleId.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ef4444" />}
        ListEmptyComponent={
          isLoading ? (
            <View>
              <View className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-3 flex-row items-center">
                <Skeleton className="w-12 h-12 rounded-full mr-4" />
                <View className="flex-1">
                  <Skeleton className="h-5 w-32 rounded mb-2" />
                  <Skeleton className="h-4 w-24 rounded" />
                </View>
              </View>
              <View className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-3 flex-row items-center">
                <Skeleton className="w-12 h-12 rounded-full mr-4" />
                <View className="flex-1">
                  <Skeleton className="h-5 w-24 rounded mb-2" />
                  <Skeleton className="h-4 w-16 rounded" />
                </View>
              </View>
            </View>
          ) : (
            <View className="py-12 items-center bg-neutral-900 border border-neutral-800 rounded-xl">
              <Ionicons name="checkmark-circle-outline" size={48} color="#10b981" />
              <Text className="text-neutral-400 mt-4 font-medium text-center px-4">
                You're all caught up! No vehicles are due for service in this timeframe.
              </Text>
            </View>
          )
        }
        renderItem={renderAlertItem}
      />
    </SafeAreaView>
  );
}
