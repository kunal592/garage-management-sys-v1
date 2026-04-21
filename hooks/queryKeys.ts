/**
 * Central registry of all React Query cache keys.
 *
 * Rules:
 *  - Every key is a tuple so partial invalidation is possible.
 *  - Keys are read-only `as const` — prevents accidental mutation.
 *  - Naming: [entity, scope, ...params]
 *
 * Usage:
 *   useQuery({ queryKey: queryKeys.customers.all })
 *   queryClient.invalidateQueries({ queryKey: queryKeys.customers.root })
 */
export const queryKeys = {
  // ---------------------------------------------------------------------------
  // Customers
  // ---------------------------------------------------------------------------
  customers: {
    /** Invalidates every customer query */
    root: ['customers'] as const,
    /** Full list (optionally filtered) */
    all: (search?: string) =>
      search ? (['customers', 'list', search] as const) : (['customers', 'list'] as const),
    /** Single customer by id */
    detail: (id: number) => ['customers', 'detail', id] as const,
  },

  // ---------------------------------------------------------------------------
  // Vehicles
  // ---------------------------------------------------------------------------
  vehicles: {
    /** Invalidates every vehicle query */
    root: ['vehicles'] as const,
    /** All vehicles with joined customer data */
    all: ['vehicles', 'list'] as const,
    /** Vehicles belonging to one customer */
    byCustomer: (customerId: number) =>
      ['vehicles', 'byCustomer', customerId] as const,
    /** Single vehicle by id */
    detail: (id: number) => ['vehicles', 'detail', id] as const,
    /** Upcoming service alerts */
    alerts: (daysAhead: number) => ['vehicles', 'alerts', daysAhead] as const,
    /** Images for a vehicle */
    images: (vehicleId: number) => ['vehicles', 'images', vehicleId] as const,
  },

  // ---------------------------------------------------------------------------
  // Services
  // ---------------------------------------------------------------------------
  services: {
    /** Invalidates every service query */
    root: ['services'] as const,
    /** Paginated list with optional status filter */
    list: (page: number, status?: string) =>
      status
        ? (['services', 'list', page, status] as const)
        : (['services', 'list', page] as const),
    /** Full service detail including parts */
    detail: (id: number) => ['services', 'detail', id] as const,
    /** Services for a specific vehicle */
    byVehicle: (vehicleId: number) =>
      ['services', 'byVehicle', vehicleId] as const,
    /** Parts within one service */
    parts: (serviceId: number) => ['services', 'parts', serviceId] as const,
    /** Images for a service */
    images: (serviceId: number) => ['services', 'images', serviceId] as const,
  },

  // ---------------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------------
  dashboard: {
    /** Invalidates all dashboard queries */
    root: ['dashboard'] as const,
    /** KPI stats card */
    stats: ['dashboard', 'stats'] as const,
    /** Recent activity feed */
    recentServices: (limit: number) =>
      ['dashboard', 'recentServices', limit] as const,
    /** Analytics: monthly revenue chart */
    monthlyRevenue: (months: number) =>
      ['dashboard', 'monthlyRevenue', months] as const,
    /** Analytics: top parts */
    topParts: (limit: number) => ['dashboard', 'topParts', limit] as const,
    /** Analytics: top customers */
    topCustomers: (limit: number) =>
      ['dashboard', 'topCustomers', limit] as const,
  },
} as const;
