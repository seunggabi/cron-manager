import { describe, it, expect } from 'vitest';
import { extractScriptPath } from '../../utils/scriptPathExtractor';

describe('scriptPathExtractor', () => {
  describe('extractScriptPath', () => {
    it('extracts script path from node command', () => {
      const command = 'node /app/index.js';
      const result = extractScriptPath(command);
      expect(result).toBe('/app/index.js');
    });

    it('extracts script path from python3 command', () => {
      const command = 'python3 /usr/local/scripts/backup.py';
      const result = extractScriptPath(command);
      expect(result).toBe('/usr/local/scripts/backup.py');
    });

    it('extracts script path from python command', () => {
      const command = 'python /scripts/data-processor.py';
      const result = extractScriptPath(command);
      expect(result).toBe('/scripts/data-processor.py');
    });

    it('extracts script path from bash command', () => {
      const command = 'bash /home/user/deploy.sh';
      const result = extractScriptPath(command);
      expect(result).toBe('/home/user/deploy.sh');
    });

    it('extracts script path from sh command', () => {
      const command = 'sh /bin/startup.sh';
      const result = extractScriptPath(command);
      expect(result).toBe('/bin/startup.sh');
    });

    it('extracts script path from php command', () => {
      const command = 'php /var/www/cron/process.php';
      const result = extractScriptPath(command);
      expect(result).toBe('/var/www/cron/process.php');
    });

    it('extracts script path from ruby command', () => {
      const command = 'ruby /opt/scripts/cleanup.rb';
      const result = extractScriptPath(command);
      expect(result).toBe('/opt/scripts/cleanup.rb');
    });

    it('extracts script path from perl command', () => {
      const command = 'perl /scripts/legacy.pl';
      const result = extractScriptPath(command);
      expect(result).toBe('/scripts/legacy.pl');
    });

    it('extracts direct script path without interpreter', () => {
      const command = '/usr/local/bin/backup.sh';
      const result = extractScriptPath(command);
      expect(result).toBe('/usr/local/bin/backup.sh');
    });

    it('extracts relative script path', () => {
      const command = './scripts/deploy.sh';
      const result = extractScriptPath(command);
      expect(result).toBe('./scripts/deploy.sh');
    });

    it('extracts script path from command with arguments', () => {
      const command = 'node /app/script.js --env=production --verbose';
      const result = extractScriptPath(command);
      expect(result).toBe('/app/script.js');
    });

    it('removes single quotes from script path', () => {
      const command = "node '/app/my script.js'";
      const result = extractScriptPath(command);
      expect(result).toBe('/app/my script.js');
    });

    it('removes double quotes from script path', () => {
      const command = 'python3 "/usr/local/my script.py"';
      const result = extractScriptPath(command);
      expect(result).toBe('/usr/local/my script.py');
    });

    it('extracts first path segment from complex command', () => {
      const command = '/bin/backup.sh >> /var/log/backup.log 2>&1';
      const result = extractScriptPath(command);
      expect(result).toBe('/bin/backup.sh');
    });

    it('handles relative paths with ../', () => {
      const command = 'bash ../scripts/deploy.sh';
      const result = extractScriptPath(command);
      expect(result).toBe('../scripts/deploy.sh');
    });

    it('extracts binary command without path', () => {
      const command = 'echo "Hello World"';
      const result = extractScriptPath(command);
      expect(result).toBe('echo');
    });

    it('returns null for empty command', () => {
      const result = extractScriptPath('');
      expect(result).toBe(null);
    });
  });
});
