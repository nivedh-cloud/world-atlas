/**
 * Safe Area Wrapper Component
 * Handles iOS/Android notches and system UI overlaps
 * Uses Capacitor's safe-area-inset CSS env variables
 */

import React from 'react';

interface SafeAreaWrapperProps {
  children: React.ReactNode;
  className?: string;
  applyPadding?: boolean; // Whether to apply safe area padding (default: true)
}

/**
 * SafeAreaWrapper Component
 * Wraps content with safe area awareness for mobile devices
 */
export const SafeAreaWrapper: React.FC<SafeAreaWrapperProps> = ({
  children,
  className = '',
  applyPadding = true,
}) => {
  return (
    <div
      className={`w-full h-full ${className}`}
      style={
        applyPadding
          ? {
              paddingTop: 'var(--safe-area-inset-top, 0)',
              paddingBottom: 'var(--safe-area-inset-bottom, 0)',
              paddingLeft: 'var(--safe-area-inset-left, 0)',
              paddingRight: 'var(--safe-area-inset-right, 0)',
            }
          : {}
      }
    >
      {children}
    </div>
  );
};

/**
 * Hook to get safe area insets
 * Useful for JS-based layout calculations
 */
export const useSafeAreaInsets = () => {
  const getInsets = () => {
    const root = document.documentElement;
    return {
      top: parseInt(getComputedStyle(root).getPropertyValue('--safe-area-inset-top')) || 0,
      bottom: parseInt(getComputedStyle(root).getPropertyValue('--safe-area-inset-bottom')) || 0,
      left: parseInt(getComputedStyle(root).getPropertyValue('--safe-area-inset-left')) || 0,
      right: parseInt(getComputedStyle(root).getPropertyValue('--safe-area-inset-right')) || 0,
    };
  };

  return getInsets();
};

export default SafeAreaWrapper;
