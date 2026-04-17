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
  const [statusFilter, setStatusFilter] = useState('upcoming');

  useEffect(() => {
    loadInterviews();
  }, []);

  async function loadInterviews() {
    try {
      const res = await interviewsAPI.list({ limit: 200 });
      const all = res.data.interviews || [];
      all.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
      setInterviews(all);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load interviews');
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status) => {
    const map = { scheduled: 'badge-info', completed: 'badge-success', cancelled: 'badge-error', rescheduled: 'badge-warning', 'no-show': 'badge-error' };
    return map[status] || 'badge-neutral';
  };

  const formatInterviewDate = (iv) => {
    const timeZone = iv.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone,
    }).format(new Date(iv.scheduledAt));
  };

  const filteredInterviews = interviews.filter((iv) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'upcoming') return ['scheduled', 'rescheduled'].includes(iv.status);
    return iv.status === statusFilter;
  });

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

        <div className="flex gap-sm" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'all', label: 'All' },
            { key: 'completed', label: 'Completed' },
            { key: 'cancelled', label: 'Cancelled' },
          ].map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={`btn btn-sm ${statusFilter === filter.key ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="alert alert-error fade-in" style={{ marginBottom: 16 }}>❌ {error}</div>
        )}

        {filteredInterviews.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="icon">📅</div>
              <h3>No interviews found</h3>
              <p>No interviews match the selected status filter.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredInterviews.map((iv) => (
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
                      📅 {formatInterviewDate(iv)}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      {iv.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
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
                {iv.link && !isSafeUrl(iv.link) && (
                  <p style={{ marginTop: 8, fontSize: 13, color: 'var(--color-warning)' }}>
                    ⚠️ Meeting link is unavailable due to safety validation.
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
