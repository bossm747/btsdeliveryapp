/**
 * Custom hooks for the BTS Delivery app
 */

export { useToast, toast } from "./use-toast";
export { useIsMobile } from "./use-mobile";
export { usePullToRefresh } from "./use-pull-to-refresh";
export { useCustomerToast } from "./use-customer-toast";
export { useVendorToast } from "./use-vendor-toast";
export { useRiderToast } from "./use-rider-toast";
export { useAdminToast } from "./use-admin-toast";
export { 
  useWebSocket, 
  useOrderWebSocket, 
  useVendorWebSocket, 
  useRiderWebSocket,
  type WebSocketStatus,
  type WebSocketMessage,
  type OrderStatusUpdate,
  type RiderLocationUpdate,
  type VendorAlert,
  type ETAUpdate,
} from "./use-websocket";
