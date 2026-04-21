import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/components/providers/QueryProvider';
import { queryKeys } from './queryKeys';
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  type CreateCustomerInput,
  type UpdateCustomerInput,
} from '@/data/repositories/customerRepo';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * All customers, optionally filtered by name/phone.
 * staleTime: Infinity — data stays fresh until explicitly invalidated by a mutation.
 */
export function useCustomers(search?: string) {
  return useQuery({
    queryKey: queryKeys.customers.all(search),
    queryFn: () => getAllCustomers(search),
  });
}

/**
 * Single customer by id.
 * Only runs when id is defined (avoids query with undefined param).
 */
export function useCustomer(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id!),
    queryFn: () => getCustomerById(id!),
    enabled: id !== undefined,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Create a new customer.
 * On success: invalidates the full customer list so it refreshes.
 */
export function useCreateCustomer() {
  return useMutation({
    mutationFn: (input: CreateCustomerInput) => createCustomer(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.root });
    },
  });
}

/**
 * Update an existing customer.
 * Invalidates both the list and the specific detail entry.
 */
export function useUpdateCustomer() {
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateCustomerInput }) =>
      updateCustomer(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.root });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(variables.id),
      });
    },
  });
}

/**
 * Delete a customer and all cascaded records.
 * Invalidates customers + vehicles + services (all cascade-affected).
 */
export function useDeleteCustomer() {
  return useMutation({
    mutationFn: (id: number) => deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.services.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.root });
    },
  });
}
