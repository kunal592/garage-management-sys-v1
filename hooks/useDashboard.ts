import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import {
  getDashboardStats,
  getRecentServiceRows,
  getMonthlyRevenue,
  getTopParts,
  getTopCustomers,
} from '@/data/repositories/dashboardRepo';

// ---------------------------------------------------------------------------
// Dashboard KPI stats
// ---------------------------------------------------------------------------

/**
 * Aggregated stats for the Dashboard header cards:
 *   totalCustomers, totalVehicles, dailyRevenue, pendingServices, dailyServiceCount.
 *
 * This is the hottest query in the app — called on every Dashboard mount.
 * staleTime: Infinity means it only re-fetches when a mutation explicitly
 * invalidates queryKeys.dashboard.root.
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: getDashboardStats,
  });
}

// ---------------------------------------------------------------------------
// Recent services feed
// ---------------------------------------------------------------------------

/**
 * Lightweight recent service rows for the Dashboard activity list.
 * Does not include parts — intentionally fast.
 * @param limit - Number of rows to show (default 10).
 */
export function useRecentServices(limit: number = 10) {
  return useQuery({
    queryKey: queryKeys.dashboard.recentServices(limit),
    queryFn: () => getRecentServiceRows(limit),
  });
}

// ---------------------------------------------------------------------------
// Analytics queries
// ---------------------------------------------------------------------------

/**
 * Monthly revenue grouped by month for the Analytics chart.
 * Returns data oldest → newest for direct use in charting libraries.
 * @param months - Look-back window in months (default 6).
 */
export function useMonthlyRevenue(months: number = 6) {
  return useQuery({
    queryKey: queryKeys.dashboard.monthlyRevenue(months),
    queryFn: () => getMonthlyRevenue(months),
  });
}

/**
 * Top N service parts by usage count.
 * Powers the "Top Service Types" analytics card.
 * @param limit - Number of parts to return (default 10).
 */
export function useTopParts(limit: number = 10) {
  return useQuery({
    queryKey: queryKeys.dashboard.topParts(limit),
    queryFn: () => getTopParts(limit),
  });
}

/**
 * Top N customers by total spend.
 * Powers the "Top Customers" analytics card.
 * @param limit - Number of customers to return (default 10).
 */
export function useTopCustomers(limit: number = 10) {
  return useQuery({
    queryKey: queryKeys.dashboard.topCustomers(limit),
    queryFn: () => getTopCustomers(limit),
  });
}

// ---------------------------------------------------------------------------
// Composite hook — loads everything for the Analytics screen in parallel
// ---------------------------------------------------------------------------

/**
 * Fetches all analytics data in parallel.
 * Returns individual query results so the UI can handle each loading state.
 */
export function useAnalytics(months: number = 6, topN: number = 10) {
  const revenue = useMonthlyRevenue(months);
  const parts = useTopParts(topN);
  const customers = useTopCustomers(topN);

  return {
    revenue,
    parts,
    customers,
    isLoading: revenue.isLoading || parts.isLoading || customers.isLoading,
    isError: revenue.isError || parts.isError || customers.isError,
  };
}
