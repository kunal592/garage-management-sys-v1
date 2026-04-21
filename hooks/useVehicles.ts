import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/components/providers/QueryProvider';
import { queryKeys } from './queryKeys';
import {
  createVehicle,
  getAllVehiclesWithCustomer,
  getVehiclesByCustomerId,
  getVehicleById,
  updateVehicle,
  setNextServiceDate,
  deleteVehicle,
  getUpcomingServiceAlerts,
  addVehicleImage,
  getVehicleImages,
  type CreateVehicleInput,
  type UpdateVehicleInput,
} from '@/data/repositories/vehicleRepo';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * All vehicles joined with their customer data.
 * Used by the master vehicles list screen.
 */
export function useVehicles() {
  return useQuery({
    queryKey: queryKeys.vehicles.all,
    queryFn: getAllVehiclesWithCustomer,
  });
}

/**
 * All vehicles for a specific customer.
 */
export function useVehiclesByCustomer(customerId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.vehicles.byCustomer(customerId!),
    queryFn: () => getVehiclesByCustomerId(customerId!),
    enabled: customerId !== undefined,
  });
}

/**
 * Single vehicle by id.
 */
export function useVehicle(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.vehicles.detail(id!),
    queryFn: () => getVehicleById(id!),
    enabled: id !== undefined,
  });
}

/**
 * Vehicles with service dates due within `daysAhead` days.
 * Defaults to 7 days — powers the Alerts screen.
 */
export function useServiceAlerts(daysAhead: number = 7) {
  return useQuery({
    queryKey: queryKeys.vehicles.alerts(daysAhead),
    queryFn: () => getUpcomingServiceAlerts(daysAhead),
  });
}

/**
 * All valid (non-expired) images for a vehicle.
 */
export function useVehicleImages(vehicleId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.vehicles.images(vehicleId!),
    queryFn: () => getVehicleImages(vehicleId!),
    enabled: vehicleId !== undefined,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Add a new vehicle under a customer.
 */
export function useCreateVehicle() {
  return useMutation({
    mutationFn: (input: CreateVehicleInput) => createVehicle(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.root });
      queryClient.invalidateQueries({
        queryKey: queryKeys.vehicles.byCustomer(variables.customerId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.root });
    },
  });
}

/**
 * Update vehicle fields.
 */
export function useUpdateVehicle() {
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateVehicleInput }) =>
      updateVehicle(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.root });
      queryClient.invalidateQueries({
        queryKey: queryKeys.vehicles.detail(variables.id),
      });
      // Alerts depend on nextServiceDate — always refresh
      queryClient.invalidateQueries({ queryKey: ['vehicles', 'alerts'] });
    },
  });
}

/**
 * Set the next service date only — called after completing a service.
 */
export function useSetNextServiceDate() {
  return useMutation({
    mutationFn: ({
      vehicleId,
      nextServiceDate,
    }: {
      vehicleId: number;
      nextServiceDate: string | null;
    }) => setNextServiceDate(vehicleId, nextServiceDate),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vehicles.detail(variables.vehicleId),
      });
      queryClient.invalidateQueries({ queryKey: ['vehicles', 'alerts'] });
    },
  });
}

/**
 * Delete a vehicle and all cascaded service/part records.
 */
export function useDeleteVehicle() {
  return useMutation({
    mutationFn: (id: number) => deleteVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.services.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.root });
    },
  });
}

/**
 * Attach an image to a vehicle.
 */
export function useAddVehicleImage() {
  return useMutation({
    mutationFn: ({
      vehicleId,
      uri,
      expiresAt,
    }: {
      vehicleId: number;
      uri: string;
      expiresAt: string;
    }) => addVehicleImage(vehicleId, uri, expiresAt),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vehicles.images(variables.vehicleId),
      });
    },
  });
}
