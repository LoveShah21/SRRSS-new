import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { applicationsAPI } from '../services/api';

function isSafeUrl(url) {
  try {
    const u = new URL(url, 'http://example.com');
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(u.protocol);
  } catch {
    return false;
  }
}

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
      applied: 'badge-warning',
      shortlisted: 'badge-success',
      interview: 'badge-primary',
      rejected: 'badge-danger',
      hired: 'badge-success',
    };
    return map[status] || 'badge-neutral';
  };

  const scoreClass = (score) => {
    if (score >= 75) return 'high';
    if (score >= 50) return 'mid';
    return 'low';
  };

  const formatStatusLabel = (status) => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getStatusHistoryTrail = (statusHistory = []) => statusHistory
    .slice(-3)
    .map((entry) => formatStatusLabel(entry.status))
    .join(' → ');

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
                  <th>Location</th>
                  <th>Match Score</th>
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
                    <td>{app.jobId?.location || '—'}</td>
                    <td>
                      {app.matchScore != null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className={`score-circle ${app.matchScore >= 75 ? 'score-high' : app.matchScore >= 50 ? 'score-mid' : 'score-low'}`}>
                            {Math.round(app.matchScore)}
                          </div>
                          <div className="progress-bar" style={{ width: 80 }}>
                            <div className={`progress-fill ${scoreClass(app.matchScore)}`} style={{ width: `${app.matchScore}%` }} />
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Processing…</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${statusBadge(app.status)}`}>{app.status}</span>
                      {app.statusHistory?.length > 0 && (
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                          {getStatusHistoryTrail(app.statusHistory)}
                        </div>
                      )}
                      {app.statusHistory?.length > 0 && (
                        <div style={{ marginTop: 2, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                          Updated {new Date(app.statusHistory[app.statusHistory.length - 1].changedAt).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {new Date(app.appliedAt || app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {app.interview?.scheduledAt && (
                        <div style={{ marginTop: 6, color: 'var(--color-text-secondary)' }}>
                          Interview: {new Date(app.interview.scheduledAt).toLocaleString()}
                        </div>
                      )}
                      {app.interview?.link && isSafeUrl(app.interview.link) && (
                        <div style={{ marginTop: 4 }}>
                          <a
                            href={app.interview.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: 'var(--color-primary)', fontWeight: 600 }}
                          >
                            Join interview
                          </a>
                        </div>
                      )}
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
