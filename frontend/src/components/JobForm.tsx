import { useState } from 'react';
import { X } from 'lucide-react';
import type { CronJob } from '@cron-manager/shared';

interface JobFormProps {
  job?: CronJob | null;
  onClose: () => void;
  onSubmit: (data: any) => void;
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

    onSubmit({
      name: name || command.substring(0, 50),
      description: description || undefined,
      schedule,
      command,
      logFile: logFile || undefined,
      env: Object.keys(envObj).length > 0 ? envObj : undefined,
    });
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {job ? '작업 수정' : '새 Cron 작업'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 환경변수 (맨 위) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              환경변수 (선택사항)
            </label>
            <textarea
              value={env}
              onChange={(e) => setEnv(e.target.value)}
              placeholder="NODE_ENV=production&#10;PATH=/usr/local/bin:/usr/bin&#10;API_KEY=your-key"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
              rows={3}
            />
            <p className="mt-1 text-xs text-gray-500">
              한 줄에 하나씩 KEY=VALUE 형식으로 입력
            </p>
          </div>

          {/* 스케줄 타임 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              스케줄 타임 (Cron 표현식) *
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="* * * * *"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono"
                required
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setSchedule(preset.value)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              분 시 일 월 요일 (예: 0 9 * * * = 매일 9시)
            </p>
          </div>

          {/* 실행 명령어 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              실행 명령어 *
            </label>
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="/usr/local/bin/backup.sh"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
              required
            />
          </div>

          {/* 작업 이름 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              작업 이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="백업 작업"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {/* 설명 (주석) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              설명 (선택사항)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이 작업은 매일 데이터베이스 백업을 수행합니다"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={2}
            />
            <p className="mt-1 text-xs text-gray-500">
              crontab 파일에 주석으로 저장됩니다
            </p>
          </div>

          {/* 로그 파일 지정 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              로그 파일 경로 (선택사항)
            </label>
            <input
              type="text"
              value={logFile}
              onChange={(e) => setLogFile(e.target.value)}
              placeholder="/var/log/cron/backup.log"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
            />
            <p className="mt-1 text-xs text-gray-500">
              지정하지 않으면 로그가 저장되지 않습니다
            </p>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              {job ? '수정' : '추가'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
