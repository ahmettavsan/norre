/** "⌘" on Apple devices, "Ctrl" elsewhere – for shortcut hints. */
export const MOD_KEY =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
    ? '⌘'
    : 'Ctrl';
