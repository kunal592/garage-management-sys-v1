/**
 * Skeleton UI System
 * ─────────────────────────────────────────────────────────────────────────────
 * Zero external dependencies. All animation runs on the native UI thread via
 * `useNativeDriver: true`. Components are memoized — calling the same skeleton
 * shape N times only triggers N Animated loops, not N React reconciliations.
 *
 * Exports:
 *   Skeleton         – primitive pulsing block (use for any shape)
 *   SkeletonRow      – full-width line of variable height
 *   SkeletonCircle   – avatar / icon placeholder
 *   SkeletonGroup    – vertical stack of SkeletonRows (shorthand)
 *
 *   StatCardSkeleton        – matches StatCard dimensions
 *   ServiceListItemSkeleton – matches RecentServiceItem dimensions
 *   ServiceDetailSkeleton   – matches the Service Detail screen layout
 *   ServiceFormSkeleton     – matches the Add Service form layout
 */

import React, { useEffect, useRef, memo } from 'react';
import { Animated, View, ViewStyle, StyleProp } from 'react-native';

// ─── Shared animation config ──────────────────────────────────────────────────
const PULSE_IN  = { toValue: 0.75, duration: 750, useNativeDriver: true } as const;
const PULSE_OUT = { toValue: 0.25, duration: 750, useNativeDriver: true } as const;

// ─── Primitive ────────────────────────────────────────────────────────────────

export interface SkeletonProps {
  /** Explicit width — falls back to '100%' via flex */
  width?: number | `${number}%`;
  /** Explicit height */
  height?: number;
  /** Border radius */
  radius?: number;
  /** Extra style */
  style?: StyleProp<ViewStyle>;
  /** NativeWind className */
  className?: string;
}

/**
 * Base pulsing skeleton block.
 * Animation runs entirely on the native UI thread.
 */
export const Skeleton = memo(({
  width,
  height,
  radius = 6,
  style,
  className,
}: SkeletonProps) => {
  const opacity = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, PULSE_IN),
        Animated.timing(opacity, PULSE_OUT),
      ]),
    );
    loop.start();
    return () => loop.stop();
  // opacity is a stable ref — safe to omit from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      className={`bg-neutral-700 ${className ?? ''}`}
      style={[
        { opacity, borderRadius: radius },
        width !== undefined && { width },
        height !== undefined && { height },
        style,
      ]}
    />
  );
});

// ─── Convenience shapes ───────────────────────────────────────────────────────

/** Full-width horizontal line */
export const SkeletonRow = memo(({
  height = 16,
  radius = 6,
  width,
  style,
}: SkeletonProps) => (
  <Skeleton height={height} radius={radius} width={width} style={[{ alignSelf: 'stretch' }, style]} />
));

/** Circle for avatars / icon placeholders */
export const SkeletonCircle = memo(({ size = 48 }: { size?: number }) => (
  <Skeleton width={size} height={size} radius={size / 2} />
));

/** Vertical stack of rows — shorthand for common patterns */
export interface SkeletonGroupProps {
  /** Each entry: [height, widthPercent?] */
  rows: Array<{ h: number; w?: `${number}%` | number }>;
  gap?: number;
}
export const SkeletonGroup = memo(({ rows, gap = 10 }: SkeletonGroupProps) => (
  <View>
    {rows.map((r, i) => (
      <SkeletonRow
        key={i}
        height={r.h}
        width={r.w}
        style={i > 0 ? { marginTop: gap } : undefined}
      />
    ))}
  </View>
));

// ─────────────────────────────────────────────────────────────────────────────
// Composed screen-level skeletons
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Matches the StatCard component (icon row + value block).
 */
export const StatCardSkeleton = memo(() => (
  <View
    style={{ flex: 1, marginRight: 12 }}
    className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 min-w-[140px]"
  >
    {/* Icon + label row */}
    <View className="flex-row items-center mb-3">
      <SkeletonCircle size={18} />
      <SkeletonRow height={10} width={70} style={{ marginLeft: 8 }} />
    </View>
    {/* Value */}
    <SkeletonRow height={28} width={80} />
  </View>
));

/**
 * Matches the RecentServiceItem / service list row.
 */
