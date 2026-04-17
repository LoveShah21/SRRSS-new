import { useState, useEffect } from 'react';
import { auditLogsAPI } from '../../services/api';

function formatActionLabel(action = '') {
  return action
    .split('.')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' / ');
}

function formatMetadataValue(value) {
  if (value == null) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [filters, setFilters] = useState({ action: '', targetType: '', startDate: '', endDate: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    loadLogs();
  }, [pagination.page]);

  async function loadLogs() {
    setLoading(true);
    setError('');
    try {
      const params = { page: pagination.page, limit: 50 };
      if (filters.action) params.action = filters.action;
      if (filters.targetType) params.targetType = filters.targetType;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const res = await auditLogsAPI.list(params);
      setLogs(res.data.logs || []);
      setPagination(prev => ({ ...prev, ...res.data.pagination }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    loadLogs();
  };

  const actionIcons = {
    'application.statusChange': '📋',
    'interview.schedule': '📅',
    'interview.update': '✏️',
    'interview.cancel': '❌',
    'job.create': '💼',
    'job.update': '✏️',
    'user.roleChange': '👤',
  };

  return (
    <div className="page">
      <div className="container">
        <div className="page-header fade-in">
          <h1 className="page-title">
            Audit <span className="text-gradient">Logs</span>
          </h1>
          <p className="page-subtitle">Track all system actions and changes</p>
        </div>

        {error && (
          <div className="alert alert-error fade-in" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="card slide-up" style={{ marginBottom: 24 }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
            <div className="form-group" style={{ flex: '1 1 180px' }}>
              <label className="form-label">Action</label>
              <input className="form-input" placeholder="e.g. interview" value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })} />
            </div>
            <div className="form-group" style={{ flex: '1 1 150px' }}>
              <label className="form-label">Target Type</label>
              <select className="form-input" value={filters.targetType}
                onChange={(e) => setFilters({ ...filters, targetType: e.target.value })}>
                <option value="">All</option>
                <option value="application">Application</option>
                <option value="interview">Interview</option>
                <option value="job">Job</option>
                <option value="user">User</option>
                <option value="system">System</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: '1 1 150px' }}>
              <label className="form-label">From</label>
              <input type="date" className="form-input" value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
            </div>
            <div className="form-group" style={{ flex: '1 1 150px' }}>
              <label className="form-label">To</label>
              <input type="date" className="form-input" value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" style={{ height: 40 }}>
              🔍 Filter
            </button>
          </form>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner spinner-lg" /></div>
        ) : logs.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="icon">📜</div>
              <h3>No audit logs found</h3>
              <p>System actions will appear here.</p>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {logs.map((log) => (
                <div key={log._id} className="card" style={{ padding: '14px 20px' }}>
                  <div className="flex items-center justify-between">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 20 }}>{actionIcons[log.action] || '📌'}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          {formatActionLabel(log.action)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                          {log.action}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                          by {log.userId?.profile?.firstName} {log.userId?.profile?.lastName} ({log.userRole})
                          {log.targetType && ` • ${log.targetType}`}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      {new Date(log.createdAt).toLocaleString()}
                      {log.ipAddress && <div>{log.ipAddress}</div>}
                    </div>
                  </div>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--color-surface)', borderRadius: 6 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                        {Object.entries(log.metadata).map(([key, value]) => (
                          <div key={key} style={{ fontSize: 12 }}>
                            <div style={{ color: 'var(--color-text-secondary)' }}>{key}</div>
                            <div style={{ fontWeight: 600, wordBreak: 'break-word' }}>{formatMetadataValue(value)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {pagination.pages > 1 && (
              <div className="flex items-center justify-between" style={{ marginTop: 20 }}>
                <button className="btn btn-secondary btn-sm" disabled={pagination.page <= 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}>
                  ← Previous
                </button>
                <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button className="btn btn-secondary btn-sm" disabled={pagination.page >= pagination.pages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}>
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
