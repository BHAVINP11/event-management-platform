/**
 * Breakpoints, mirrored from the literal px values used in `tokens.css`
 * media queries (plain CSS can't reference custom properties inside
 * `@media` conditions, so the numbers are kept in sync by hand here).
 * Use these only where a layout decision must be made in JS (e.g.
 * auto-closing a mobile drawer on resize) — prefer CSS media queries for
 * anything purely visual.
 */
export const BREAKPOINTS = {
  tablet: 640,
  desktop: 1024
} as const;
