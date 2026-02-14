import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { CronJob, CreateJobRequest, UpdateJobRequest } from '@cron-manager/shared';

interface JobFormProps {
  job?: CronJob | null;
  onClose: () => void;
  onSubmit: (data: CreateJobRequest | UpdateJobRequest) => Promise<void>;
}

export function JobForm({ job, onClose, onSubmit }: JobFormProps) {
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
    { label: '매분', value: '* * * * *' },
    { label: '5분마다', value: '*/5 * * * *' },
    { label: '매시간', value: '0 * * * *' },
    { label: '매일 0시', value: '0 0 * * *' },
    { label: '매일 9시', value: '0 9 * * *' },
    { label: '평일 9시', value: '0 9 * * 1-5' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{job ? '작업 수정' : '새 Cron 작업'}</h2>
          <button onClick={onClose} className="modal-close" aria-label="폼 닫기">
            <X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* 환경변수 */}
          <div className="field">
            <label className="field-label">환경변수 (선택사항)</label>
            <textarea
              value={env}
              onChange={(e) => setEnv(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="NODE_ENV=production&#10;PATH=/usr/local/bin:/usr/bin&#10;API_KEY=your-key"
              className="mono"
              rows={3}
            />
            <span className="field-hint">한 줄에 하나씩 KEY=VALUE 형식으로 입력</span>
          </div>

          <div className="divider"></div>

          {/* 스케줄 타임 */}
          <div className="field">
            <label className="field-label">
              스케줄 타임 (Cron 표현식) <span className="required">*</span>
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
            <span className="field-hint">분 시 일 월 요일 (예: 0 9 * * * = 매일 9시)</span>
          </div>

          <div className="divider"></div>

          {/* 실행 명령어 */}
          <div className="field">
            <label className="field-label">
              실행 명령어 <span className="required">*</span>
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
            <label className="field-label">작업 이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="백업 작업"
            />
          </div>

          <div className="divider"></div>

          {/* 설명 */}
          <div className="field">
            <label className="field-label">설명 (선택사항)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="이 작업은 매일 데이터베이스 백업을 수행합니다"
              rows={2}
            />
            <span className="field-hint">crontab 파일에 주석으로 저장됩니다</span>
          </div>

          <div className="divider"></div>

          {/* 로그 파일 */}
          <div className="field">
            <label className="field-label">로그 파일 경로 (자동 파싱)</label>
            <input
              type="text"
              value={logFile}
              readOnly
              placeholder="명령어에서 >> 뒤 경로 자동 파싱"
              className="mono"
              style={{
                background: 'var(--surface)',
                cursor: 'not-allowed',
                opacity: 0.7
              }}
            />
            <span className="field-hint">명령어에 &gt;&gt; /path/to/log.txt 형식으로 작성하면 자동으로 파싱됩니다</span>
          </div>
        </form>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn">
            취소
          </button>
          <button type="submit" onClick={handleSubmit} className="btn btn-primary">
            {job ? '수정 완료' : '작업 추가'}
          </button>
        </div>
      </div>
    </div>
  );
}
