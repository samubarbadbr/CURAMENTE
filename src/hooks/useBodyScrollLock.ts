import { useEffect } from 'react';

/**
 * Robust hook to lock background body and html scrolling when a modal or overlay is open.
 * Prevents scroll chaining and bounce on iOS Safari, Android Chrome, and desktop browsers.
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;

    // Save previous inline styles
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyTouchAction = document.body.style.touchAction;
    const prevOverscrollBehavior = document.body.style.overscrollBehavior;

    // Lock scrolling on document
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.touchAction = prevBodyTouchAction;
      document.body.style.overscrollBehavior = prevOverscrollBehavior;
    };
  }, [isLocked]);
}
