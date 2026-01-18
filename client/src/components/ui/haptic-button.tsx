import * as React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { haptic, type HapticPattern } from "@/hooks/use-haptic";

export interface HapticButtonProps extends ButtonProps {
  /**
   * The haptic pattern to trigger on click
   * @default "light"
   */
  hapticPattern?: HapticPattern;
  /**
   * Disable haptic feedback for this button
   * @default false
   */
  disableHaptic?: boolean;
}

/**
 * HapticButton - A Button wrapper that provides haptic feedback on click.
 *
 * Automatically triggers vibration feedback when clicked on supported devices.
 * The haptic feedback respects the global haptic settings.
 *
 * @example
 * ```tsx
 * <HapticButton onClick={handleClick}>
 *   Add to Cart
 * </HapticButton>
 *
 * <HapticButton hapticPattern="success" onClick={handleSubmit}>
 *   Place Order
 * </HapticButton>
 *
 * <HapticButton hapticPattern="error" variant="destructive">
 *   Delete
 * </HapticButton>
 * ```
 */
const HapticButton = React.forwardRef<HTMLButtonElement, HapticButtonProps>(
  ({ hapticPattern = "light", disableHaptic = false, onClick, ...props }, ref) => {
    const handleClick = React.useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        // Trigger haptic feedback before the click handler
        if (!disableHaptic) {
          switch (hapticPattern) {
            case "light":
              haptic.light();
              break;
            case "medium":
              haptic.medium();
              break;
            case "heavy":
              haptic.heavy();
              break;
            case "success":
              haptic.success();
              break;
            case "error":
              haptic.error();
              break;
            case "selection":
              haptic.selection();
              break;
          }
        }

        // Call the original onClick handler
        onClick?.(event);
      },
      [hapticPattern, disableHaptic, onClick]
    );

    return <Button ref={ref} onClick={handleClick} {...props} />;
  }
);

HapticButton.displayName = "HapticButton";

export { HapticButton };

/**
 * Higher-order component to add haptic feedback to any button-like component
 */
export function withHaptic<P extends { onClick?: (e: React.MouseEvent) => void }>(
  WrappedComponent: React.ComponentType<P>,
  defaultPattern: HapticPattern = "light"
) {
  type HapticProps = P & { hapticPattern?: HapticPattern; disableHaptic?: boolean };

  const WithHapticComponent = React.forwardRef<HTMLElement, HapticProps>(
    (props, ref) => {
      const {
        hapticPattern = defaultPattern,
        disableHaptic = false,
        onClick,
        ...rest
      } = props;

      const handleClick = React.useCallback(
        (event: React.MouseEvent) => {
          if (!disableHaptic) {
            haptic[hapticPattern]?.();
          }
          onClick?.(event);
        },
        [hapticPattern, disableHaptic, onClick]
      );

      // Cast rest props back to the original type
      const componentProps = { ...rest, onClick: handleClick } as unknown as P;

      return <WrappedComponent ref={ref} {...componentProps} />;
    }
  );

  WithHapticComponent.displayName = `WithHaptic(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`;

  return WithHapticComponent;
}

/**
 * Hook to wrap an onClick handler with haptic feedback
 */
export function useHapticClick<T extends (...args: any[]) => void>(
  handler: T,
  pattern: HapticPattern = "light"
): T {
  return React.useCallback(
    ((...args: any[]) => {
      haptic[pattern]?.();
      return handler(...args);
    }) as T,
    [handler, pattern]
  );
}

export default HapticButton;
