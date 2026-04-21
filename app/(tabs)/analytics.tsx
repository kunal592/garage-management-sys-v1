import React, { useCallback, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAnalytics } from '@/hooks/useDashboard';
import { Skeleton } from '@/components';
import { queryClient } from '@/components/providers/QueryProvider';
import { queryKeys } from '@/hooks/queryKeys';
import { formatCurrency } from '@/utils/formatters';

export default function AnalyticsTab() {
  const { revenue, parts, customers, isLoading, isError } = useAnalytics(6, 5);

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.root });
    // Refetch logic is tied to individual query hooks, invalidation triggers them automatically
    await Promise.all([revenue.refetch(), parts.refetch(), customers.refetch()]);
    setRefreshing(false);
  }, [revenue, parts, customers]);

  // Max calculations for simple bar charts using percentages
  const maxRevenueLine = useMemo(() => {
    if (!revenue.data || revenue.data.length === 0) return 1;
    return Math.max(...revenue.data.map(d => d.revenue));
  }, [revenue.data]);

  const maxPartUsage = useMemo(() => {
    if (!parts.data || parts.data.length === 0) return 1;
    return Math.max(...parts.data.map(p => p.usageCount));
  }, [parts.data]);

  const maxCustomerSpend = useMemo(() => {
    if (!customers.data || customers.data.length === 0) return 1;
    return Math.max(...customers.data.map(c => c.totalSpend));
  }, [customers.data]);

  const renderSkeletons = () => (
    <View className="mb-6">
      <Skeleton className="h-48 w-full rounded-2xl mb-6" />
      <Skeleton className="h-32 w-full rounded-2xl mb-6" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-neutral-950 px-4" edges={['top']}>
      {/* Header */}
      <View className="mb-6 mt-2">
        <Text className="text-3xl font-extrabold text-white tracking-tight">Analytics</Text>
        <Text className="text-neutral-400 font-medium">Business insights and performance</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
      >
        {isLoading ? (
          renderSkeletons()
        ) : isError ? (
          <View className="py-12 items-center bg-neutral-900 border border-neutral-800 rounded-xl">
            <Ionicons name="warning-outline" size={48} color="#ef4444" />
            <Text className="text-neutral-400 mt-4 px-6 text-center font-medium">
              Failed to load analytics data. Pull down to refresh.
            </Text>
          </View>
        ) : (
          <>
            {/* Monthly Revenue (Bar Chart equivalent) */}
            <View className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 mb-6">
              <View className="flex-row items-center mb-4">
                <Ionicons name="bar-chart-outline" size={20} color="#3b82f6" />
                <Text className="text-white font-bold ml-2 text-lg">Monthly Revenue</Text>
              </View>
              
              {revenue.data && revenue.data.length > 0 ? (
                <View className="flex-row justify-between items-end h-40 pt-4 border-b border-neutral-800">
                  {revenue.data.map((item, idx) => {
                    // Height percentage calculation
                    const heightPercent = Math.max((item.revenue / maxRevenueLine) * 100, 5); // 5% minimum
                    return (
                      <View key={idx} className="items-center flex-1">
                        {/* Tooltip emulation using text above the bar */}
                        <Text className="text-neutral-400 text-[10px] mb-1 opacity-70 transform -rotate-45 mb-4">
                          {formatCurrency(item.revenue)}
                        </Text>
                        
                        <View className="w-8 bg-blue-500 rounded-t-sm" style={{ height: `${heightPercent}%` }} />
                        
                        <Text className="text-neutral-500 text-[10px] mt-2 font-bold uppercase">
                          {/* Parse YYYY-MM into just MM or Mon */}
                          {new Date(item.month).toLocaleString('en-US', { month: 'short' })}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View className="py-8 items-center">
                  <Text className="text-neutral-500 italic">Not enough historical data.</Text>
                </View>
              )}
            </View>

            {/* Top Services (Horizontal progress bars) */}
            <View className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 mb-6">
              <View className="flex-row items-center mb-4">
                <Ionicons name="construct-outline" size={20} color="#f59e0b" />
                <Text className="text-white font-bold ml-2 text-lg">Top Services Performed</Text>
              </View>
              
              {parts.data && parts.data.length > 0 ? (
                parts.data.map((part, idx) => {
                  const widthPercent = Math.max((part.usageCount / maxPartUsage) * 100, 5);
                  return (
                    <View key={idx} className="mb-4 last:mb-0">
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-white font-medium text-sm">{part.name}</Text>
                        <Text className="text-amber-500 font-bold text-xs">{part.usageCount}x</Text>
                      </View>
                      <View className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden flex-row">
                        <View className="h-full bg-amber-500 rounded-full" style={{ width: `${widthPercent}%` }} />
                      </View>
                      <Text className="text-neutral-500 text-[10px] mt-1 text-right">
                        Yielded {formatCurrency(part.totalRevenue)}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <View className="py-8 items-center">
                  <Text className="text-neutral-500 italic">No parts recorded yet.</Text>
                </View>
              )}
            </View>

            {/* Top Customers (Leaderboard) */}
            <View className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 mb-6">
              <View className="flex-row items-center mb-4">
                <Ionicons name="star-outline" size={20} color="#10b981" />
                <Text className="text-white font-bold ml-2 text-lg">Top Customers</Text>
              </View>
              
              {customers.data && customers.data.length > 0 ? (
                customers.data.map((customer, idx) => {
                  const widthPercent = Math.max((customer.totalSpend / maxCustomerSpend) * 100, 5);
                  return (
                    <View key={customer.customerId} className="mb-4 last:mb-0">
                      <View className="flex-row justify-between mb-1">
                        <View className="flex-row items-center">
                          <Text className="text-neutral-600 font-bold mr-2 text-xs">#{idx + 1}</Text>
                          <Text className="text-white font-medium text-sm">{customer.customerName}</Text>
                        </View>
                        <Text className="text-emerald-400 font-bold text-xs">{formatCurrency(customer.totalSpend)}</Text>
                      </View>
                      <View className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden flex-row mt-1 mb-1">
                        <View className="h-full bg-emerald-500 rounded-full" style={{ width: `${widthPercent}%` }} />
                      </View>
                      <Text className="text-neutral-500 text-[10px]">
                        Over {customer.serviceCount} service{customer.serviceCount === 1 ? '' : 's'}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <View className="py-8 items-center">
                  <Text className="text-neutral-500 italic">No customers found.</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
