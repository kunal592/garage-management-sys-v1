import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SplashScreen() {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous rotation loop using native driver for lightweight execution
    const loop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();

    return () => loop.stop();
  }, [rotateAnim]);

  // Interpolate 0-1 to 0-360deg
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View className="flex-1 items-center justify-center bg-neutral-900">
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Ionicons name="settings-sharp" size={64} color="#3b82f6" />
      </Animated.View>
      <Text className="mt-6 text-xl font-bold text-white tracking-widest uppercase">
        Garage OS
      </Text>
      <Text className="mt-2 text-sm text-neutral-400">
        Initializing Workspace...
      </Text>
    </View>
  );
}
