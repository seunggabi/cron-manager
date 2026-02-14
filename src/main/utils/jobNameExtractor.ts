/**
 * Extract a meaningful job name from command string
 * Uses the last 2 directories + filename from the script path
 */
export function extractJobName(command: string): string {
  // Remove leading/trailing whitespace
  command = command.trim();

  // Try to extract script path from common patterns
  let scriptPath: string | null = null;

  // Pattern 1: node/python/bash script.js
  // Match: /path/to/node /path/to/script.js [args]
  const interpreterMatch = command.match(/(?:node|python3?|bash|sh|php|ruby|perl)\s+([^\s]+)/);
  if (interpreterMatch) {
    scriptPath = interpreterMatch[1];
  }

  // Pattern 2: Direct script execution
  // Match: /path/to/script.sh [args]
  if (!scriptPath) {
    const directMatch = command.match(/^([^\s]+)/);
    if (directMatch) {
      scriptPath = directMatch[1];
    }
  }

  if (!scriptPath) {
    // Fallback: use first 50 characters of command
    return command.substring(0, 50);
  }

  // Remove any quotes
  scriptPath = scriptPath.replace(/['"]/g, '');

  // Split path by /
  const parts = scriptPath.split('/').filter(Boolean);

  if (parts.length === 0) {
    return command.substring(0, 50);
  }

  // Get last 2 directories + filename (or less if path is shorter)
  const depth = Math.min(3, parts.length); // 2 dirs + 1 file = 3
  const meaningfulParts = parts.slice(-depth);

  // Join with /
  let name = meaningfulParts.join('/');

  // Remove file extension for cleaner name
  name = name.replace(/\.(js|ts|py|sh|php|rb|pl)$/, '');

  return name;
}

/**
 * Extract script path from command
 */
export function extractScriptPath(command: string): string | null {
  const interpreterMatch = command.match(/(?:node|python3?|bash|sh|php|ruby|perl)\s+([^\s]+)/);
  if (interpreterMatch) {
    return interpreterMatch[1].replace(/['"]/g, '');
  }

  const directMatch = command.match(/^([^\s]+)/);
  if (directMatch) {
    return directMatch[1].replace(/['"]/g, '');
  }

  return null;
}
