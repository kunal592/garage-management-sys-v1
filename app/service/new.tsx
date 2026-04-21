import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCreateService } from '@/hooks/useServices';
import { useVehicles } from '@/hooks/useVehicles'; // Assuming useVehicles pulls the flattened list
import { CreateServicePartInput } from '@/data/repositories/serviceRepo';

export default function NewServiceScreen() {
  const router = useRouter();
  const createServiceMutation = useCreateService();
  const { data: vehicles } = useVehicles();

  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  
  // Local parts state
  const [parts, setParts] = useState<CreateServicePartInput[]>([]);
  const [draftPart, setDraftPart] = useState({ name: '', quantity: '1', priceString: '' });
  
  // Toggle for custom dropdown mock vs text input depending on complexity. 
  // We'll use a direct numeric selector for vehicleId for simplicity in offline mode.
  const [vehicleSelectionOpen, setVehicleSelectionOpen] = useState(false);

  const handleAddPart = () => {
    if (!draftPart.name.trim() || !draftPart.priceString.trim()) {
      Alert.alert('Incomplete', 'Please enter part name and price.');
      return;
    }
    const pricePaise = parseInt((parseFloat(draftPart.priceString) * 100).toString(), 10);
    if (isNaN(pricePaise)) {
      Alert.alert('Invalid Price', 'Please enter a valid numeric amount.');
      return;
    }

    setParts([
      ...parts,
      {
        name: draftPart.name.trim(),
        quantity: parseInt(draftPart.quantity, 10) || 1,
        priceAtTime: pricePaise,
      }
    ]);
    setDraftPart({ name: '', quantity: '1', priceString: '' });
  };

  const handleRemovePart = (index: number) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!vehicleId) {
      Alert.alert('Validation Error', 'You must select a vehicle.');
      return;
    }
    if (parts.length === 0) {
      Alert.alert('Warning', 'Are you sure you want to create a service without any parts or labor?', [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Create Anyway', 
          onPress: executeCreate 
        }
      ]);
      return;
    }
    executeCreate();
  };

  const executeCreate = () => {
    createServiceMutation.mutate(
      { vehicleId: vehicleId!, notes, parts },
      {
        onSuccess: (newId) => {
          router.replace(`/service/${newId}`); // go to detail
        }
      }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-950" edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center px-4 mb-4 mt-2">
          <TouchableOpacity 
            className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 items-center justify-center"
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white font-bold text-lg tracking-wide">New Service</Text>
          <TouchableOpacity 
            onPress={handleSubmit} 
            disabled={createServiceMutation.isPending}
            className={`px-4 py-2 rounded-full ${createServiceMutation.isPending ? 'bg-blue-800' : 'bg-blue-600'}`}
          >
            <Text className="text-white font-bold uppercase tracking-wider text-xs">
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          
          {/* Vehicle Selection Block - Kept raw for simplicity without 3rd party dropdowns */}
          <Text className="text-neutral-400 font-semibold mb-2 uppercase text-xs tracking-wider">Select Vehicle *</Text>
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => setVehicleSelectionOpen(!vehicleSelectionOpen)}
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-6 flex-row justify-between items-center"
          >
             <Text className="text-white font-medium">
               {vehicleId 
                 ? vehicles?.find(v => v.id === vehicleId)?.vehicleNumber 
                 : 'Tap to select an existing vehicle...'}
             </Text>
             <Ionicons name="chevron-down" size={20} color="#9ca3af" />
          </TouchableOpacity>

          {vehicleSelectionOpen && vehicles && (
            <View className="bg-neutral-900 border border-neutral-800 rounded-xl max-h-48 mb-6 overflow-hidden">
               <ScrollView>
                 {vehicles.map(v => (
                   <TouchableOpacity 
                     key={v.id} 
                     onPress={() => { setVehicleId(v.id); setVehicleSelectionOpen(false); }}
                     className="p-4 border-b border-neutral-800 flex-row justify-between"
                   >
                     <Text className="text-white font-semibold">{v.vehicleNumber}</Text>
                     <Text className="text-neutral-500 text-sm">{v.customerName}</Text>
                   </TouchableOpacity>
                 ))}
               </ScrollView>
            </View>
          )}

          {/* Notes Segment */}
          <Text className="text-neutral-400 font-semibold mb-2 uppercase text-xs tracking-wider">Mechanic Notes</Text>
          <TextInput
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-white mb-8 h-24"
            placeholder="Details about the inspection..."
            placeholderTextColor="#525252"
            multiline
            textAlignVertical="top"
            value={notes}
            onChangeText={setNotes}
          />

          {/* Parts Segment */}
          <Text className="text-neutral-400 font-semibold mb-2 uppercase text-xs tracking-wider">Add Parts / Labor</Text>
          <View className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
            <TextInput
              className="text-white bg-neutral-950 px-3 py-2 rounded-lg border border-neutral-800 mb-3"
              placeholder="Description (e.g. Engine Oil, Inspection)"
              placeholderTextColor="#525252"
              value={draftPart.name}
              onChangeText={(t) => setDraftPart({ ...draftPart, name: t })}
            />
            <View className="flex-row gap-3 mb-3">
              <TextInput
                className="flex-[0.5] text-white bg-neutral-950 px-3 py-2 rounded-lg border border-neutral-800"
                placeholder="Qty"
                placeholderTextColor="#525252"
                keyboardType="number-pad"
                value={draftPart.quantity}
                onChangeText={(t) => setDraftPart({ ...draftPart, quantity: t })}
              />
              <TextInput
                className="flex-1 text-white bg-neutral-950 px-3 py-2 rounded-lg border border-neutral-800"
                placeholder="Cost (₹) per item"
                placeholderTextColor="#525252"
                keyboardType="decimal-pad"
                value={draftPart.priceString}
                onChangeText={(t) => setDraftPart({ ...draftPart, priceString: t })}
              />
            </View>
            <TouchableOpacity 
              onPress={handleAddPart}
              className="bg-neutral-800 py-3 rounded-lg items-center flex-row justify-center"
            >
              <Ionicons name="add" size={18} color="white" />
              <Text className="text-white font-semibold ml-2">Add Line Item</Text>
            </TouchableOpacity>
          </View>

          {/* Added parts visualizer */}
          {parts.length > 0 && (
            <View className="bg-neutral-900 shadow-xl border border-neutral-800 rounded-xl overflow-hidden mt-2 mb-8">
              {parts.map((p, idx) => (
                <View key={idx} className={`flex-row justify-between items-center p-4 ${idx !== parts.length - 1 ? 'border-b border-neutral-800' : ''}`}>
                  <View>
                    <Text className="text-white font-semibold">{p.name}</Text>
                    <Text className="text-neutral-500 text-sm">{p.quantity} x ₹{(p.priceAtTime / 100).toFixed(2)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemovePart(idx)} className="p-2 bg-red-500/10 rounded-full">
                    <Ionicons name="trash" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
