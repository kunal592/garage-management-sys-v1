// Query key registry
export { queryKeys } from './queryKeys';

// Customer hooks
export {
  useCustomers,
  useCustomer,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from './useCustomers';

// Vehicle hooks
export {
  useVehicles,
  useVehiclesByCustomer,
  useVehicle,
  useServiceAlerts,
  useVehicleImages,
  useCreateVehicle,
  useUpdateVehicle,
  useSetNextServiceDate,
  useDeleteVehicle,
  useAddVehicleImage,
} from './useVehicles';

// Service hooks
export {
  useServices,
  useServiceDetail,
  useServicesByVehicle,
  useServiceParts,
  useServiceImages,
  useCreateService,
  useUpdateService,
  useMarkServicePerformed,
  useDeleteService,
  useAddPart,
  useRemovePart,
  useAddServiceImage,
} from './useServices';

// Dashboard + analytics hooks
export {
  useDashboardStats,
  useRecentServices,
  useMonthlyRevenue,
  useTopParts,
  useTopCustomers,
  useAnalytics,
} from './useDashboard';
