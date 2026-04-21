import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Skeleton } from '../ui/Skeleton';
import { RecentServiceRow } from '@/data/repositories/dashboardRepo';
import { formatCurrency } from '@/utils/formatters';

interface RecentServiceItemProps {
  item: RecentServiceRow;
  onPress: (id: number) => void;
}

export const RecentServiceItem: React.FC<RecentServiceItemProps> = React.memo(({ item, onPress }) => {
  const isPerformed = item.status === 'Performed';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(item.id)}
      className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-3 flex-row items-center"
    >
      <View className="w-12 h-12 rounded-full bg-neutral-800 items-center justify-center mr-4">
        <Ionicons name="car-sport" size={20} color={isPerformed ? '#10b981' : '#f59e0b'} />
      </View>
      
      <View className="flex-1">
        <Text className="text-white font-bold text-base">{item.vehicleNumber}</Text>
        <Text className="text-neutral-400 text-sm mt-0.5">
          {item.customerName}
        </Text>
      </View>

      <View className="items-end">
        <Text className="text-white font-semibold mb-1">
          {formatCurrency(item.totalCost)}
        </Text>
        <View className={`px-2 py-0.5 rounded ${isPerformed ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
          <Text className={`text-[10px] font-bold uppercase ${isPerformed ? 'text-emerald-400' : 'text-amber-400'}`}>
            {item.status}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export const RecentServiceSkeleton = React.memo(() => (
  <View className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-3 flex-row items-center">
    <Skeleton className="w-12 h-12 rounded-full mr-4" />
    <View className="flex-1">
      <Skeleton className="h-5 w-32 rounded mb-2" />
      <Skeleton className="h-4 w-24 rounded" />
    </View>
    <View className="items-end">
      <Skeleton className="h-5 w-16 rounded mb-2" />
      <Skeleton className="h-4 w-12 rounded" />
    </View>
  </View>
));
