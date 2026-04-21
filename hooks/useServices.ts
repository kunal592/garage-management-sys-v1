import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/components/providers/QueryProvider';
import { queryKeys } from './queryKeys';
import {
  createService,
  updateService,
  markServicePerformed,
  deleteService,
  addPartToService,
  removePartFromService,
  getServiceDetail,
  getServicesByVehicleId,
  getServicesPaginated,
  getPartsByServiceId,
  addServiceImage,
  getServiceImages,
  type CreateServiceInput,
  type UpdateServiceInput,
  type CreateServicePartInput,
  type ServiceStatus,
} from '@/data/repositories/serviceRepo';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Paginated list of services with joined vehicle + customer data.
 * @param page   - Zero-based page index.
 * @param limit  - Items per page (default 20).
 * @param status - Optional filter: 'Pending' | 'Performed'.
 */
export function useServices(
  page: number = 0,
  limit: number = 20,
  status?: ServiceStatus,
) {
  return useQuery({
    queryKey: queryKeys.services.list(page, status),
    queryFn: () => getServicesPaginated(limit, page * limit, status),
  });
}

/**
 * Full service detail — includes vehicle, customer, and parts array.
 * Used by the Service Detail screen.
 */
export function useServiceDetail(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.services.detail(id!),
    queryFn: () => getServiceDetail(id!),
    enabled: id !== undefined,
  });
}

/**
 * All services for a specific vehicle, newest first.
 */
export function useServicesByVehicle(vehicleId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.services.byVehicle(vehicleId!),
    queryFn: () => getServicesByVehicleId(vehicleId!),
    enabled: vehicleId !== undefined,
  });
}

/**
 * Parts list for a service.
 * Kept separate from useServiceDetail so the parts section can refetch
 * independently when parts are added/removed.
 */
export function useServiceParts(serviceId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.services.parts(serviceId!),
    queryFn: () => getPartsByServiceId(serviceId!),
    enabled: serviceId !== undefined,
  });
}

/**
 * All non-expired images for a service.
 */
export function useServiceImages(serviceId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.services.images(serviceId!),
    queryFn: () => getServiceImages(serviceId!),
    enabled: serviceId !== undefined,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Create a new service with parts in a single transaction.
 * Invalidates service lists, vehicle service history, and dashboard stats.
 */
export function useCreateService() {
  return useMutation({
    mutationFn: (input: CreateServiceInput) => createService(input),
    onSuccess: (_serviceId, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.root });
      queryClient.invalidateQueries({
        queryKey: queryKeys.services.byVehicle(variables.vehicleId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.root });
    },
  });
}

/**
 * Update service status or notes.
 */
export function useUpdateService() {
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateServiceInput }) =>
      updateService(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.root });
      queryClient.invalidateQueries({
        queryKey: queryKeys.services.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.root });
    },
  });
}

/**
 * Mark a service as Performed.
 * Shorthand for useUpdateService with status: 'Performed'.
 */
export function useMarkServicePerformed() {
  return useMutation({
    mutationFn: (id: number) => markServicePerformed(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.root });
      queryClient.invalidateQueries({
        queryKey: queryKeys.services.detail(id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.root });
    },
  });
}

/**
 * Delete a service and its parts via CASCADE.
 */
export function useDeleteService() {
  return useMutation({
    mutationFn: (id: number) => deleteService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.root });
    },
  });
}

/**
 * Add a part to an existing service.
 * Automatically recalculates totalCost in the repository.
 */
export function useAddPart() {
  return useMutation({
    mutationFn: ({
      serviceId,
      part,
    }: {
      serviceId: number;
      part: CreateServicePartInput;
    }) => addPartToService(serviceId, part),
    onSuccess: (_data, variables) => {
      // Invalidate parts list and the service detail (totalCost changed)
      queryClient.invalidateQueries({
        queryKey: queryKeys.services.parts(variables.serviceId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.services.detail(variables.serviceId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.root });
    },
  });
}

/**
 * Remove a part from a service.
 * Automatically recalculates totalCost in the repository.
 */
export function useRemovePart() {
  return useMutation({
    mutationFn: ({
      partId,
      serviceId,
    }: {
      partId: number;
      serviceId: number;
    }) => removePartFromService(partId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.services.parts(variables.serviceId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.services.detail(variables.serviceId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.root });
    },
  });
}

/**
 * Attach an image to a service record.
 */
export function useAddServiceImage() {
  return useMutation({
    mutationFn: ({
      serviceId,
      uri,
      expiresAt,
    }: {
      serviceId: number;
      uri: string;
      expiresAt: string;
    }) => addServiceImage(serviceId, uri, expiresAt),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.services.images(variables.serviceId),
      });
    },
  });
}
