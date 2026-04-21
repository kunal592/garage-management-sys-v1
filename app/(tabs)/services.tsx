import React, { useState, useCallback, useMemo, memo } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useServices } from '@/hooks/useServices';
import { RecentServiceSkeleton, RecentServiceItem, Breadcrumbs } from '@/components';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { queryClient } from '@/components/providers/QueryProvider';
import { queryKeys } from '@/hooks/queryKeys';
import type { ServiceStatus } from '@/data/repositories/serviceRepo';

const LIMIT = 15;

// Stable style object — defined outside component so it's never recreated
const LIST_CONTENT_STYLE = { paddingBottom: 100 };

// ─── Filter pill (stable memoized child) ─────────────────────────────────────
interface FilterPillProps {
  label: string;
  active: boolean;
  onPress: () => void;
}
const FilterPill = memo(({ label, active, onPress }: FilterPillProps) => (
  <TouchableOpacity
    key={label}
    onPress={onPress}
    className={`px-4 py-1.5 rounded-full border ${
      active ? 'bg-blue-600/20 border-blue-500' : 'bg-neutral-900 border-neutral-700'
    }`}
  >
    <Text className={`font-semibold ${active ? 'text-blue-400' : 'text-neutral-400'}`}>
      {label}
    </Text>
  </TouchableOpacity>
));

// ─── List header (stable memoized component, receives callbacks by ref) ───────
interface ServicesHeaderProps {
  statusFilter: 'All' | 'Pending' | 'Performed';
  onFilterAll: () => void;
  onFilterPending: () => void;
  onFilterPerformed: () => void;
  onAddPress: () => void;
}
const ServicesHeader = memo(({
  statusFilter,
  onFilterAll,
  onFilterPending,
  onFilterPerformed,
  onAddPress,
}: ServicesHeaderProps) => (
  <View className="mb-2 mt-2">
    <View className="flex-row justify-between items-center mb-4">
      <View>
        <Text className="text-3xl font-extrabold text-white tracking-tight">Services</Text>
        <Text className="text-neutral-400 font-medium">Manage all repairs &amp; services</Text>
      </View>
      <TouchableOpacity
        className="bg-blue-600 w-10 h-10 rounded-full items-center justify-center shadow-lg shadow-blue-900"
        onPress={onAddPress}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
    </View>

    <View className="flex-row gap-2">
      <FilterPill label="All"       active={statusFilter === 'All'}       onPress={onFilterAll} />
      <FilterPill label="Pending"   active={statusFilter === 'Pending'}   onPress={onFilterPending} />
      <FilterPill label="Performed" active={statusFilter === 'Performed'} onPress={onFilterPerformed} />
    </View>
    <View className="mt-4 -ml-4 -mr-4">
      <Breadcrumbs />
    </View>
  </View>
));

// ─── Empty state (stable) ─────────────────────────────────────────────────────
const EmptyLoading = memo(() => (
  <View>
    <RecentServiceSkeleton />
    <RecentServiceSkeleton />
    <RecentServiceSkeleton />
    <RecentServiceSkeleton />
  </View>
));

const EmptyNoData = memo(() => (
  <View className="py-12 items-center bg-neutral-900 border border-neutral-800 rounded-xl">
    <Ionicons name="document-text-outline" size={48} color="#525252" />
    <Text className="text-neutral-400 mt-4 font-medium">No services found in this category.</Text>
  </View>
));

// ─── Pagination footer (stable memoized component) ────────────────────────────
interface PaginationFooterProps {
  page: number;
  hasMore: boolean;
  onPrev: () => void;
  onNext: () => void;
}
const PaginationFooter = memo(({ page, hasMore, onPrev, onNext }: PaginationFooterProps) => (
  <View className="flex-row items-center justify-between mt-6 bg-neutral-900 p-2 rounded-xl border border-neutral-800">
    <TouchableOpacity
      disabled={page === 0}
      onPress={onPrev}
      className={`p-2 rounded-lg ${page === 0 ? 'opacity-30' : 'bg-neutral-800'}`}
    >
      <Ionicons name="chevron-back" size={24} color="white" />
    </TouchableOpacity>
    <Text className="text-neutral-400 font-semibold">Page {page + 1}</Text>
    <TouchableOpacity
      disabled={!hasMore}
      onPress={onNext}
      className={`p-2 rounded-lg ${!hasMore ? 'opacity-30' : 'bg-neutral-800'}`}
    >
      <Ionicons name="chevron-forward" size={24} color="white" />
    </TouchableOpacity>
  </View>
));

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ServicesTab() {
  const { setBreadcrumbs } = useBreadcrumbs();
  
  useFocusEffect(
    useCallback(() => {
      setBreadcrumbs([
        { label: 'Dashboard', path: '/' },
        { label: 'Services', path: '/services' }
      ]);
    }, [setBreadcrumbs])
  );

  const router = useRouter();
  const [page, setPage]               = useState(0);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Performed'>('All');

  const queryStatus = useMemo<ServiceStatus | undefined>(
    () => (statusFilter === 'All' ? undefined : statusFilter),
    [statusFilter],
  );

  const { data: services, isLoading, refetch } = useServices(page, LIMIT, queryStatus);

  const hasMore = useMemo(() => (services?.length ?? 0) === LIMIT, [services]);

  // ─── Stable callbacks ──────────────────────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: queryKeys.services.root });
    setPage(0);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleNextPage    = useCallback(() => setPage(p => p + 1), []);
  const handlePrevPage    = useCallback(() => setPage(p => Math.max(0, p - 1)), []);
  const handleAddPress    = useCallback(() => router.push('/service/new'), [router]);
  const handleFilterAll   = useCallback(() => { setStatusFilter('All');       setPage(0); }, []);
  const handleFilterPending   = useCallback(() => { setStatusFilter('Pending');   setPage(0); }, []);
  const handleFilterPerformed = useCallback(() => { setStatusFilter('Performed'); setPage(0); }, []);

  const handleServicePress = useCallback(
    (id: number) => router.push(`/service/${id}`),
    [router],
  );

  // ─── Stable renderItem ─────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: any) => (
      <RecentServiceItem item={item} onPress={handleServicePress} />
    ),
    [handleServicePress],
  );

  // ─── Stable list sub-components ────────────────────────────────────────────
  const ListHeader = useMemo(() => (
    <ServicesHeader
      statusFilter={statusFilter}
      onFilterAll={handleFilterAll}
      onFilterPending={handleFilterPending}
      onFilterPerformed={handleFilterPerformed}
      onAddPress={handleAddPress}
    />
  ), [statusFilter, handleFilterAll, handleFilterPending, handleFilterPerformed, handleAddPress]);

  const ListEmpty = useMemo(
    () => (isLoading ? <EmptyLoading /> : <EmptyNoData />),
    [isLoading],
  );

  const ListFooter = useMemo(
    () => services && services.length > 0
      ? <PaginationFooter page={page} hasMore={hasMore} onPrev={handlePrevPage} onNext={handleNextPage} />
      : null,
    [services, page, hasMore, handlePrevPage, handleNextPage],
  );

  return (
    <SafeAreaView className="flex-1 bg-neutral-950 px-4" edges={['top']}>
      <FlatList
        data={services}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={LIST_CONTENT_STYLE}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
        updateCellsBatchingPeriod={50}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
      />
    </SafeAreaView>
  );
}

// Stable keyExtractor — defined outside component
function keyExtractor(item: { id: number }) {
  return item.id.toString();
}
