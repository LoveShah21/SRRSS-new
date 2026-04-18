import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const APP_STATUS_COLORS = {
  applied: '#2563eb',
  shortlisted: '#0ea5e9',
  interview: '#f59e0b',
  hired: '#22c55e',
  rejected: '#ef4444',
};

export default function AdminConsole() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingRole, setEditingRole] = useState(null);

  useEffect(() => {
    loadUsers({ page: pagination.page });
  }, [pagination.page]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    setAnalyticsLoading(true);
    try {
      const res = await adminAPI.analytics();
      setAnalytics(res.data.analytics || null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load admin analytics.');
    } finally {
      setAnalyticsLoading(false);
    }
  }

  async function loadUsers(options = {}) {
    const page = options.page ?? pagination.page;
    const searchValue = options.searchValue ?? search;
    const roleValue = options.roleValue ?? roleFilter;

    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (searchValue) params.search = searchValue;
      if (roleValue) params.role = roleValue;
      const res = await adminAPI.users(params);
      setUsers(res.data.users || []);
      setPagination((prev) => ({ ...prev, ...res.data.pagination }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (e) => {
    e.preventDefault();
    if (pagination.page === 1) {
      loadUsers({ page: 1 });
    } else {
      setPagination((prev) => ({ ...prev, page: 1 }));
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setRoleFilter('');
    if (pagination.page === 1) {
      loadUsers({ page: 1, searchValue: '', roleValue: '' });
    } else {
      setPagination((prev) => ({ ...prev, page: 1 }));
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setError('');
    setSuccess('');
    try {
      await adminAPI.updateRole(userId, { role: newRole });
      setSuccess(`Role updated to ${newRole}`);
      setEditingRole(null);
      await Promise.all([
        loadUsers({ page: pagination.page }),
        loadAnalytics(),
      ]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update role');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
      await adminAPI.deleteUser(userId);
      setSuccess('User deleted');
      await Promise.all([
        loadUsers({ page: pagination.page }),
        loadAnalytics(),
      ]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const signupTrendData = analytics?.users?.signupsTrend || [];
  const jobStatusData = Object.entries(analytics?.jobs?.byStatus || {}).map(([status, count]) => ({ status, count }));
  const applicationFlowData = Object.entries(analytics?.applications?.byStatus || {}).map(([status, count]) => ({
    status,
    count,
  }));

  const totalUsers = analytics?.users?.total ?? pagination.total;
  const totalCandidates = analytics?.users?.candidates ?? users.filter((u) => u.role === 'candidate').length;
  const totalRecruiters = analytics?.users?.recruiters ?? users.filter((u) => u.role === 'recruiter').length;
  const totalAdmins = analytics?.users?.admins ?? users.filter((u) => u.role === 'admin').length;
  const totalJobs = analytics?.jobs?.total ?? 0;
  const activeJobs = analytics?.jobs?.open ?? 0;
  const totalApplications = analytics?.applications?.total ?? 0;

  return (
    <div className="page">
      <div className="container">
        <div className="page-header fade-in">
          <h1 className="page-title">
            <span className="text-gradient">Admin Console</span>
          </h1>
          <p className="page-subtitle">Manage users, roles, and system-level analytics</p>
        </div>

        {error && (
          <div className="alert alert-error fade-in" style={{ marginBottom: 16 }}>
            ❌ {error}
            <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
          </div>
        )}
        {success && (
          <div className="alert alert-success fade-in" style={{ marginBottom: 16 }}>
            ✅ {success}
            <button onClick={() => setSuccess('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
          </div>
        )}

        <div className="card slide-up" style={{ marginBottom: 24 }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label className="form-label">Search</label>
              <input
                className="form-input"
                placeholder="Email or name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ flex: '1 1 150px' }}>
              <label className="form-label">Role</label>
              <select
                className="form-input"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="candidate">Candidate</option>
                <option value="recruiter">Recruiter</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary btn-sm" style={{ height: 40 }}>
              🔍 Search
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleResetFilters}
              style={{ height: 40 }}
            >
              Reset
            </button>
          </form>
        </div>

        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="stat-card fade-in delay-1">
            <div className="stat-icon purple">👥</div>
            <div className="stat-content">
              <h3>{totalUsers}</h3>
              <p>Total Users</p>
            </div>
          </div>
          <div className="stat-card fade-in delay-2">
            <div className="stat-icon green">💼</div>
            <div className="stat-content">
              <h3>{activeJobs}</h3>
              <p>Active Jobs</p>
            </div>
          </div>
          <div className="stat-card fade-in delay-3">
            <div className="stat-icon cyan">📋</div>
            <div className="stat-content">
              <h3>{totalApplications}</h3>
              <p>Applications</p>
            </div>
          </div>
          <div className="stat-card fade-in delay-4">
            <div className="stat-icon amber">🛡️</div>
            <div className="stat-content">
              <h3>{totalAdmins}</h3>
              <p>Admins</p>
            </div>
          </div>
        </div>

        {!analyticsLoading && (
          <div className="grid-2" style={{ marginBottom: 24, gap: 16 }}>
            <div className="card slide-up">
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Overall Signups (30 days)</h2>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={signupTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis allowDecimals={false} tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                    <Tooltip
                      formatter={(value) => [`${value}`, 'Signups']}
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card slide-up">
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Total Active Jobs</h2>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={jobStatusData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="status" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                    <Tooltip formatter={(value) => [`${value}`, 'Jobs']} />
                    <Bar dataKey="count" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ marginTop: 10, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Total jobs: {totalJobs} • Active (open): {activeJobs}
              </div>
            </div>

            <div className="card slide-up" style={{ gridColumn: '1 / -1' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Application Flow</h2>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={applicationFlowData}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      label={({ status, count }) => `${status}: ${count}`}
                    >
                      {applicationFlowData.map((entry) => (
                        <Cell key={entry.status} fill={APP_STATUS_COLORS[entry.status] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}`, 'Applications']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-center"><div className="spinner spinner-lg" /></div>
        ) : users.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="icon">👤</div>
              <h3>No users found</h3>
              <p>Try adjusting your search or filters.</p>
            </div>
          </div>
        ) : (
          <div className="card slide-up" style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 8px', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left' }}>Email</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Role</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Joined</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 600 }}>
                      {user.profile?.firstName || '—'} {user.profile?.lastName || ''}
                    </td>
                    <td style={{ padding: '10px 8px', color: 'var(--color-text-secondary)' }}>
                      {user.email}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      {editingRole === user._id ? (
                        <select
                          className="form-input"
                          style={{ width: 120, fontSize: 13, padding: '4px 8px' }}
                          value={user.role}
                          onChange={(e) => handleRoleChange(user._id, e.target.value)}
                          onBlur={() => setEditingRole(null)}
                          autoFocus
                        >
                          <option value="candidate">Candidate</option>
                          <option value="recruiter">Recruiter</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span
                          className={`badge ${
                            user.role === 'admin' ? 'badge-error'
                              : user.role === 'recruiter' ? 'badge-info'
                                : 'badge-neutral'
                          }`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setEditingRole(user._id)}
                          title="Click to change role"
                        >
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDeleteUser(user._id)}
                        style={{ fontSize: 12, padding: '4px 10px' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between" style={{ marginTop: 20 }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={pagination.page <= 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            >
              ← Previous
            </button>
            <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
              Page {pagination.page} of {pagination.pages} ({pagination.total} total)
            </span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={pagination.page >= pagination.pages}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            >
              Next →
            </button>
          </div>
        )}

        {!analyticsLoading && (
          <div className="card" style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              <span>Users: {totalUsers}</span>
              <span>Candidates: {totalCandidates}</span>
              <span>Recruiters: {totalRecruiters}</span>
              <span>Admins: {totalAdmins}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
