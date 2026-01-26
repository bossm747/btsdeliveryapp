/**
 * WebSocket Connection Status Indicator
 * 
 * Shows real-time connection status with visual feedback for:
 * - Connected (green wifi icon)
 * - Connecting (yellow, pulsing)
 * - Reconnecting (orange with attempt count)
 * - Disconnected (gray)
 * - Error (red)
 */

import { Wifi, WifiOff, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WebSocketStatus } from "@/hooks/use-websocket";

interface WebSocketStatusIndicatorProps {
  /** Current WebSocket status */
  status: WebSocketStatus;
  /** Whether authenticated */
  isAuthenticated?: boolean;
  /** Current reconnection attempt (0 if not reconnecting) */
  reconnectAttempt?: number;
  /** Show text label */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

export function WebSocketStatusIndicator({
  status,
  isAuthenticated = false,
  reconnectAttempt = 0,
  showLabel = false,
  className,
  size = 'sm',
}: WebSocketStatusIndicatorProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const iconSize = sizeClasses[size];

  const getStatusConfig = () => {
    if (status === 'authenticated' || (status === 'connected' && isAuthenticated)) {
      return {
        icon: <Wifi className={cn(iconSize, 'text-green-500')} />,
        label: 'Live updates active',
        color: 'text-green-500',
        pulse: false,
      };
    }

    if (status === 'connected') {
      return {
        icon: <Wifi className={cn(iconSize, 'text-blue-500')} />,
        label: 'Connected',
        color: 'text-blue-500',
        pulse: false,
      };
    }

    if (status === 'connecting') {
      return {
        icon: <Loader2 className={cn(iconSize, 'text-yellow-500 animate-spin')} />,
        label: 'Connecting...',
        color: 'text-yellow-500',
        pulse: true,
      };
    }

    if (status === 'disconnected' && reconnectAttempt > 0) {
      return {
        icon: <WifiOff className={cn(iconSize, 'text-orange-500')} />,
        label: `Reconnecting (${reconnectAttempt})...`,
        color: 'text-orange-500',
        pulse: true,
      };
    }

    if (status === 'error') {
      return {
        icon: <AlertCircle className={cn(iconSize, 'text-red-500')} />,
        label: 'Connection error',
        color: 'text-red-500',
        pulse: false,
      };
    }

    // Disconnected
    return {
      icon: <WifiOff className={cn(iconSize, 'text-gray-400')} />,
      label: 'Offline',
      color: 'text-gray-400',
      pulse: false,
    };
  };

  const config = getStatusConfig();

  return (
    <div 
      className={cn(
        'flex items-center gap-1.5',
        config.pulse && 'animate-pulse',
        className
      )}
      title={config.label}
    >
      {config.icon}
      {showLabel && (
        <span className={cn('text-xs font-medium', config.color)}>
          {config.label}
        </span>
      )}
    </div>
  );
}

/**
 * Inline connection status banner for showing in page content
 */
interface ConnectionBannerProps {
  status: WebSocketStatus;
  isAuthenticated?: boolean;
  reconnectAttempt?: number;
  className?: string;
}

export function ConnectionBanner({
  status,
  isAuthenticated = false,
  reconnectAttempt = 0,
  className,
}: ConnectionBannerProps) {
  // Don't show banner if connected and authenticated
  if (status === 'authenticated' || (status === 'connected' && isAuthenticated)) {
    return null;
  }

  const getBannerConfig = () => {
    if (status === 'connecting') {
      return {
        message: 'Connecting to real-time updates...',
        bgColor: 'bg-yellow-50 border-yellow-200',
        textColor: 'text-yellow-800',
        icon: <Loader2 className="w-4 h-4 animate-spin text-yellow-600" />,
      };
    }

    if (status === 'disconnected' && reconnectAttempt > 0) {
      return {
        message: `Reconnecting... (attempt ${reconnectAttempt})`,
        bgColor: 'bg-orange-50 border-orange-200',
        textColor: 'text-orange-800',
        icon: <WifiOff className="w-4 h-4 text-orange-600" />,
      };
    }

    if (status === 'error') {
      return {
        message: 'Connection error. Using polling for updates.',
        bgColor: 'bg-red-50 border-red-200',
        textColor: 'text-red-800',
        icon: <AlertCircle className="w-4 h-4 text-red-600" />,
      };
    }

    if (status === 'disconnected') {
      return {
        message: 'Real-time updates unavailable. Using polling.',
        bgColor: 'bg-gray-50 border-gray-200',
        textColor: 'text-gray-700',
        icon: <WifiOff className="w-4 h-4 text-gray-500" />,
      };
    }

    return null;
  };

  const config = getBannerConfig();
  if (!config) return null;

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm',
      config.bgColor,
      config.textColor,
      className
    )}>
      {config.icon}
      <span>{config.message}</span>
    </div>
  );
}

export default WebSocketStatusIndicator;
