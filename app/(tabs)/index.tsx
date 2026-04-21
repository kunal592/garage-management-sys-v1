import React, { useCallback, useMemo, memo } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { StatCard, RecentServiceItem, RecentServiceSkeleton, Breadcrumbs } from '@/components';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useDashboardStats, useRecentServices } from '@/hooks/useDashboard';
import { queryClient } from '@/components/providers/QueryProvider';
import { queryKeys } from '@/hooks/queryKeys';
import { formatCurrency } from '@/utils/formatters';

// Stable style — outside component, never reallocated
const SCROLL_CONTENT_STYLE = { paddingBottom: 100 };

export default function DashboardScreen() {
  const { setBreadcrumbs } = useBreadcrumbs();
  
  useFocusEffect(
    useCallback(() => {
      setBreadcrumbs([{ label: 'Dashboard', path: '/' }]);
    }, [setBreadcrumbs])
  );

  // Queries - React Query hooks
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useDashboardStats();
  const { data: recentServices, isLoading: servicesLoading, refetch: refetchServices } = useRecentServices(10);

  // Pull-to-refresh
  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.root });
    await Promise.all([refetchStats(), refetchServices()]);
    setRefreshing(false);
  }, [refetchStats, refetchServices]);

  // Stable press handler — no router yet, will be wired when nav is ready
  const handleServicePress = useCallback((_serviceId: number) => {}, []);

  // Memoize each KPI row — only re-renders when stats data changes
  const kpiRow1 = useMemo(() => (
    <View className="flex-row mb-4">
      <StatCard
        title="Today's Revenue"
        value={stats ? formatCurrency(stats.dailyRevenue) : ''}
        iconName="cash-outline"
        color="#10b981"
        isLoading={statsLoading}
      />
      <StatCard
        title="Jobs Today"
        value={stats?.dailyServiceCount ?? 0}
        iconName="build-outline"
        color="#f59e0b"
        isLoading={statsLoading}
      />
    </View>
  ), [stats, statsLoading]);

  const kpiRow2 = useMemo(() => (
    <View className="flex-row mb-8">
      <StatCard
        title="Total Vehicles"
        value={stats?.totalVehicles ?? 0}
        iconName="car-sport-outline"
        color="#3b82f6"
        isLoading={statsLoading}
      />
      <StatCard
        title="Pending Jobs"
        value={stats?.pendingServices ?? 0}
        iconName="time-outline"
        color="#ef4444"
        isLoading={statsLoading}
      />
    </View>
  ), [stats, statsLoading]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-950 px-4">
      {/* Header */}
      <View className="mb-2 mt-2">
        <Text className="text-3xl font-extrabold text-white tracking-tight">
          Garage OS
        </Text>
        <Text className="text-neutral-400 font-medium">
          Welcome back to the command center
        </Text>
      </View>
      <Breadcrumbs />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={SCROLL_CONTENT_STYLE}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
            colors={['#3b82f6']}
          />
        }
      >
        {kpiRow1}
        {kpiRow2}

        {/* Recent Activity List */}
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-white text-xl font-bold tracking-tight">
            Recent Activity
          </Text>
          <Text className="text-blue-500 font-semibold text-sm mr-2">See All</Text>
        </View>

        {servicesLoading ? (
          <View>
            <RecentServiceSkeleton />
            <RecentServiceSkeleton />
            <RecentServiceSkeleton />
            <RecentServiceSkeleton />
          </View>
        ) : recentServices && recentServices.length > 0 ? (
          recentServices.map((service) => (
            <RecentServiceItem
              key={service.id}
              item={service}
              onPress={handleServicePress}
            />
          ))
        ) : (
          <View className="py-8 items-center bg-neutral-900 border border-neutral-800 rounded-xl">
            <Ionicons name="folder-open-outline" size={40} color="#525252" />
            <Text className="text-neutral-400 mt-2 font-medium pb-2">
              No recent services found.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
