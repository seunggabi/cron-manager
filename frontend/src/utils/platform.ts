export const isMac = navigator.platform.toUpperCase().includes('MAC');

/** Modifier key prefix for display: '⌘' on macOS, 'Ctrl+' on Windows/Linux */
export const modKey = isMac ? '⌘' : 'Ctrl+';
