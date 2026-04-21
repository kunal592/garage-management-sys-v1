import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useServices } from '@/hooks/useServices';
import { RecentServiceSkeleton, RecentServiceItem } from '@/components';
import { queryClient } from '@/components/providers/QueryProvider';
import { queryKeys } from '@/hooks/queryKeys';

const LIMIT = 15;

export default function ServicesTab() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Performed'>('All');

  const { data: services, isLoading, isFetching, refetch } = useServices(
    page, 
    LIMIT, 
    statusFilter === 'All' ? undefined : statusFilter
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: queryKeys.services.root });
    setPage(0); // Reset to first page
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleNextPage = () => {
    if (services && services.length === LIMIT) {
      setPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 0) {
      setPage((prev) => prev - 1);
    }
  };

  const renderHeader = () => (
    <View className="mb-6 mt-2">
      <View className="flex-row justify-between items-center mb-4">
        <View>
          <Text className="text-3xl font-extrabold text-white tracking-tight">Services</Text>
          <Text className="text-neutral-400 font-medium">Manage all repairs & services</Text>
        </View>
        <TouchableOpacity 
          className="bg-blue-600 w-10 h-10 rounded-full items-center justify-center shadow-lg shadow-blue-900"
          onPress={() => router.push('/service/new')}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View className="flex-row gap-2">
        {['All', 'Pending', 'Performed'].map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => { setStatusFilter(f as any); setPage(0); }}
            className={`px-4 py-1.5 rounded-full border ${
              statusFilter === f ? 'bg-blue-600/20 border-blue-500' : 'bg-neutral-900 border-neutral-700'
            }`}
          >
            <Text className={`font-semibold ${statusFilter === f ? 'text-blue-400' : 'text-neutral-400'}`}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-neutral-950 px-4" edges={['top']}>
      <FlatList
        data={services}
        ListHeaderComponent={renderHeader}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
        ListEmptyComponent={
          isLoading ? (
            <View>
              <RecentServiceSkeleton />
              <RecentServiceSkeleton />
              <RecentServiceSkeleton />
              <RecentServiceSkeleton />
            </View>
          ) : (
            <View className="py-12 items-center bg-neutral-900 border border-neutral-800 rounded-xl">
              <Ionicons name="document-text-outline" size={48} color="#525252" />
              <Text className="text-neutral-400 mt-4 font-medium">No services found in this category.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <RecentServiceItem
            item={item as any} // Cast safely since ServiceDetail matches RecentServiceRow shape roughly
            onPress={(id) => router.push(`/service/${id}`)}
          />
        )}
        ListFooterComponent={
          services && services.length > 0 ? (
            <View className="flex-row items-center justify-between mt-6 bg-neutral-900 p-2 rounded-xl border border-neutral-800">
              <TouchableOpacity 
                disabled={page === 0} 
                onPress={handlePrevPage}
                className={`p-2 rounded-lg ${page === 0 ? 'opacity-30' : 'bg-neutral-800'}`}
              >
                <Ionicons name="chevron-back" size={24} color="white" />
              </TouchableOpacity>
              
              <Text className="text-neutral-400 font-semibold">Page {page + 1}</Text>
              
              <TouchableOpacity 
                disabled={services.length < LIMIT} 
                onPress={handleNextPage}
                className={`p-2 rounded-lg ${services.length < LIMIT ? 'opacity-30' : 'bg-neutral-800'}`}
              >
                <Ionicons name="chevron-forward" size={24} color="white" />
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
