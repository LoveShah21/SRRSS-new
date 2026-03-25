import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { applicationsAPI } from '../services/api';

export default function MyApplications() {
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applicationsAPI.myApplications()
      .then(res => setApps(res.data.applications || res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusBadge = (status) => {
    const map = {
      submitted: 'badge-warning',
      reviewed: 'badge-info',
      shortlisted: 'badge-success',
      rejected: 'badge-danger',
      interviewed: 'badge-primary',
      offered: 'badge-success',
      hired: 'badge-success',
    };
    return map[status] || 'badge-neutral';
  };

  const scoreClass = (score) => {
    if (score >= 75) return 'high';
    if (score >= 50) return 'mid';
    return 'low';
  };

  if (loading) {
    return <div className="loading-center"><div className="spinner spinner-lg" /></div>;
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header fade-in">
          <h1 className="page-title">My Applications</h1>
          <p className="page-subtitle">Track the status of all your job applications</p>
        </div>

        {apps.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="icon">📬</div>
              <h3>No applications yet</h3>
              <p>Browse the job board and apply to positions that interest you.</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/jobs')}>
                Browse Jobs
              </button>
            </div>
          </div>
        ) : (
          <div className="table-wrapper fade-in">
            <table>
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Department</th>
                  <th>AI Score</th>
                  <th>Status</th>
                  <th>Applied</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((app) => (
                  <tr key={app._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/jobs/${app.jobId?._id || app.jobId}`)}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {app.jobId?.title || 'Unknown Position'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        📍 {app.jobId?.location || 'Remote'}
                      </div>
                    </td>
                    <td>{app.jobId?.department || '—'}</td>
                    <td>
                      {app.aiScore != null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className={`score-circle ${app.aiScore >= 75 ? 'score-high' : app.aiScore >= 50 ? 'score-mid' : 'score-low'}`}>
                            {Math.round(app.aiScore)}
                          </div>
                          <div className="progress-bar" style={{ width: 80 }}>
                            <div className={`progress-fill ${scoreClass(app.aiScore)}`} style={{ width: `${app.aiScore}%` }} />
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Processing…</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${statusBadge(app.status)}`}>{app.status}</span>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
