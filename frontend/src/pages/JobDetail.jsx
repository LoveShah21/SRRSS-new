import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { jobsAPI, applicationsAPI } from '../services/api';

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isCandidate, isRecruiter, isAdmin } = useAuth();

  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await jobsAPI.get(id);
        setJob(res.data);

        if (isRecruiter || isAdmin) {
          try {
            const appsRes = await applicationsAPI.forJob(id);
            setApplications(appsRes.data.applications || appsRes.data || []);
          } catch (_) {}
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, isRecruiter, isAdmin]);

  const handleApply = async (e) => {
    e.preventDefault();
    setApplying(true);
    setError('');
    try {
      await applicationsAPI.apply({ jobId: id });
      setApplied(true);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Application failed');
    } finally {
      setApplying(false);
    }
  };

  const handleStatusChange = async (appId, status) => {
    try {
      await applicationsAPI.updateStatus(appId, { status });
      setApplications(prev => prev.map(a => a._id === appId ? { ...a, status } : a));
    } catch (err) {
      console.error(err);
    }
  };

  const handleRank = async () => {
    try {
      const res = await applicationsAPI.rank(id);
      const ranked = res.data.rankedApplications || res.data || [];
      if (ranked.length) setApplications(ranked);
    } catch (err) {
      console.error(err);
    }
  };

  const scoreClass = (score) => {
    if (score >= 75) return 'score-high';
    if (score >= 50) return 'score-mid';
    return 'score-low';
  };

  if (loading) {
    return <div className="loading-center"><div className="spinner spinner-lg" /></div>;
  }

  if (!job) {
    return (
      <div className="page">
        <div className="container">
          <div className="card empty-state">
            <h3>Job not found</h3>
            <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => navigate('/jobs')}>
              Back to Jobs
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <button className="btn btn-ghost" onClick={() => navigate('/jobs')} style={{ marginBottom: 16 }}>
          ← Back to Jobs
        </button>

        <div className="card fade-in" style={{ marginBottom: 24 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>{job.title}</h1>
              <div className="flex gap-md" style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                {job.department && <span>🏢 {job.department}</span>}
                <span>📍 {job.location || 'Remote'}</span>
                <span>💼 {job.employmentType || 'Full-time'}</span>
                {job.salaryRange && (
                  <span>💰 ${job.salaryRange.min?.toLocaleString()} – ${job.salaryRange.max?.toLocaleString()}</span>
                )}
              </div>
            </div>
            <span className={`badge ${job.status === 'open' ? 'badge-success' : 'badge-danger'}`}>
              {job.status}
            </span>
          </div>

          <div className="divider" />

          <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: 15 }}>
            {job.description}
          </div>

          {job.requiredSkills?.length > 0 && (
            <>
              <div className="divider" />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Required Skills
              </h3>
              <div className="tag-list">
                {job.requiredSkills.map(skill => <span key={skill} className="tag">{skill}</span>)}
              </div>
            </>
          )}

          {job.preferredSkills?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Preferred Skills
              </h3>
              <div className="tag-list">
                {job.preferredSkills.map(skill => <span key={skill} className="tag" style={{ opacity: 0.7 }}>{skill}</span>)}
              </div>
            </div>
          )}
        </div>

        {/* Apply Section for Candidates */}
        {isCandidate && job.status === 'open' && !applied && (
          <div className="card slide-up" style={{ animationDelay: '0.2s' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Apply for this Position</h2>

            {error && <div className="alert alert-error">{error}</div>}

            <div style={{ marginBottom: 16, padding: 16, background: 'var(--color-surface)', borderRadius: 8, fontSize: 14 }}>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>📄 Resume Required</p>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Make sure you have uploaded your resume in your{' '}
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit' }}
                >
                  Profile page
                </button>
                . Your profile will be used for this application.
              </p>
            </div>

            <form onSubmit={handleApply}>
              <button type="submit" className="btn btn-primary btn-lg" disabled={applying} style={{ marginTop: 20 }}>
                {applying ? <div className="spinner" /> : 'Submit Application'}
              </button>
            </form>
          </div>
        )}

        {applied && (
          <div className="alert alert-success" style={{ fontSize: 16 }}>
            ✅ Application submitted successfully! You'll be notified about updates.
          </div>
        )}

        {/* Applications table for Recruiters/Admin */}
        {(isRecruiter || isAdmin) && (
          <div className="card slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>
                Applications ({applications.length})
              </h2>
              <button className="btn btn-primary btn-sm" onClick={handleRank}>
                🤖 AI Rank Candidates
              </button>
            </div>

            {applications.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📮</div>
                <h3>No applications yet</h3>
                <p>Candidates haven't applied to this position yet.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>AI Score</th>
                      <th>Status</th>
                      <th>Applied</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map(app => (
                      <tr key={app._id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {app.candidateId?.firstName || 'Unknown'} {app.candidateId?.lastName || ''}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {app.candidateId?.email || ''}
                          </div>
                        </td>
                        <td>
                          {app.aiScore != null ? (
                            <div className={`score-circle ${scoreClass(app.aiScore)}`}>
                              {Math.round(app.aiScore)}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${
                            app.status === 'shortlisted' ? 'badge-success' :
                            app.status === 'rejected' ? 'badge-danger' :
                            app.status === 'interviewed' ? 'badge-info' :
                            'badge-warning'
                          }`}>
                            {app.status}
                          </span>
                        </td>
                        <td style={{ fontSize: 13 }}>
                          {new Date(app.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <div className="flex gap-sm">
                            <button className="btn btn-sm btn-secondary" onClick={() => handleStatusChange(app._id, 'shortlisted')}>
                              Shortlist
                            </button>
                            <button className="btn btn-sm btn-ghost" onClick={() => handleStatusChange(app._id, 'rejected')}>
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
