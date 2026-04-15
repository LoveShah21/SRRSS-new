import { useState, useEffect } from 'react';
import { interviewsAPI } from '../../services/api';

/**
 * Validate that a URL is safe to render as an href.
 */
function isSafeUrl(url) {
  try {
    const u = new URL(url, 'http://example.com');
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(u.protocol);
  } catch {
    return false;
  }
}

export default function MyInterviews() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInterviews();
  }, []);

  async function loadInterviews() {
    try {
      // Fetch upcoming interviews (scheduled + rescheduled) with a reasonable limit
      const res = await interviewsAPI.list({ status: 'scheduled', limit: 100 });
      const scheduled = res.data.interviews || [];
      // Also fetch rescheduled to include those
      const res2 = await interviewsAPI.list({ status: 'rescheduled', limit: 100 });
      const rescheduled = res2.data.interviews || [];
      setInterviews([...scheduled, ...rescheduled].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)));
    } catch {
      setError('Failed to load interviews');
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status) => {
    const map = { scheduled: 'badge-info', completed: 'badge-success', cancelled: 'badge-error', rescheduled: 'badge-warning', 'no-show': 'badge-error' };
    return map[status] || 'badge-neutral';
  };

  if (loading) {
    return <div className="loading-center"><div className="spinner spinner-lg" /></div>;
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header fade-in">
          <h1 className="page-title">My <span className="text-gradient">Interviews</span></h1>
          <p className="page-subtitle">View your upcoming interview schedule</p>
        </div>

        {error && (
          <div className="alert alert-error fade-in" style={{ marginBottom: 16 }}>❌ {error}</div>
        )}

        {interviews.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="icon">📅</div>
              <h3>No upcoming interviews</h3>
              <p>When a recruiter schedules an interview for you, it will appear here.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {interviews.map((iv) => (
              <div key={iv._id} className="card slide-up" style={{ padding: 20 }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                      {iv.jobId?.title || 'Interview'}
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      {iv.type} • {iv.duration} min
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge ${getStatusColor(iv.status)}`}>{iv.status}</span>
                    <p style={{ fontSize: 13, marginTop: 4, fontWeight: 600 }}>
                      📅 {new Date(iv.scheduledAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                {iv.link && isSafeUrl(iv.link) && (
                  <p style={{ marginTop: 12, fontSize: 14 }}>
                    🔗 Meeting link:{' '}
                    <a href={iv.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                      Join Interview
                    </a>
                  </p>
                )}
                {iv.notes && (
                  <p style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    📝 {iv.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
