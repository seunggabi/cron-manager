import { extractScriptPath } from '@cron-manager/shared/utils';

/**
 * Extract a meaningful job name from command string
 * Uses the last 2 directories + filename from the script path
 */
export function extractJobName(command: string): string {
  // Remove leading/trailing whitespace
  command = command.trim();

  // Try to extract script path from common patterns
  const scriptPath = extractScriptPath(command);

  if (!scriptPath) {
    // Fallback: use first 50 characters of command
    return command.substring(0, 50);
  }

  // Remove any quotes
  const cleanScriptPath = scriptPath.replace(/['"]/g, '');

  // Split path by /
  const parts = cleanScriptPath.split('/').filter(Boolean);

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

