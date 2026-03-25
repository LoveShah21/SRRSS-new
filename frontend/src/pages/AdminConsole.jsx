import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

export default function AdminConsole() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    async function load() {
      try {
        const [dashRes, usersRes] = await Promise.all([
          adminAPI.dashboard(),
          adminAPI.users(),
        ]);
        setStats(dashRes.data);
        setUsers(usersRes.data.users || usersRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await adminAPI.updateRole(userId, { role: newRole });
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="loading-center"><div className="spinner spinner-lg" /></div>;
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header fade-in">
          <h1 className="page-title">Admin Console</h1>
          <p className="page-subtitle">System administration and user management</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-sm" style={{ marginBottom: 24 }}>
          {['overview', 'users'].map(t => (
            <button
              key={t}
              className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setTab(t)}
              style={{ textTransform: 'capitalize' }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === 'overview' && stats && (
          <div>
            <div className="grid-4" style={{ marginBottom: 32 }}>
              <div className="stat-card fade-in delay-1">
                <div className="stat-icon purple">👥</div>
                <div className="stat-content">
                  <h3>{stats.totalUsers || 0}</h3>
                  <p>Total Users</p>
                </div>
              </div>
              <div className="stat-card fade-in delay-2">
                <div className="stat-icon green">💼</div>
                <div className="stat-content">
                  <h3>{stats.totalJobs || 0}</h3>
                  <p>Job Postings</p>
                </div>
              </div>
              <div className="stat-card fade-in delay-3">
                <div className="stat-icon cyan">📋</div>
                <div className="stat-content">
                  <h3>{stats.totalApplications || 0}</h3>
                  <p>Applications</p>
                </div>
              </div>
              <div className="stat-card fade-in delay-4">
                <div className="stat-icon amber">🤖</div>
                <div className="stat-content">
                  <h3>{stats.aiProcessed || 0}</h3>
                  <p>AI Screened</p>
                </div>
              </div>
            </div>

            {/* Breakdown Cards */}
            <div className="grid-3">
              <div className="card fade-in delay-2">
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Users by Role</h3>
                {stats.usersByRole ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {Object.entries(stats.usersByRole).map(([role, count]) => (
                      <div key={role} className="flex items-center justify-between">
                        <span style={{ textTransform: 'capitalize', fontSize: 14 }}>{role}</span>
                        <span className="badge badge-primary">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Data unavailable</p>
                )}
              </div>
              <div className="card fade-in delay-3">
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Jobs by Status</h3>
                {stats.jobsByStatus ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {Object.entries(stats.jobsByStatus).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <span style={{ textTransform: 'capitalize', fontSize: 14 }}>{status}</span>
                        <span className={`badge ${status === 'open' ? 'badge-success' : status === 'closed' ? 'badge-danger' : 'badge-warning'}`}>{count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Data unavailable</p>
                )}
              </div>
              <div className="card fade-in delay-4">
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Applications by Status</h3>
                {stats.applicationsByStatus ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {Object.entries(stats.applicationsByStatus).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <span style={{ textTransform: 'capitalize', fontSize: 14 }}>{status}</span>
                        <span className={`badge ${
                          status === 'shortlisted' ? 'badge-success' :
                          status === 'rejected' ? 'badge-danger' :
                          'badge-warning'
                        }`}>{count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Data unavailable</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <div className="table-wrapper fade-in">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user._id}>
                    <td>
                      <div className="flex items-center gap-sm">
                        <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                          {(user.firstName?.[0] || '') + (user.lastName?.[0] || '')}
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {user.firstName} {user.lastName}
                        </span>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`badge ${
                        user.role === 'admin' ? 'badge-danger' :
                        user.role === 'recruiter' ? 'badge-primary' :
                        'badge-success'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <select
                        className="form-select"
                        value={user.role}
                        onChange={(e) => handleRoleChange(user._id, e.target.value)}
                        style={{ padding: '6px 10px', fontSize: 13, width: 'auto' }}
                      >
                        <option value="candidate">Candidate</option>
                        <option value="recruiter">Recruiter</option>
                        <option value="admin">Admin</option>
                      </select>
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
