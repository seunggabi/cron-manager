import { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, Edit, X, Check } from 'lucide-react';

const api = (window as any).electronAPI;

interface EnvVar {
  key: string;
  value: string;
}

export function GlobalEnvSettings() {
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const fetchGlobalEnv = async () => {
    setLoading(true);
    try {
      const response = await api.env.getGlobal();
      console.log('Global env response:', response);

      if (response.success && response.data) {
        console.log('Global env data:', response.data);
        const vars = Object.entries(response.data).map(([key, value]) => ({
          key,
          value: value as string,
        }));
        console.log('Parsed env vars:', vars);
        setEnvVars(vars);
      } else {
        console.error('Failed to get global env:', response.error);
        alert(response.error || '전역 환경변수를 불러오는데 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to fetch global env:', error);
      alert('전역 환경변수를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalEnv();
  }, []);

  const handleAdd = async () => {
    if (!newKey.trim()) {
      alert('키를 입력해주세요');
      return;
    }

    try {
      const response = await api.env.updateGlobalVar(newKey, newValue);
      if (response.success) {
        setNewKey('');
        setNewValue('');
        await fetchGlobalEnv();
      } else {
        alert(response.error || '환경변수 추가에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to add env var:', error);
      alert('환경변수 추가에 실패했습니다');
    }
  };

  const handleUpdate = async (key: string) => {
    try {
      const response = await api.env.updateGlobalVar(key, editValue);
      if (response.success) {
        setEditingKey(null);
        setEditValue('');
        await fetchGlobalEnv();
      } else {
        alert(response.error || '환경변수 수정에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to update env var:', error);
      alert('환경변수 수정에 실패했습니다');
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm(`"${key}" 환경변수를 삭제하시겠습니까?`)) return;

    try {
      const response = await api.env.deleteGlobalVar(key);
      if (response.success) {
        await fetchGlobalEnv();
      } else {
        alert(response.error || '환경변수 삭제에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to delete env var:', error);
      alert('환경변수 삭제에 실패했습니다');
    }
  };

  const startEdit = (key: string, value: string) => {
    console.log('[startEdit] key:', key, 'value:', value);
    setEditingKey(key);
    setEditValue(value);
    console.log('[startEdit] editingKey set to:', key);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
  };

  if (loading && envVars.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-gray-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">전역 환경변수</h2>
          <p className="text-sm text-gray-600 mt-1">
            모든 Cron 작업에 적용되는 환경변수를 관리합니다
          </p>
        </div>
        <button
          onClick={fetchGlobalEnv}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          새로고침
        </button>
      </div>

      {/* Add New Variable */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">새 환경변수 추가</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="KEY"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          />
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="VALUE"
            className="flex-[2] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            추가
          </button>
        </div>
      </div>

      {/* Environment Variables List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {envVars.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">등록된 전역 환경변수가 없습니다</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {envVars.map((envVar) => (
                  <tr key={envVar.key} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="px-3 py-1 bg-blue-50 text-blue-700 rounded text-sm font-mono font-semibold">
                        {envVar.key}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      {editingKey === envVar.key ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                          autoFocus
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') handleUpdate(envVar.key);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                      ) : (
                        <code className="text-sm font-mono text-gray-700">
                          {envVar.value}
                        </code>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editingKey === envVar.key ? (
                          <>
                            <button
                              onClick={() => handleUpdate(envVar.key)}
                              className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                              title="저장"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                              title="취소"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(envVar.key, envVar.value)}
                              className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                              title="수정"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(envVar.key)}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
