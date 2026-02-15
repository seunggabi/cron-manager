import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Edit, X, Check, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { useAlertDialog } from './AlertDialog';
import { ConfirmDialog } from './ConfirmDialog';

const api = window.electronAPI;

interface EnvVar {
  key: string;
  value: string;
}

type SortField = 'key' | 'value';
type SortDirection = 'asc' | 'desc';

export function GlobalEnvSettings() {
  const { t } = useTranslation();
  const { showAlert } = useAlertDialog();
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('key');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [confirmDelete, setConfirmDelete] = useState<{ key: string } | null>(null);

  const fetchGlobalEnv = async () => {
    setLoading(true);
    try {
      const response = await api.env.getGlobal();

      if (response.success && response.data) {
        const vars = Object.entries(response.data).map(([key, value]) => ({
          key,
          value: value as string,
        }));
        setEnvVars(vars);
      } else {
        showAlert(response.error || t('errors.loadEnvFailed'), 'error');
      }
    } catch (error) {
      showAlert(t('errors.loadEnvFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalEnv();
  }, []);

  const handleAdd = async () => {
    if (!newKey.trim()) {
      showAlert(t('errors.enterKey'), 'error');
      return;
    }

    try {
      const response = await api.env.updateGlobalVar(newKey, newValue);
      if (response.success) {
        setNewKey('');
        setNewValue('');
        await fetchGlobalEnv();
      } else {
        showAlert(response.error || t('errors.addEnvFailed'), 'error');
      }
    } catch (error) {
      showAlert(t('errors.addEnvFailed'), 'error');
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
        showAlert(response.error || t('errors.updateEnvFailed'), 'error');
      }
    } catch (error) {
      showAlert(t('errors.updateEnvFailed'), 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;

    try {
      const response = await api.env.deleteGlobalVar(confirmDelete.key);
      if (response.success) {
        await fetchGlobalEnv();
      } else {
        showAlert(response.error || t('errors.deleteEnvFailed'), 'error');
      }
    } catch (error) {
      showAlert(t('errors.deleteEnvFailed'), 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  const startEdit = (key: string, value: string) => {
    setEditingKey(key);
    setEditValue(value);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedEnvVars = useMemo(() => {
    let filtered = envVars;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = envVars.filter(
        (envVar) =>
          envVar.key.toLowerCase().includes(query) ||
          envVar.value.toLowerCase().includes(query)
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      const aValue = a[sortField].toLowerCase();
      const bValue = b[sortField].toLowerCase();
      const comparison = aValue.localeCompare(bValue);
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [envVars, searchQuery, sortField, sortDirection]);

  if (loading && envVars.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
        <div style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Add New Variable */}
      <div className="table-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
          {t('env.newVar')}
        </h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder={t('env.table.keyPlaceholder')}
            className="mono"
            style={{ flex: 1 }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={t('env.table.valuePlaceholder')}
            className="mono"
            style={{ flex: 2 }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button onClick={handleAdd} className="btn btn-primary">
            <Plus />
            {t('common.add')}
          </button>
        </div>
      </div>

      {/* Search */}
      {envVars.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('env.searchPlaceholder')}
              style={{
                width: '100%',
                paddingLeft: '40px',
                fontSize: '13px',
              }}
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="btn"
              title={t('env.clearSearch')}
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Environment Variables List */}
      <div className="table-card">
        {envVars.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🔧</div>
            <div className="empty-text">{t('env.noVars')}</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="env-table">
              <thead>
                <tr>
                  <th>{t('common.actions')}</th>
                  <th onClick={() => handleSort('key')} style={{ cursor: 'pointer' }}>
                    {t('env.table.key')}
                    {sortField === 'key' && (
                      <span className="sort-icon">
                        {sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    )}
                  </th>
                  <th onClick={() => handleSort('value')} style={{ cursor: 'pointer' }}>
                    {t('env.table.value')}
                    {sortField === 'value' && (
                      <span className="sort-icon">
                        {sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedEnvVars.map((envVar) => (
                  <tr key={envVar.key}>
                    <td>
                      <div className="actions">
                        {editingKey === envVar.key ? (
                          <>
                            <button
                              onClick={() => handleUpdate(envVar.key)}
                              className="icon-btn play"
                              title={t('common.save')}
                              data-tooltip={t('common.save')}
                            >
                              <Check />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="icon-btn"
                              title={t('common.cancel')}
                              data-tooltip={t('common.cancel')}
                            >
                              <X />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(envVar.key, envVar.value)}
                              className="icon-btn edit"
                              title={t('common.edit')}
                              data-tooltip={t('common.edit')}
                            >
                              <Edit />
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ key: envVar.key })}
                              className="icon-btn delete"
                              title={t('common.delete')}
                              data-tooltip={t('common.delete')}
                            >
                              <Trash2 />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      <code className="schedule-code" style={{ background: 'var(--accent-light)', color: 'var(--accent)', borderColor: 'var(--accent)' }}>
                        {envVar.key}
                      </code>
                    </td>
                    <td>
                      {editingKey === envVar.key ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="mono"
                          style={{ width: '100%' }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdate(envVar.key);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                      ) : (
                        <code className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {envVar.value}
                        </code>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <ConfirmDialog
          isOpen={true}
          title={t('dialogs.deleteEnv', { key: confirmDelete.key })}
          message={t('dialogs.deleteEnvConfirm')}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
