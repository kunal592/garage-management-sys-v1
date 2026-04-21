import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';

export const Breadcrumbs = () => {
  const { breadcrumbs } = useBreadcrumbs();
  const router = useRouter();

  if (!breadcrumbs || breadcrumbs.length === 0) return null;

  return (
    <View className="flex-row items-center flex-wrap px-4 pt-2 pb-4">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;

        return (
          <View key={`${crumb.label}-${index}`} className="flex-row items-center">
            {index > 0 && (
              <Ionicons name="chevron-forward" size={14} color="#6b7280" className="mx-1" />
            )}
            <TouchableOpacity 
              disabled={isLast || !crumb.path} 
              onPress={() => {
                if (crumb.path) {
                  router.push(crumb.path as any);
                }
              }}
            >
              <Text className={`font-medium ${isLast ? 'text-white' : 'text-neutral-500'}`}>
                {crumb.label}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
};
