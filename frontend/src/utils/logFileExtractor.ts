/**
 * Unescape a shell-escaped path.
 * Handles single-quoted segments produced by shellEscapeForPath, e.g.:
 *   ~/'logs/test.log'  →  ~/logs/test.log
 *   '/var/log/app.log' →  /var/log/app.log
 */
function shellUnescapePath(str: string): string {
  let result = '';
  let i = 0;
  while (i < str.length) {
    if (str[i] === "'") {
      // Find the closing single quote and extract the content
      const end = str.indexOf("'", i + 1);
      if (end === -1) {
        // Unclosed quote: take remainder literally (minus the opening quote)
        result += str.slice(i + 1);
        break;
      }
      result += str.slice(i + 1, end);
      i = end + 1;
    } else {
      result += str[i];
      i++;
    }
  }
  return result;
}

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
    // Unescape shell-quoted path segments (e.g. ~/'logs/test.log' → ~/logs/test.log)
    const filePath = shellUnescapePath(match[1].trim());

    // Skip special redirections like /dev/null, /dev/stdout, /dev/stderr
    if (!filePath.startsWith('/dev/')) {
      logFiles.push(filePath);
    }
  }

  // Remove duplicates while preserving order
  return [...new Set(logFiles)];
}
