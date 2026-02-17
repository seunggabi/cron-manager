import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Edit, X, Check, Search, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
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
  const [editing, setEditing] = useState<{ key: string; field: 'key' | 'value' } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [confirmDelete, setConfirmDelete] = useState<{ key: string } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

  const handleSave = async () => {
    if (!editing) return;
    const { key: originalKey, field } = editing;
    const trimmedValue = editValue.trim();

    if (!trimmedValue) {
      showAlert(field === 'key' ? t('errors.enterKey') : t('errors.enterValue'), 'error');
      return;
    }

    const envVar = envVars.find(v => v.key === originalKey);
    if (!envVar) return;

    if (field === 'value') {
      if (trimmedValue === envVar.value) {
        setEditing(null);
        setEditValue('');
        return;
      }
      try {
        const response = await api.env.updateGlobalVar(originalKey, trimmedValue);
        if (response.success) {
          setEditing(null);
          setEditValue('');
          await fetchGlobalEnv();
        } else {
          showAlert(response.error || t('errors.updateEnvFailed'), 'error');
        }
      } catch (error) {
        showAlert(t('errors.updateEnvFailed'), 'error');
      }
    } else {
      // Renaming key
      if (trimmedValue === originalKey) {
        setEditing(null);
        setEditValue('');
        return;
      }
      if (!/^[A-Z_][A-Z0-9_]*$/i.test(trimmedValue)) {
        showAlert('Invalid key format (A-Z, 0-9, _)', 'error');
        return;
      }
      if (envVars.some(v => v.key === trimmedValue && v.key !== originalKey)) {
        showAlert('Key already exists', 'error');
        return;
      }
      try {
        const envObj: Record<string, string> = {};
        envVars.forEach(v => {
          if (v.key === originalKey) {
            envObj[trimmedValue] = v.value;
          } else {
            envObj[v.key] = v.value;
          }
        });
        const response = await api.env.setGlobal(envObj);
        if (response.success) {
          setEditing(null);
          setEditValue('');
          await fetchGlobalEnv();
        } else {
          showAlert(response.error || t('errors.updateEnvFailed'), 'error');
        }
      } catch (error) {
        showAlert(t('errors.updateEnvFailed'), 'error');
      }
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

  const startEdit = (key: string, field: 'key' | 'value') => {
    const envVar = envVars.find(v => v.key === key);
    if (!envVar) return;
    setEditing({ key, field });
    setEditValue(field === 'key' ? envVar.key : envVar.value);
  };

  const cancelEdit = () => {
    setEditing(null);
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

  // Reorder helpers
  const saveEnvOrder = async (newEnvVars: EnvVar[]) => {
    try {
      const envObj: Record<string, string> = {};
      newEnvVars.forEach(v => { envObj[v.key] = v.value; });
      const response = await api.env.setGlobal(envObj);
      if (response.success) {
        setEnvVars(newEnvVars);
        setSortField(null);
      } else {
        showAlert(response.error || t('errors.updateEnvFailed'), 'error');
      }
    } catch (error) {
      showAlert(t('errors.updateEnvFailed'), 'error');
    }
  };

  const handleMoveUp = (displayIndex: number) => {
    if (displayIndex <= 0) return;
    const currentList = [...filteredAndSortedEnvVars];
    [currentList[displayIndex - 1], currentList[displayIndex]] =
      [currentList[displayIndex], currentList[displayIndex - 1]];
    saveEnvOrder(currentList);
  };

  const handleMoveDown = (displayIndex: number) => {
    if (displayIndex >= filteredAndSortedEnvVars.length - 1) return;
    const currentList = [...filteredAndSortedEnvVars];
    [currentList[displayIndex], currentList[displayIndex + 1]] =
      [currentList[displayIndex + 1], currentList[displayIndex]];
    saveEnvOrder(currentList);
  };

  // Drag and drop
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const currentList = [...filteredAndSortedEnvVars];
    const [removed] = currentList.splice(dragIndex, 1);
    currentList.splice(index, 0, removed);
    setDragIndex(null);
    setDragOverIndex(null);
    saveEnvOrder(currentList);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const isSearchActive = searchQuery.trim().length > 0;

  const filteredAndSortedEnvVars = useMemo(() => {
    let filtered = envVars;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = envVars.filter(
        (envVar) =>
          envVar.key.toLowerCase().includes(query) ||
          envVar.value.toLowerCase().includes(query)
      );
    }

    if (sortField) {
      const sorted = [...filtered].sort((a, b) => {
        const aValue = a[sortField].toLowerCase();
        const bValue = b[sortField].toLowerCase();
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? comparison : -comparison;
      });
      return sorted;
    }

    return filtered;
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
                  <th style={{ width: '24px', minWidth: '24px', textAlign: 'center', padding: '0' }}></th>
                  <th style={{ textAlign: 'center' }}>{t('common.actions')}</th>
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
                {filteredAndSortedEnvVars.map((envVar, index) => (
                  <tr
                    key={envVar.key}
                    draggable={!isSearchActive}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    style={{
                      opacity: dragIndex === index ? 0.4 : 1,
                      borderTop: dragOverIndex === index && dragIndex !== null && dragIndex > index
                        ? '2px solid var(--accent)' : undefined,
                      borderBottom: dragOverIndex === index && dragIndex !== null && dragIndex < index
                        ? '2px solid var(--accent)' : undefined,
                    }}
                  >
                    <td style={{ textAlign: 'center', padding: '4px' }}>
                      {!isSearchActive && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0px' }}>
                          <button
                            onClick={() => handleMoveUp(index)}
                            className="icon-btn"
                            style={{ width: '16px', height: '14px', padding: '0', opacity: index === 0 ? 0.3 : 1 }}
                            disabled={index === 0}
                            title={t('common.moveUp')}
                          >
                            <ChevronUp size={12} />
                          </button>
                          <GripVertical size={12} className="drag-handle" style={{ cursor: 'grab' }} />
                          <button
                            onClick={() => handleMoveDown(index)}
                            className="icon-btn"
                            style={{ width: '16px', height: '14px', padding: '0', opacity: index === filteredAndSortedEnvVars.length - 1 ? 0.3 : 1 }}
                            disabled={index === filteredAndSortedEnvVars.length - 1}
                            title={t('common.moveDown')}
                          >
                            <ChevronDown size={12} />
                          </button>
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="actions">
                        {editing?.key === envVar.key ? (
                          <>
                            <button
                              onClick={handleSave}
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
                              onClick={() => startEdit(envVar.key, 'value')}
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
                      {editing?.key === envVar.key && editing?.field === 'key' ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="mono"
                          style={{
                            width: '100%',
                            padding: '4px 8px',
                            border: '1.5px solid var(--accent)',
                            borderRadius: 'var(--radius)',
                            fontSize: '12px',
                          }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                      ) : (
                        <code
                          className="schedule-code"
                          style={{
                            background: 'var(--accent-light)',
                            color: 'var(--accent)',
                            borderColor: 'var(--accent)',
                            cursor: 'pointer',
                          }}
                          onDoubleClick={() => startEdit(envVar.key, 'key')}
                        >
                          {envVar.key}
                        </code>
                      )}
                    </td>
                    <td>
                      {editing?.key === envVar.key && editing?.field === 'value' ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="mono"
                          style={{ width: '100%' }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                      ) : (
                        <code
                          className="mono"
                          style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            wordBreak: 'break-all',
                            whiteSpace: 'pre-wrap',
                            overflowWrap: 'anywhere',
                            cursor: 'pointer',
                          }}
                          onDoubleClick={() => startEdit(envVar.key, 'value')}
                        >
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
