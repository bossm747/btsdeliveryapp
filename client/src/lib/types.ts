export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
  modifiers?: string;
  restaurantId: string;
  originalItemId?: string; // Reference to the base menu item
}

export interface DeliveryAddress {
  street: string;
  barangay: string;
  city: string;
  province: string;
  zipCode: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface OrderStatusStep {
  status: string;
  title: string;
  description: string;
  timestamp?: string;
  isCompleted: boolean;
  isActive: boolean;
}

export const ORDER_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed', 
  PREPARING: 'preparing',
  READY: 'ready',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
} as const;

export const PAYMENT_METHODS = {
  CASH: 'cash',
  GCASH: 'gcash',
  MAYA: 'maya',
  CARD: 'card'
} as const;
