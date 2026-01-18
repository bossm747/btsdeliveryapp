import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  restaurantId?: string;
  restaurantName?: string;
  category?: string;
  specialInstructions?: string;
}

/**
 * Represents a pending cart operation for optimistic updates
 */
export interface PendingOperation {
  id: string;
  type: 'add' | 'remove' | 'update' | 'clear';
  itemId?: string;
  previousState: CartItem[];
  timestamp: number;
}

/**
 * Snapshot of cart state for rollback purposes
 */
export interface CartSnapshot {
  items: CartItem[];
  timestamp: number;
}

interface CartStore {
  items: CartItem[];
  // Pending operations tracking for optimistic updates
  pendingOperations: PendingOperation[];
  // History of snapshots for rollback
  snapshots: CartSnapshot[];

  // Basic cart operations
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;

  // Computed getters
  getTotalPrice: () => number;
  getTotalItems: () => number;
  getCurrentRestaurantId: () => string | undefined;

  // Optimistic update operations
  /**
   * Creates a snapshot of the current cart state before an optimistic update
   * Returns the operation ID for tracking
   */
  beginOptimisticUpdate: (type: PendingOperation['type'], itemId?: string) => string;

  /**
   * Commits a pending operation after successful API call
   */
  commitOperation: (operationId: string) => void;

  /**
   * Rolls back to the state before the optimistic update
   */
  rollbackOperation: (operationId: string) => void;

  /**
   * Gets the current pending operation for an item (if any)
   */
  getPendingOperation: (itemId: string) => PendingOperation | undefined;

  /**
   * Checks if there are any pending operations
   */
  hasPendingOperations: () => boolean;

  /**
   * Clears all pending operations (useful for cleanup)
   */
  clearPendingOperations: () => void;

  /**
   * Restores cart to a specific snapshot
   */
  restoreSnapshot: (snapshot: CartSnapshot) => void;

  /**
   * Creates a snapshot of current state
   */
  createSnapshot: () => CartSnapshot;
}

// Generate unique operation IDs
let operationIdCounter = 0;
const generateOperationId = () => {
  operationIdCounter += 1;
  return `op_${Date.now()}_${operationIdCounter}`;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      pendingOperations: [],
      snapshots: [],

      addItem: (newItem) => {
        set((state) => {
          const existingItem = state.items.find(item => item.id === newItem.id);
          if (existingItem) {
            return {
              items: state.items.map(item =>
                item.id === newItem.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              )
            };
          }
          return {
            items: [...state.items, { ...newItem, quantity: 1 }]
          };
        });
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter(item => item.id !== id)
        }));
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        set((state) => ({
          items: state.items.map(item =>
            item.id === id ? { ...item, quantity } : item
          )
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getCurrentRestaurantId: () => {
        const items = get().items;
        return items.length > 0 ? items[0].restaurantId : undefined;
      },

      // Optimistic update operations
      beginOptimisticUpdate: (type, itemId) => {
        const operationId = generateOperationId();
        const currentItems = get().items;

        set((state) => ({
          pendingOperations: [
            ...state.pendingOperations,
            {
              id: operationId,
              type,
              itemId,
              previousState: [...currentItems],
              timestamp: Date.now(),
            },
          ],
          // Also save a snapshot for potential multi-step rollback
          snapshots: [
            ...state.snapshots.slice(-4), // Keep last 5 snapshots max
            {
              items: [...currentItems],
              timestamp: Date.now(),
            },
          ],
        }));

        return operationId;
      },

      commitOperation: (operationId) => {
        set((state) => ({
          pendingOperations: state.pendingOperations.filter(
            (op) => op.id !== operationId
          ),
        }));
      },

      rollbackOperation: (operationId) => {
        const operation = get().pendingOperations.find(
          (op) => op.id === operationId
        );

        if (operation) {
          set((state) => ({
            items: operation.previousState,
            pendingOperations: state.pendingOperations.filter(
              (op) => op.id !== operationId
            ),
          }));
        }
      },

      getPendingOperation: (itemId) => {
        return get().pendingOperations.find((op) => op.itemId === itemId);
      },

      hasPendingOperations: () => {
        return get().pendingOperations.length > 0;
      },

      clearPendingOperations: () => {
        set({ pendingOperations: [] });
      },

      restoreSnapshot: (snapshot) => {
        set({ items: snapshot.items });
      },

      createSnapshot: () => {
        const items = get().items;
        return {
          items: [...items],
          timestamp: Date.now(),
        };
      },
    }),
    {
      name: 'cart-storage',
      // Only persist items, not pending operations or snapshots
      partialize: (state) => ({ items: state.items }),
    }
  )
);