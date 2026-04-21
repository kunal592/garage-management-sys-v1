import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Skeleton } from '../ui/Skeleton';

interface StatCardProps {
  title: string;
  value: string | number;
  iconName: keyof typeof Ionicons.glyphMap;
  color?: string;
  isLoading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = React.memo(
  ({ title, value, iconName, color = '#3b82f6', isLoading = false }) => {
    return (
      <View className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mr-3 last:mr-0 min-w-[140px]">
        <View className="flex-row items-center mb-3 opacity-80">
          <Ionicons name={iconName} size={18} color={color} />
          <Text className="text-neutral-400 text-xs font-semibold ml-2 uppercase tracking-wider">
            {title}
          </Text>
        </View>

        {isLoading ? (
          <Skeleton className="h-8 w-20 rounded" />
        ) : (
          <Text className="text-white text-2xl font-bold tracking-tight">
            {value}
          </Text>
        )}
      </View>
    );
  }
);
