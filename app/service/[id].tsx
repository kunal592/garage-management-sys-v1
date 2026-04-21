import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useServiceDetail, useMarkServicePerformed, useDeleteService } from '@/hooks/useServices';
import { Skeleton } from '@/components';
import { formatCurrency, formatDate } from '@/utils/formatters';

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const serviceId = Number(id);

  const { data: service, isLoading } = useServiceDetail(serviceId);
  const markPerformedMutation = useMarkServicePerformed();
  const deleteServiceMutation = useDeleteService();

  const handleMarkPerformed = () => {
    Alert.alert(
      'Confirm Completion',
      'Are you sure you want to mark this service as performed? This will finalize the totals.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          style: 'default',
          onPress: () => markPerformedMutation.mutate(serviceId)
        }
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Service',
      'This will permanently delete this service and all associated part records. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            deleteServiceMutation.mutate(serviceId, {
              onSuccess: () => router.back()
            });
          }
        }
      ]
    );
  };

  if (isLoading || !service) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-950 p-4">
        <Skeleton className="h-10 w-10 rounded-full mb-6" />
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-32 mb-8" />
        <Skeleton className="h-32 w-full rounded-2xl mb-4" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </SafeAreaView>
    );
  }

  const isPerformed = service.status === 'Performed';

  return (
    <SafeAreaView className="flex-1 bg-neutral-950 px-4">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-6 mt-2">
        <TouchableOpacity 
          className="w-10 h-10 rounded-full bg-neutral-900 items-center justify-center border border-neutral-800"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>

        <TouchableOpacity 
          className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 items-center justify-center"
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Title Block */}
        <View className="mb-8">
          <View className="flex-row items-center mb-2">
            <Text className="text-3xl font-extrabold text-white tracking-tight mr-3">
              {service.vehicleNumber}
            </Text>
            <View className={`px-2 py-1 rounded bg-${isPerformed ? 'emerald-500/20' : 'amber-500/20'}`}>
              <Text className={`text-xs font-bold uppercase tracking-wider text-${isPerformed ? 'emerald-400' : 'amber-400'}`}>
                {service.status}
              </Text>
            </View>
          </View>
          <Text className="text-neutral-400 text-lg">
            {service.make} {service.model} • {formatDate(service.createdAt)}
          </Text>
        </View>

        {/* Customer Info Card */}
        <View className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 mb-6">
          <View className="flex-row items-center mb-3 opacity-80">
            <Ionicons name="person" size={16} color="#9ca3af" />
            <Text className="text-neutral-400 text-xs font-semibold ml-2 uppercase tracking-wider">
              Customer Details
            </Text>
          </View>
          <Text className="text-white font-bold text-lg">{service.customerName}</Text>
          <Text className="text-blue-400 mt-1">{service.customerPhone}</Text>
        </View>

        {/* Notes */}
        {service.notes && (
          <View className="mb-6">
             <Text className="text-neutral-500 font-semibold uppercase tracking-wider mb-2 text-xs">Notes</Text>
             <Text className="text-neutral-300 leading-relaxed bg-neutral-900/50 p-4 rounded-xl border border-neutral-800/50">
               {service.notes}
             </Text>
          </View>
        )}

        {/* Parts List */}
        <View className="mb-6">
          <Text className="text-neutral-500 font-semibold uppercase tracking-wider mb-2 text-xs">
            Service Parts & Labor
          </Text>
          
          <View className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
            {service.parts.length === 0 ? (
               <View className="p-6 items-center">
                 <Text className="text-neutral-500 italic">No parts recorded.</Text>
               </View>
            ) : (
              service.parts.map((p, index) => (
                <View 
                  key={p.id} 
                  className={`flex-row justify-between items-center p-4 ${index !== service.parts.length - 1 ? 'border-b border-neutral-800' : ''}`}
                >
                  <View className="flex-1">
                    <Text className="text-white font-semibold">{p.name}</Text>
                    <Text className="text-neutral-500 text-sm mt-0.5">{p.quantity}x @ {formatCurrency(p.priceAtTime)}</Text>
                  </View>
                  <Text className="text-white font-bold tracking-tight">
                    {formatCurrency(p.quantity * p.priceAtTime)}
                  </Text>
                </View>
              ))
            )}
            
            {/* Total Block */}
            <View className="bg-neutral-800/50 p-4 border-t border-neutral-800 flex-row justify-between items-center">
              <Text className="text-neutral-300 font-bold tracking-wider uppercase">Total Cost</Text>
              <Text className="text-blue-400 font-extrabold text-xl">{formatCurrency(service.totalCost)}</Text>
            </View>
          </View>
        </View>

        {/* Action Button */}
        {!isPerformed && (
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={handleMarkPerformed}
            disabled={markPerformedMutation.isPending}
            className={`rounded-2xl py-4 items-center shadow-lg shadow-emerald-900/20 mt-4 ${
              markPerformedMutation.isPending ? 'bg-emerald-800' : 'bg-emerald-600'
            }`}
          >
            <Text className="text-white font-bold text-lg tracking-wide uppercase">
              {markPerformedMutation.isPending ? 'Processing...' : 'Mark as Performed'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
