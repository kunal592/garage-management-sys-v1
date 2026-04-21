import { Link, Stack } from 'expo-router';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function NotFoundScreen() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-950 items-center justify-center p-6">
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View className="bg-neutral-900 w-24 h-24 rounded-full items-center justify-center mb-6 border border-neutral-800">
        <Ionicons name="search-outline" size={48} color="#525252" />
      </View>
      <Text className="text-white text-3xl font-extrabold text-center tracking-tight mb-2">
        Page Not Found
      </Text>
      <Text className="text-neutral-400 text-center mb-8 px-4 leading-relaxed">
        The file or screen you are looking for doesn't exist within the local filesystem.
      </Text>
      <Link href="/" asChild>
        <TouchableOpacity 
          activeOpacity={0.8}
          className="bg-neutral-800 px-8 py-4 rounded-xl flex-row items-center justify-center w-full border border-neutral-700"
        >
          <Ionicons name="home-outline" size={20} color="white" />
          <Text className="text-white font-bold ml-2 text-lg">Back to Dashboard</Text>
        </TouchableOpacity>
      </Link>
    </SafeAreaView>
  );
}
