import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../services/api';

export default function AdminConsole() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingRole, setEditingRole] = useState(null);

  useEffect(() => {
    loadUsers();
  }, [pagination.page]);

  async function loadUsers() {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: 20 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const res = await adminAPI.users(params);
      setUsers(res.data.users || []);
      setPagination(prev => ({ ...prev, ...res.data.pagination }));
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    loadUsers();
  };

  const handleRoleChange = async (userId, newRole) => {
    setError('');
    setSuccess('');
    try {
      await adminAPI.updateRole(userId, { role: newRole });
      setSuccess(`Role updated to ${newRole}`);
      setEditingRole(null);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update role');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
      await adminAPI.deleteUser(userId);
      setSuccess('User deleted');
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div className="page-header fade-in">
          <h1 className="page-title">
            <span className="text-gradient">Admin Console</span>
          </h1>
          <p className="page-subtitle">Manage users and system settings</p>
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

        {/* Filters */}
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
              onClick={() => { setSearch(''); setRoleFilter(''); setPagination(prev => ({ ...prev, page: 1 })); }}
              style={{ height: 40 }}
            >
              Reset
            </button>
          </form>
        </div>

        {/* Quick Stats */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="stat-card fade-in delay-1">
            <div className="stat-icon purple">👥</div>
            <div className="stat-content">
              <h3>{pagination.total}</h3>
              <p>Total Users</p>
            </div>
          </div>
          <div className="stat-card fade-in delay-2">
            <div className="stat-icon green">🎓</div>
            <div className="stat-content">
              <h3>{users.filter(u => u.role === 'candidate').length}</h3>
              <p>Candidates</p>
            </div>
          </div>
          <div className="stat-card fade-in delay-3">
            <div className="stat-icon cyan">💼</div>
            <div className="stat-content">
              <h3>{users.filter(u => u.role === 'recruiter').length}</h3>
              <p>Recruiters</p>
            </div>
          </div>
          <div className="stat-card fade-in delay-4">
            <div className="stat-icon amber">🔑</div>
            <div className="stat-content">
              <h3>{users.filter(u => u.role === 'admin').length}</h3>
              <p>Admins</p>
            </div>
          </div>
        </div>

        {/* User Table */}
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
                      {user.profile?.firstName} {user.profile?.lastName}
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
                            user.role === 'admin' ? 'badge-error' :
                            user.role === 'recruiter' ? 'badge-info' :
                            'badge-neutral'
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

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between" style={{ marginTop: 20 }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={pagination.page <= 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              ← Previous
            </button>
            <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
              Page {pagination.page} of {pagination.pages} ({pagination.total} total)
            </span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={pagination.page >= pagination.pages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
