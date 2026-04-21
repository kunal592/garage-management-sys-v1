import React, { useCallback, memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ServiceListItemSkeleton } from '../ui/Skeleton';
import type { RecentServiceRow } from '@/data/repositories/dashboardRepo';
import { formatCurrency } from '@/utils/formatters';

interface RecentServiceItemProps {
  item: RecentServiceRow;
  onPress: (id: number) => void;
}

export const RecentServiceItem = memo(({ item, onPress }: RecentServiceItemProps) => {
  const isPerformed = item.status === 'Performed';
  // Stable per-item callback — avoids creating a new lambda on every FlatList render
  const handlePress = useCallback(() => onPress(item.id), [onPress, item.id]);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-3 flex-row items-center"
    >
      <View className="w-12 h-12 rounded-full bg-neutral-800 items-center justify-center mr-4">
        <Ionicons name="car-sport" size={20} color={isPerformed ? '#10b981' : '#f59e0b'} />
      </View>

      <View className="flex-1">
        <Text className="text-white font-bold text-base">{item.vehicleNumber}</Text>
        <Text className="text-neutral-400 text-sm mt-0.5">{item.customerName}</Text>
      </View>

      <View className="items-end">
        <Text className="text-white font-semibold mb-1">{formatCurrency(item.totalCost)}</Text>
        <View className={`px-2 py-0.5 rounded ${isPerformed ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
          <Text className={`text-[10px] font-bold uppercase ${isPerformed ? 'text-emerald-400' : 'text-amber-400'}`}>
            {item.status}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// Re-export the skeleton variant from the central system so existing import sites don't break
export { ServiceListItemSkeleton as RecentServiceSkeleton };
