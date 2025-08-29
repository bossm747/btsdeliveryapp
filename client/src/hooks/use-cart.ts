import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  restaurantId: string;
  restaurantName: string;
  image?: string;
  options?: string[];
  notes?: string;
}

interface CartStore {
  items: CartItem[];
  restaurantId: string | null;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  canAddItem: (restaurantId: string) => boolean;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      restaurantId: null,

      addItem: (item) => {
        const state = get();
        const quantity = item.quantity || 1;
        
        // Check if we can add items from this restaurant
        if (state.restaurantId && state.restaurantId !== item.restaurantId) {
          throw new Error('Cannot add items from different restaurants');
        }

        const existingItemIndex = state.items.findIndex(
          (cartItem) => cartItem.id === item.id
        );

        if (existingItemIndex >= 0) {
          // Update existing item quantity
          const updatedItems = [...state.items];
          updatedItems[existingItemIndex].quantity += quantity;
          set({ items: updatedItems });
        } else {
          // Add new item
          const newItem: CartItem = {
            ...item,
            quantity,
          };
          set({
            items: [...state.items, newItem],
            restaurantId: item.restaurantId,
          });
        }
      },

      removeItem: (itemId) => {
        const state = get();
        const updatedItems = state.items.filter((item) => item.id !== itemId);
        set({
          items: updatedItems,
          restaurantId: updatedItems.length > 0 ? state.restaurantId : null,
        });
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }

        const state = get();
        const updatedItems = state.items.map((item) =>
          item.id === itemId ? { ...item, quantity } : item
        );
        set({ items: updatedItems });
      },

      clearCart: () => {
        set({ items: [], restaurantId: null });
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
      },

      canAddItem: (restaurantId) => {
        const state = get();
        return !state.restaurantId || state.restaurantId === restaurantId;
      },
    }),
    {
      name: 'bts-cart-storage',
    }
  )
);