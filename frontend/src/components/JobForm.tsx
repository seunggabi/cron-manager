import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { CronJob, CreateJobRequest, UpdateJobRequest } from '@cron-manager/shared';

interface JobFormProps {
  job?: CronJob | null;
  onClose: () => void;
  onSubmit: (data: CreateJobRequest | UpdateJobRequest) => Promise<void>;
}

export function JobForm({ job, onClose, onSubmit }: JobFormProps) {
  const { t } = useTranslation();
  const [schedule, setSchedule] = useState(job?.schedule || '');
  const [command, setCommand] = useState(job?.command || '');
  const [name, setName] = useState(job?.name || '');
  const [description, setDescription] = useState(job?.description || '');
  const [logFile, setLogFile] = useState(job?.logFile || '');
  const [env, setEnv] = useState(
    job?.env ? Object.entries(job.env).map(([k, v]) => `${k}=${v}`).join('\n') : ''
  );

  // Parse log file path from command (>> redirection)
  useEffect(() => {
    const match = command.match(/>>\s*([^\s&|;]+)/);
    if (match) {
      setLogFile(match[1]);
    }
  }, [command]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Parse environment variables
    const envObj: Record<string, string> = {};
    if (env.trim()) {
      env.split('\n').forEach(line => {
        const [key, ...valueParts] = line.trim().split('=');
        if (key) {
          envObj[key] = valueParts.join('=');
        }
      });
    }

    // Generate name from command if not provided
    let autoName = command;
    if (!name) {
      // Remove >> redirect part
      const beforeRedirect = command.split('>>')[0].trim();
      // Extract last 2 path segments
      const parts = beforeRedirect.split('/').filter((p: string) => p);
      autoName = parts.slice(-2).join('/');
    }

    onSubmit({
      name: name || autoName,
      description: description || undefined,
      schedule,
      command,
      logFile: logFile || undefined,
      env: Object.keys(envObj).length > 0 ? envObj : undefined,
    });
  };

  // Handle ESC key to close modal and Cmd+S to submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        const submitButton = document.querySelector('.modal-footer .btn-primary') as HTMLButtonElement;
        if (submitButton) {
          submitButton.style.transform = 'scale(0.95)';
          setTimeout(() => {
            submitButton.style.transform = '';
            submitButton.click();
          }, 100);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handle Ctrl/Cmd + Enter to submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      const form = e.currentTarget.closest('form');
      if (form) {
        form.requestSubmit();
      }
    }
  };

  // Preset schedules
  const presets = [
    { label: t('jobs.form.presets.everyMinute'), value: '* * * * *' },
    { label: t('jobs.form.presets.every5Minutes'), value: '*/5 * * * *' },
    { label: t('jobs.form.presets.hourly'), value: '0 * * * *' },
    { label: t('jobs.form.presets.daily'), value: '0 0 * * *' },
    { label: t('jobs.form.presets.daily9am'), value: '0 9 * * *' },
    { label: t('jobs.form.presets.weekdays9am'), value: '0 9 * * 1-5' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{job ? t('jobs.editJob') : t('jobs.newCronJob')}</h2>
          <button onClick={onClose} className="modal-close" aria-label={t('jobs.form.closeForm')}>
            <X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* 환경변수 */}
          <div className="field">
            <label className="field-label">{t('jobs.form.env')}</label>
            <textarea
              value={env}
              onChange={(e) => setEnv(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="NODE_ENV=production&#10;PATH=/usr/local/bin:/usr/bin&#10;API_KEY=your-key"
              className="mono"
              rows={3}
            />
            <span className="field-hint">{t('jobs.form.envPlaceholder')}</span>
          </div>

          <div className="divider"></div>

          {/* 스케줄 타임 */}
          <div className="field">
            <label className="field-label">
              {t('jobs.form.schedule')} <span className="required">{t('jobs.form.required')}</span>
            </label>
            <input
              type="text"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="* * * * *"
              className="mono"
              required
              autoFocus
            />
            <div className="presets">
              {presets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setSchedule(preset.value)}
                  className="preset"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <span className="field-hint">{t('jobs.form.schedulePlaceholder')}</span>
          </div>

          <div className="divider"></div>

          {/* 실행 명령어 */}
          <div className="field">
            <label className="field-label">
              {t('jobs.form.command')} <span className="required">{t('jobs.form.required')}</span>
            </label>
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="/usr/local/bin/backup.sh"
              className="mono"
              required
            />
          </div>

          <div className="divider"></div>

          {/* 작업 이름 */}
          <div className="field">
            <label className="field-label">{t('jobs.form.name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('jobs.form.namePlaceholder')}
            />
          </div>

          <div className="divider"></div>

          {/* 설명 */}
          <div className="field">
            <label className="field-label">{t('jobs.form.description')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('jobs.form.descriptionPlaceholder')}
              rows={2}
            />
            <span className="field-hint">{t('jobs.form.descriptionHelp')}</span>
          </div>

          <div className="divider"></div>

          {/* 로그 파일 */}
          <div className="field">
            <label className="field-label">{t('jobs.form.logFile')}</label>
            <input
              type="text"
              value={logFile}
              readOnly
              placeholder={t('jobs.form.logFileInfo')}
              className="mono"
              style={{
                background: 'var(--surface)',
                cursor: 'not-allowed',
                opacity: 0.7
              }}
            />
            <span className="field-hint">{t('jobs.form.logFileHelp')}</span>
          </div>
        </form>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn">
            {t('common.cancel')}
          </button>
          <button type="submit" onClick={handleSubmit} className="btn btn-primary">
            {job ? t('jobs.form.submitEdit') : t('jobs.form.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
