/**
 * Typed module-level store for cross-screen callbacks that can't go through
 * React Navigation params (which only accepts serialisable values).
 *
 * PinsScreen writes onPinsSelected before navigating to PinterestBrowserScreen
 * or BoardPinsScreen. Those screens call it when the user confirms their
 * selection, then navigate back.
 *
 * This avoids both:
 *   - Passing functions through nav params (triggers non-serialisable warnings,
 *     breaks deep-link and state-persistence scenarios)
 *   - Using `global` (no TypeScript types, pollutes the global namespace)
 */
export const pinscapeCallbackStore: {
  onPinsSelected: ((source: string, urls: string[]) => void) | null;
} = {
  onPinsSelected: null,
};