export const ServiceListItemSkeleton = memo(() => (
  <View className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-3 flex-row items-center">
    <SkeletonCircle size={48} />
    <View className="flex-1 ml-4">
      <SkeletonRow height={16} width="60%" />
      <SkeletonRow height={13} width="40%" style={{ marginTop: 8 }} />
    </View>
    <View className="items-end">
      <SkeletonRow height={16} width={60} />
      <SkeletonRow height={12} width={44} style={{ marginTop: 8 }} />
    </View>
  </View>
));

/** Four service list rows — used while the paginated list loads */
export const ServiceListSkeleton = memo(() => (
  <View>
    <ServiceListItemSkeleton />
    <ServiceListItemSkeleton />
    <ServiceListItemSkeleton />
    <ServiceListItemSkeleton />
  </View>
));

/**
 * Matches the Service Detail screen layout:
 * back button → title block → customer card → parts card
 */
export const ServiceDetailSkeleton = memo(() => (
  <View className="px-4 pt-4">
    {/* Header row */}
    <View className="flex-row justify-between mb-6">
      <SkeletonCircle size={40} />
      <SkeletonCircle size={40} />
    </View>

    {/* Title block */}
    <SkeletonGroup
      rows={[{ h: 32, w: '55%' }, { h: 18, w: '40%' }]}
      gap={10}
    />

    {/* Customer card */}
    <View className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 mt-6 mb-6">
      <SkeletonRow height={10} width={120} />
      <SkeletonRow height={20} width="60%" style={{ marginTop: 12 }} />
      <SkeletonRow height={14} width={100} style={{ marginTop: 8 }} />
    </View>

    {/* Parts card */}
    <View className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
      {[0, 1, 2].map(i => (
        <View key={i} className="flex-row justify-between items-center p-4 border-b border-neutral-800">
          <View className="flex-1">
            <SkeletonRow height={15} width="50%" />
            <SkeletonRow height={12} width="35%" style={{ marginTop: 6 }} />
          </View>
          <SkeletonRow height={15} width={60} />
        </View>
      ))}
      {/* Total row */}
      <View className="flex-row justify-between items-center p-4 bg-neutral-800/50">
        <SkeletonRow height={14} width={80} />
        <SkeletonRow height={22} width={90} />
      </View>
    </View>
  </View>
));

/**
 * Matches the New Service form layout:
 * vehicle picker → notes → parts builder
 */
export const ServiceFormSkeleton = memo(() => (
  <View className="px-4 pt-4">
    {/* Header */}
    <View className="flex-row justify-between items-center mb-6">
      <SkeletonCircle size={40} />
      <SkeletonRow height={18} width={110} />
      <SkeletonRow height={32} width={60} radius={16} />
    </View>

    {/* Vehicle selector */}
    <SkeletonRow height={10} width={100} style={{ marginBottom: 10 }} />
    <SkeletonRow height={52} radius={12} style={{ marginBottom: 24 }} />

    {/* Notes */}
    <SkeletonRow height={10} width={120} style={{ marginBottom: 10 }} />
    <SkeletonRow height={90} radius={12} style={{ marginBottom: 32 }} />

    {/* Parts builder */}
    <SkeletonRow height={10} width={140} style={{ marginBottom: 10 }} />
    <View className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
      <SkeletonRow height={40} radius={8} style={{ marginBottom: 12 }} />
      <View className="flex-row gap-3 mb-3">
        <SkeletonRow height={40} radius={8} style={{ flex: 0.5 }} />
        <SkeletonRow height={40} radius={8} style={{ flex: 1 }} />
      </View>
      <SkeletonRow height={44} radius={8} />
    </View>
  </View>
));

/**
 * Dashboard full-screen skeleton:
 * two KPI rows + four activity rows
 */
export const DashboardSkeleton = memo(() => (
  <View className="px-4 pt-2">
    {/* KPI row 1 */}
    <View className="flex-row mb-4">
      <StatCardSkeleton />
      <StatCardSkeleton />
    </View>
    {/* KPI row 2 */}
    <View className="flex-row mb-8">
      <StatCardSkeleton />
      <StatCardSkeleton />
    </View>
    {/* Section header */}
    <SkeletonRow height={18} width="40%" style={{ marginBottom: 16 }} />
    {/* Activity feed */}
    <ServiceListSkeleton />
  </View>
));
