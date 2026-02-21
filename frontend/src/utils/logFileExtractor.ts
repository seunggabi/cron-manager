/**
 * Extract log file paths from command strings
 * Supports: >>, >, 2>>, 2>, &>
 */
export function extractLogFiles(command: string): string[] {
  const logFiles: string[] = [];

  // Match redirection operators followed by file paths
  // Handles: >> file, > file, 2>> file, 2> file, &> file
  const redirectionRegex = /(?:2>>|2>|>>|>|&>)\s*([^\s;&|]+)/g;

  let match;
  while ((match = redirectionRegex.exec(command)) !== null) {
    // Strip surrounding single/double quotes (from shellEscape)
    const filePath = match[1].trim().replace(/^['"]|['"]$/g, '');

    // Skip special redirections like /dev/null, /dev/stdout, /dev/stderr
    if (!filePath.startsWith('/dev/')) {
      logFiles.push(filePath);
    }
  }

  // Remove duplicates while preserving order
  return [...new Set(logFiles)];
}
