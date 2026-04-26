import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { jobsAPI, applicationsAPI } from '../services/api';

function statusBadgeClass(status) {
  if (status === 'shortlisted' || status === 'hired') return 'badge-success';
  if (status === 'rejected') return 'badge-danger';
  if (status === 'interview') return 'badge-info';
  return 'badge-warning';
}

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isCandidate, isRecruiter, isAdmin } = useAuth();

  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [currentApplication, setCurrentApplication] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [jobStatusUpdating, setJobStatusUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [applicationsError, setApplicationsError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      setApplicationsError('');

      try {
        const res = await jobsAPI.get(id);
        setJob(res.data.job || res.data);

        if (isCandidate) {
          const myAppsRes = await applicationsAPI.myApplications();
          const myApps = myAppsRes.data.applications || myAppsRes.data || [];
          const existing = myApps.find((app) => String(app.jobId?._id || app.jobId) === String(id));
          setCurrentApplication(existing || null);
        }

        if (isRecruiter || isAdmin) {
          try {
            const appsRes = await applicationsAPI.forJob(id);
            const apps = appsRes.data.applications || appsRes.data || [];
            setApplications(apps);
            setSelectedApplication((prev) => {
              if (!prev) return null;
              return apps.find((a) => a._id === prev._id) || null;
            });
          } catch (appErr) {
            setApplicationsError(appErr.response?.data?.error || 'Failed to load applications for this job.');
            setApplications([]);
          }
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load job details.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, isCandidate, isRecruiter, isAdmin]);

  const handleApply = async (e) => {
    e.preventDefault();
    if (currentApplication) return;

    setApplying(true);
    setError('');
    try {
      const res = await applicationsAPI.apply({ jobId: id });
      const created = res.data.application || null;
      setCurrentApplication(created);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Application failed');
    } finally {
      setApplying(false);
    }
  };

  const handleStatusChange = async (appId, status) => {
    if (status === 'hired' && !confirm('Mark this candidate as hired for this position?')) {
      return;
    }
    try {
      const res = await applicationsAPI.updateStatus(appId, { status });
      const updated = res.data.application || null;
      setApplications((prev) => prev.map((a) => (a._id === appId ? { ...a, ...updated } : a)));
      setSelectedApplication((prev) => (prev?._id === appId ? { ...prev, ...updated } : prev));
      if (status === 'hired') {
        setSuccess('Candidate marked as hired.');
      }
    } catch (err) {
      setApplicationsError(err.response?.data?.error || 'Failed to update application status.');
    }
  };

  const handleToggleJobStatus = async () => {
    if (!job) return;
    const nextStatus = job.status === 'open' ? 'closed' : 'open';
    setJobStatusUpdating(true);
    setError('');
    setSuccess('');
    try {
      const res = await jobsAPI.update(id, { status: nextStatus });
      const updatedJob = res.data?.job || null;
      setJob((prev) => ({ ...prev, ...(updatedJob || {}), status: nextStatus }));
      setSuccess(nextStatus === 'closed'
        ? 'Job opening closed successfully.'
        : 'Job opening reopened successfully.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update job status.');
    } finally {
      setJobStatusUpdating(false);
    }
  };

  const handleRank = async () => {
    setApplicationsError('');
    try {
      const res = await applicationsAPI.rank(id);
      const ranked = res.data.rankedApplications || res.data || [];
      if (ranked.length) {
        setApplications(ranked);
        setSelectedApplication((prev) => {
          if (!prev) return null;
          return ranked.find((a) => a._id === prev._id) || null;
        });
      }
    } catch (err) {
      setApplicationsError(err.response?.data?.error || 'Failed to rank applications.');
    }
  };

  const scoreClass = (score) => {
    if (score >= 75) return 'score-high';
    if (score >= 50) return 'score-mid';
    return 'score-low';
  };

  useEffect(() => {
    if (!selectedApplication) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedApplication(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedApplication]);

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

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}
        {applicationsError && <div className="alert alert-error" style={{ marginBottom: 16 }}>{applicationsError}</div>}

        <div className="card fade-in" style={{ marginBottom: 24 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>{job.title}</h1>
              <div className="flex gap-md" style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                <span>📍 {job.location || 'Remote'}</span>
                {(job.experienceMin !== undefined || job.experienceMax !== undefined) && (
                  <span>🧠 {job.experienceMin ?? 0}–{job.experienceMax ?? 99} yrs</span>
                )}
                {job.salaryRange && (
                  <span>💰 ${job.salaryRange.min?.toLocaleString()} – ${job.salaryRange.max?.toLocaleString()}</span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              <span className={`badge ${job.status === 'open' ? 'badge-success' : 'badge-danger'}`}>
                {job.status}
              </span>
              {(isRecruiter || isAdmin) && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleToggleJobStatus}
                  disabled={jobStatusUpdating}
                >
                  {jobStatusUpdating
                    ? 'Updating...'
                    : job.status === 'open' ? 'Close Opening' : 'Reopen Opening'}
                </button>
              )}
            </div>
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
                {job.requiredSkills.map((skill) => <span key={skill} className="tag">{skill}</span>)}
              </div>
            </>
          )}

          {job.biasFlags?.length > 0 && (
            <>
              <div className="divider" />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Bias Review
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {job.biasFlags.map((flag, idx) => (
                  <div key={`${flag.term}-${idx}`} className="alert alert-warning" style={{ margin: 0 }}>
                    <strong>{flag.term}</strong>{flag.suggestion ? ` — ${flag.suggestion}` : ''}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {isCandidate && job.status !== 'open' && (
          <div className="alert alert-warning" style={{ marginBottom: 24 }}>
            This job is currently closed for new applications.
          </div>
        )}

        {isCandidate && currentApplication && (
          <div className="card slide-up" style={{ animationDelay: '0.2s', marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Your Application Status</h2>
            <div className="flex items-center gap-md" style={{ marginBottom: 8 }}>
              <span className={`badge ${statusBadgeClass(currentApplication.status)}`}>{currentApplication.status}</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Applied on {new Date(currentApplication.appliedAt || currentApplication.createdAt).toLocaleDateString()}
              </span>
            </div>
            {currentApplication.statusHistory?.length > 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Latest update: {new Date(currentApplication.statusHistory[currentApplication.statusHistory.length - 1].changedAt).toLocaleString()}
              </div>
            )}
          </div>
        )}

        {isCandidate && job.status === 'open' && !currentApplication && (
          <div className="card slide-up" style={{ animationDelay: '0.2s' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Apply for this Position</h2>

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
                    {applications.map((app) => {
                      const canShortlist = app.status === 'applied';
                      const canReject = ['applied', 'shortlisted', 'interview'].includes(app.status);
                      const canHire = app.status === 'interview';
                      const canSchedule = app.status === 'shortlisted' || app.status === 'interview';

                      return (
                      <tr key={app._id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {app.candidateId?.profile?.firstName || 'Unknown'} {app.candidateId?.profile?.lastName || ''}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {app.candidateId?.email || ''}
                          </div>
                        </td>
                        <td>
                          {app.matchScore != null ? (
                            <div className={`score-circle ${scoreClass(app.matchScore)}`}>
                              {Math.round(app.matchScore)}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${statusBadgeClass(app.status)}`}>
                            {app.status}
                          </span>
                        </td>
                        <td style={{ fontSize: 13 }}>
                          {new Date(app.appliedAt || app.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                            <button className="btn btn-sm btn-secondary" onClick={() => setSelectedApplication(app)}>
                              Review
                            </button>
                            {canShortlist && (
                              <button className="btn btn-sm btn-secondary" onClick={() => handleStatusChange(app._id, 'shortlisted')}>
                                Shortlist
                              </button>
                            )}
                            {canReject && (
                              <button className="btn btn-sm btn-ghost" onClick={() => handleStatusChange(app._id, 'rejected')}>
                                Reject
                              </button>
                            )}
                            {canHire && (
                              <button className="btn btn-sm btn-primary" onClick={() => handleStatusChange(app._id, 'hired')}>
                                Hire
                              </button>
                            )}
                            {canSchedule && (
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => navigate(`/interviews?applicationId=${app._id}`)}
                              >
                                Schedule
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}

        {selectedApplication && (
          <div
            className="modal-overlay"
            onClick={(event) => {
              if (event.target === event.currentTarget) setSelectedApplication(null);
            }}
          >
            <div className="modal" style={{ maxWidth: 760, maxHeight: '85vh', overflowY: 'auto' }}>
              <div className="modal-header">
                <h3 className="modal-title">
                  Candidate Review — {selectedApplication.candidateId?.profile?.firstName} {selectedApplication.candidateId?.profile?.lastName}
                </h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedApplication(null)}>
                  Close
                </button>
              </div>

              <div style={{ marginBottom: 10, fontSize: 14 }}>
                <strong>Email:</strong> {selectedApplication.candidateId?.email || '—'}
              </div>

              <div style={{ marginBottom: 10 }}>
                <strong style={{ fontSize: 14 }}>Skills</strong>
                <div className="tag-list" style={{ marginTop: 8 }}>
                  {(selectedApplication.candidateId?.profile?.skills || []).map((skill) => (
                    <span key={skill} className="tag">{skill}</span>
                  ))}
                </div>
              </div>

              {selectedApplication.aiExplanation && (
                <div style={{ marginBottom: 10 }}>
                  <strong style={{ fontSize: 14 }}>AI Explanation</strong>
                  <p style={{ marginTop: 8, marginBottom: 8, color: 'var(--color-text-secondary)' }}>
                    {selectedApplication.aiExplanation.experienceNote || 'No explanation available.'}
                  </p>
                  {selectedApplication.aiExplanation.matchedSkills?.length > 0 && (
                    <div className="tag-list" style={{ marginBottom: 8 }}>
                      {selectedApplication.aiExplanation.matchedSkills.map((skill) => (
                        <span key={`matched-${skill}`} className="tag">{skill}</span>
                      ))}
                    </div>
                  )}
                  {selectedApplication.aiExplanation.missingSkills?.length > 0 && (
                    <div className="tag-list">
                      {selectedApplication.aiExplanation.missingSkills.map((skill) => (
                        <span key={`missing-${skill}`} className="tag" style={{ borderColor: 'var(--color-warning)' }}>{skill}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
