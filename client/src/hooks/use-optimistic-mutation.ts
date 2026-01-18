import { useMutation, useQueryClient, UseMutationOptions, QueryKey } from '@tanstack/react-query';
import { useToast } from './use-toast';

/**
 * Configuration options for optimistic mutations
 */
export interface OptimisticMutationOptions<TData, TError, TVariables, TContext> {
  /** The mutation function that performs the actual API call */
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Query keys to invalidate on success/error */
  queryKeys?: QueryKey[];
  /**
   * Function to optimistically update the cache before the mutation completes
   * Returns the previous state for rollback purposes
   */
  optimisticUpdate?: (variables: TVariables) => TContext;
  /**
   * Function to rollback the optimistic update on error
   */
  rollback?: (context: TContext | undefined, error: TError, variables: TVariables) => void;
  /** Success message to display in toast */
  successMessage?: string | ((data: TData, variables: TVariables) => string);
  /** Error message to display in toast */
  errorMessage?: string | ((error: TError, variables: TVariables) => string);
  /** Whether to show toast notifications (default: true) */
  showToasts?: boolean;
  /** Callback on success */
  onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => void | Promise<void>;
  /** Callback on error */
  onError?: (error: TError, variables: TVariables, context: TContext | undefined) => void | Promise<void>;
  /** Callback on settled (after success or error) */
  onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables, context: TContext | undefined) => void | Promise<void>;
}

/**
 * A generic hook for creating optimistic mutations with automatic rollback on failure.
 *
 * Features:
 * - Optimistic updates for immediate UI feedback
 * - Automatic rollback on error
 * - Toast notifications for success/error
 * - Query invalidation on success
 *
 * @example
 * ```tsx
 * const updateQuantityMutation = useOptimisticMutation({
 *   mutationFn: async ({ itemId, quantity }) => {
 *     const response = await apiRequest('POST', '/api/cart/update', { itemId, quantity });
 *     return response.json();
 *   },
 *   queryKeys: [['cart']],
 *   optimisticUpdate: ({ itemId, quantity }) => {
 *     const previousCart = queryClient.getQueryData(['cart']);
 *     queryClient.setQueryData(['cart'], (old) => ({
 *       ...old,
 *       items: old.items.map(item =>
 *         item.id === itemId ? { ...item, quantity } : item
 *       )
 *     }));
 *     return { previousCart };
 *   },
 *   rollback: (context) => {
 *     queryClient.setQueryData(['cart'], context.previousCart);
 *   },
 *   successMessage: 'Cart updated!',
 *   errorMessage: 'Failed to update cart',
 * });
 * ```
 */
export function useOptimisticMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown
>(options: OptimisticMutationOptions<TData, TError, TVariables, TContext>) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    mutationFn,
    queryKeys = [],
    optimisticUpdate,
    rollback,
    successMessage,
    errorMessage,
    showToasts = true,
    onSuccess,
    onError,
    onSettled,
  } = options;

  return useMutation<TData, TError, TVariables, TContext>({
    mutationFn,

    onMutate: async (variables) => {
      // Cancel any outgoing refetches to prevent overwriting optimistic update
      for (const queryKey of queryKeys) {
        await queryClient.cancelQueries({ queryKey });
      }

      // Perform the optimistic update if provided
      if (optimisticUpdate) {
        return optimisticUpdate(variables);
      }

      return undefined as TContext;
    },

    onError: (error, variables, context) => {
      // Rollback on error if rollback function is provided
      if (rollback) {
        rollback(context, error, variables);
      }

      // Show error toast
      if (showToasts) {
        const message = typeof errorMessage === 'function'
          ? errorMessage(error, variables)
          : errorMessage || (error instanceof Error ? error.message : 'An error occurred');

        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      }

      // Call custom onError handler
      if (onError) {
        onError(error, variables, context);
      }
    },

    onSuccess: (data, variables, context) => {
      // Show success toast
      if (showToasts && successMessage) {
        const message = typeof successMessage === 'function'
          ? successMessage(data, variables)
          : successMessage;

        toast({
          title: 'Success',
          description: message,
        });
      }

      // Call custom onSuccess handler
      if (onSuccess) {
        onSuccess(data, variables, context);
      }
    },

    onSettled: (data, error, variables, context) => {
      // Always invalidate queries on settled to ensure data consistency
      for (const queryKey of queryKeys) {
        queryClient.invalidateQueries({ queryKey });
      }

      // Call custom onSettled handler
      if (onSettled) {
        onSettled(data, error, variables, context);
      }
    },
  });
}

/**
 * Specific type for cart operations context
 */
export interface CartOperationContext {
  previousItems: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
    restaurantId?: string;
    restaurantName?: string;
    category?: string;
    specialInstructions?: string;
  }>;
}

/**
 * Specific type for favorites operations context
 */
export interface FavoritesOperationContext {
  previousFavorites: unknown;
}

/**
 * Helper function to create a cart optimistic mutation
 */
export function useCartOptimisticMutation<TData, TVariables>(
  options: Omit<
    OptimisticMutationOptions<TData, Error, TVariables, CartOperationContext>,
    'queryKeys'
  > & { additionalQueryKeys?: QueryKey[] }
) {
  const { additionalQueryKeys = [], ...rest } = options;

  return useOptimisticMutation<TData, Error, TVariables, CartOperationContext>({
    ...rest,
    queryKeys: [['cart'], ['/api/cart'], ...additionalQueryKeys],
  });
}

/**
 * Helper function to create a favorites optimistic mutation
 */
export function useFavoritesOptimisticMutation<TData, TVariables>(
  options: Omit<
    OptimisticMutationOptions<TData, Error, TVariables, FavoritesOperationContext>,
    'queryKeys'
  > & { additionalQueryKeys?: QueryKey[] }
) {
  const { additionalQueryKeys = [], ...rest } = options;

  return useOptimisticMutation<TData, Error, TVariables, FavoritesOperationContext>({
    ...rest,
    queryKeys: [['favorites'], ['/api/favorites'], ...additionalQueryKeys],
  });
}

export default useOptimisticMutation;
