/**
 * Fraud Indicator Badge Component
 *
 * Displays visual indicators for fraud risk on orders and users.
 * Can be used inline with order lists, user profiles, etc.
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Shield,
  Info,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FraudIndicatorBadgeProps {
  riskScore?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  hasAlert?: boolean;
  alertCount?: number;
  flags?: Array<{ name: string; description: string }>;
  showScore?: boolean;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

interface FraudRiskBadgeProps {
  level: 'low' | 'medium' | 'high' | 'critical';
  score?: number;
  compact?: boolean;
}

// Simple risk level badge
export function FraudRiskBadge({ level, score, compact = false }: FraudRiskBadgeProps) {
  const config = {
    low: {
      bg: 'bg-green-100 dark:bg-green-900',
      text: 'text-green-800 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800',
      icon: ShieldCheck,
      label: 'Low Risk',
    },
    medium: {
      bg: 'bg-yellow-100 dark:bg-yellow-900',
      text: 'text-yellow-800 dark:text-yellow-300',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: Shield,
      label: 'Medium Risk',
    },
    high: {
      bg: 'bg-orange-100 dark:bg-orange-900',
      text: 'text-orange-800 dark:text-orange-300',
      border: 'border-orange-200 dark:border-orange-800',
      icon: ShieldAlert,
      label: 'High Risk',
    },
    critical: {
      bg: 'bg-red-100 dark:bg-red-900',
      text: 'text-red-800 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800',
      icon: ShieldX,
      label: 'Critical Risk',
    },
  };

  const { bg, text, border, icon: Icon, label } = config[level];

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('inline-flex items-center justify-center p-1 rounded', bg)}>
              <Icon className={cn('h-4 w-4', text)} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{label}{score !== undefined ? ` (${score})` : ''}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Badge className={cn('flex items-center gap-1 font-medium', bg, text, border, 'border')}>
      <Icon className="h-3 w-3" />
      <span>{label}</span>
      {score !== undefined && <span className="ml-1">({score})</span>}
    </Badge>
  );
}

// Comprehensive fraud indicator with popover details
export function FraudIndicatorBadge({
  riskScore = 0,
  riskLevel,
  hasAlert = false,
  alertCount = 0,
  flags = [],
  showScore = true,
  showDetails = true,
  size = 'md',
  onClick,
  className,
}: FraudIndicatorBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Determine risk level from score if not provided
  const level = riskLevel || (
    riskScore >= 75 ? 'critical' :
    riskScore >= 50 ? 'high' :
    riskScore >= 25 ? 'medium' :
    'low'
  );

  const config = {
    low: {
      bg: 'bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800',
      text: 'text-green-700 dark:text-green-300',
      icon: ShieldCheck,
      label: 'Low Risk',
    },
    medium: {
      bg: 'bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900 dark:hover:bg-yellow-800',
      text: 'text-yellow-700 dark:text-yellow-300',
      icon: Shield,
      label: 'Medium Risk',
    },
    high: {
      bg: 'bg-orange-100 hover:bg-orange-200 dark:bg-orange-900 dark:hover:bg-orange-800',
      text: 'text-orange-700 dark:text-orange-300',
      icon: ShieldAlert,
      label: 'High Risk',
    },
    critical: {
      bg: 'bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800',
      text: 'text-red-700 dark:text-red-300',
      icon: ShieldX,
      label: 'Critical Risk',
    },
  };

  const { bg, text, icon: Icon, label } = config[level];

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const badge = (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md font-medium transition-colors cursor-pointer',
        bg,
        text,
        sizeClasses[size],
        className
      )}
      onClick={onClick}
    >
      <Icon className={iconSizes[size]} />
      {showScore && <span>{riskScore}</span>}
      {hasAlert && alertCount > 0 && (
        <span className="flex items-center justify-center w-4 h-4 text-xs bg-red-500 text-white rounded-full">
          {alertCount > 9 ? '9+' : alertCount}
        </span>
      )}
    </div>
  );

  if (!showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>
            <p>{label} - Score: {riskScore}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{badge}</PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={cn('h-5 w-5', text)} />
              <span className="font-medium">{label}</span>
            </div>
            <span className="text-2xl font-bold">{riskScore}</span>
          </div>

          {/* Risk Score Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Risk Score</span>
              <span>{riskScore}/100</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all',
                  level === 'critical' ? 'bg-red-500' :
                  level === 'high' ? 'bg-orange-500' :
                  level === 'medium' ? 'bg-yellow-500' :
                  'bg-green-500'
                )}
                style={{ width: `${riskScore}%` }}
              />
            </div>
          </div>

          {/* Alert Count */}
          {hasAlert && alertCount > 0 && (
            <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm">
                {alertCount} active fraud {alertCount === 1 ? 'alert' : 'alerts'}
              </span>
            </div>
          )}

          {/* Flags */}
          {flags.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase">Risk Factors</p>
              <div className="space-y-1">
                {flags.slice(0, 3).map((flag, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <Info className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">
                      {flag.description || flag.name.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
                {flags.length > 3 && (
                  <p className="text-xs text-gray-400">
                    +{flags.length - 3} more factors
                  </p>
                )}
              </div>
            </div>
          )}

          {/* View Details Button */}
          {onClick && (
            <Button variant="outline" size="sm" className="w-full" onClick={onClick}>
              View Full Profile
              <ExternalLink className="h-3 w-3 ml-2" />
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Simple alert indicator for order lists
export function OrderFraudAlert({ hasAlert = false, severity = 'medium' }: { hasAlert: boolean; severity?: string }) {
  if (!hasAlert) return null;

  const config: Record<string, { bg: string; icon: typeof AlertTriangle }> = {
    low: { bg: 'text-blue-500', icon: Info },
    medium: { bg: 'text-yellow-500', icon: AlertTriangle },
    high: { bg: 'text-orange-500', icon: ShieldAlert },
    critical: { bg: 'text-red-500', icon: ShieldX },
  };

  const { bg, icon: Icon } = config[severity] || config.medium;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Icon className={cn('h-4 w-4', bg)} />
        </TooltipTrigger>
        <TooltipContent>
          <p>Fraud alert - {severity} severity</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Inline risk indicator for tables
export function InlineRiskIndicator({ score, showLabel = false }: { score: number; showLabel?: boolean }) {
  const level = score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low';

  const colors = {
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-orange-600',
    critical: 'text-red-600',
  };

  const bgColors = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all', bgColors[level])}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={cn('text-sm font-medium', colors[level])}>
        {showLabel ? `${score} (${level})` : score}
      </span>
    </div>
  );
}

export default FraudIndicatorBadge;
