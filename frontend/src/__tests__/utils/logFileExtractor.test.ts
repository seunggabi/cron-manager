import { describe, it, expect } from 'vitest';
import { extractLogFiles } from '../../utils/logFileExtractor';

describe('logFileExtractor', () => {
  describe('extractLogFiles', () => {
    it('extracts log file from >> redirection', () => {
      const command = '/usr/local/bin/backup.sh >> /var/log/backup.log';
      const result = extractLogFiles(command);
      expect(result).toEqual(['/var/log/backup.log']);
    });

    it('extracts log file from > redirection', () => {
      const command = '/usr/local/bin/script.sh > /tmp/output.txt';
      const result = extractLogFiles(command);
      expect(result).toEqual(['/tmp/output.txt']);
    });

    it('extracts log file from 2>> redirection (stderr append)', () => {
      const command = 'node /app/script.js 2>> /var/log/error.log';
      const result = extractLogFiles(command);
      expect(result).toEqual(['/var/log/error.log']);
    });

    it('extracts log file from 2> redirection (stderr overwrite)', () => {
      const command = 'python3 script.py 2> /tmp/errors.txt';
      const result = extractLogFiles(command);
      expect(result).toEqual(['/tmp/errors.txt']);
    });

    it('extracts log file from &> redirection (both stdout and stderr)', () => {
      const command = './deploy.sh &> /var/log/deploy.log';
      const result = extractLogFiles(command);
      expect(result).toEqual(['/var/log/deploy.log']);
    });

    it('extracts log file from 2>&1 >> combined redirection', () => {
      const command = '/bin/script.sh 2>&1 >> /var/log/combined.log';
      const result = extractLogFiles(command);
      expect(result).toEqual(['/var/log/combined.log']);
    });

    it('returns empty array when no log file redirection present', () => {
      const command = '/usr/local/bin/backup.sh';
      const result = extractLogFiles(command);
      expect(result).toEqual([]);
    });

    it('skips /dev/null redirections', () => {
      const command = '/usr/local/bin/script.sh > /dev/null 2>&1';
      const result = extractLogFiles(command);
      expect(result).toEqual([]);
    });

    it('skips /dev/stdout and /dev/stderr redirections', () => {
      const command = 'echo "test" > /dev/stdout 2> /dev/stderr';
      const result = extractLogFiles(command);
      expect(result).toEqual([]);
    });

    it('extracts multiple log files from complex command', () => {
      const command = './script.sh > /var/log/output.log 2> /var/log/error.log';
      const result = extractLogFiles(command);
      expect(result).toEqual(['/var/log/output.log', '/var/log/error.log']);
    });

    it('removes duplicate log files while preserving order', () => {
      const command = 'cmd1 >> /var/log/app.log && cmd2 >> /var/log/app.log';
      const result = extractLogFiles(command);
      expect(result).toEqual(['/var/log/app.log']);
    });

    it('handles relative log file paths', () => {
      const command = './script.sh >> logs/output.log';
      const result = extractLogFiles(command);
      expect(result).toEqual(['logs/output.log']);
    });

    it('extracts log file from command with pipes and redirections', () => {
      const command = 'cat /tmp/data | grep error >> /var/log/filtered.log';
      const result = extractLogFiles(command);
      expect(result).toEqual(['/var/log/filtered.log']);
    });

    it('handles log file paths with special characters', () => {
      const command = './script.sh >> /var/log/app-2024.log';
      const result = extractLogFiles(command);
      expect(result).toEqual(['/var/log/app-2024.log']);
    });

    it('handles command with no whitespace after redirection operator', () => {
      const command = './script.sh >>/var/log/app.log';
      const result = extractLogFiles(command);
      expect(result).toEqual(['/var/log/app.log']);
    });

    it('handles empty command string', () => {
      const result = extractLogFiles('');
      expect(result).toEqual([]);
    });
  });
});
