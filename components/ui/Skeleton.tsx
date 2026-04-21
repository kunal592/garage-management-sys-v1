import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp, View } from 'react-native';

interface SkeletonProps {
  style?: StyleProp<ViewStyle>;
  className?: string; // NativeWind support
  children?: React.ReactNode;
}

/**
 * Lightweight native Skeleton loader.
 * Uses Animated API to pulse opacity. Avoids heavy re-renders.
 */
export const Skeleton: React.FC<SkeletonProps> = React.memo(({ style, className, children }) => {
  const customOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(customOpacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(customOpacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [customOpacity]);

  return (
    <Animated.View
      className={`bg-neutral-800 rounded-md overflow-hidden ${className || ''}`}
      style={[style, { opacity: customOpacity }]}
    >
      {/* If child components need to be masked inside the skeleton box */}
      {children ? <View className="opacity-0">{children}</View> : null}
    </Animated.View>
  );
});
