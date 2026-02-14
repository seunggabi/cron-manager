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
