import { useState, useEffect } from 'react';
import { interviewsAPI, jobsAPI, applicationsAPI } from '../../services/api';

export default function InterviewScheduler() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedJob, setSelectedJob] = useState('');

  const [form, setForm] = useState({
    applicationId: '',
    scheduledAt: '',
    duration: 60,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    link: '',
    type: 'video',
    notes: '',
  });

  useEffect(() => {
    loadInterviews();
    loadJobs();
  }, []);

  async function loadInterviews() {
    try {
      const res = await interviewsAPI.list();
      setInterviews(res.data.interviews || []);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function loadJobs() {
    try {
      const res = await jobsAPI.list({ limit: 100 });
      setJobs(res.data.jobs || []);
    } catch { /* ignore */ }
  }

  async function loadApplicationsForJob(jobId) {
    if (!jobId) { setApplications([]); return; }
    try {
      const res = await applicationsAPI.forJob(jobId, { status: 'shortlisted', limit: 100 });
      setApplications(res.data.applications || []);
    } catch { /* ignore */ }
  }

  const handleJobChange = (jobId) => {
    setSelectedJob(jobId);
    setForm({ ...form, applicationId: '' });
    loadApplicationsForJob(jobId);
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await interviewsAPI.create(form);
      setSuccess('Interview scheduled successfully!');
      setShowForm(false);
      setForm({ applicationId: '', scheduledAt: '', duration: 60, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, link: '', type: 'video', notes: '' });
      loadInterviews();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to schedule interview');
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this interview?')) return;
    try {
      await interviewsAPI.cancel(id);
      loadInterviews();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel');
    }
  };

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title">
                Interview <span className="text-gradient">Scheduler</span>
              </h1>
              <p className="page-subtitle">Schedule and manage candidate interviews</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? '✕ Cancel' : '+ Schedule Interview'}
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error fade-in" style={{ marginBottom: 16 }}>❌ {error}</div>}
        {success && <div className="alert alert-success fade-in" style={{ marginBottom: 16 }}>✅ {success}</div>}

        {/* Schedule Form */}
        {showForm && (
          <div className="card slide-up" style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>📅 Schedule New Interview</h2>
            <form onSubmit={handleSchedule}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Job</label>
                  <select className="form-input" value={selectedJob} onChange={(e) => handleJobChange(e.target.value)} required>
                    <option value="">Select a job</option>
                    {jobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Candidate (Application)</label>
                  <select className="form-input" value={form.applicationId} onChange={(e) => setForm({ ...form, applicationId: e.target.value })} required>
                    <option value="">Select candidate</option>
                    {applications.map(a => (
                      <option key={a._id} value={a._id}>
                        {a.candidateId?.profile?.firstName} {a.candidateId?.profile?.lastName} (Score: {a.matchScore})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date & Time</label>
                  <input type="datetime-local" className="form-input" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration (minutes)</label>
                  <input type="number" className="form-input" min="15" max="480" value={form.duration} onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="video">Video Call</option>
                    <option value="phone">Phone</option>
                    <option value="in-person">In Person</option>
                    <option value="technical">Technical</option>
                    <option value="hr">HR Round</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Meeting Link</label>
                  <input className="form-input" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://zoom.us/j/..." />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label">Notes</label>
                <textarea className="form-input" rows="3" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Discussion topics, preparation notes..." />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: 16 }}>
                Schedule Interview
              </button>
            </form>
          </div>
        )}

        {/* Interview List */}
        {interviews.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="icon">📅</div>
              <h3>No interviews scheduled</h3>
              <p>Click "Schedule Interview" to get started.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {interviews.map((iv) => (
              <div key={iv._id} className="card slide-up" style={{ padding: 20 }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                      {iv.candidateId?.profile?.firstName} {iv.candidateId?.profile?.lastName}
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      {iv.jobId?.title} • {iv.type}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge ${getStatusColor(iv.status)}`}>{iv.status}</span>
                    <p style={{ fontSize: 13, marginTop: 4, fontWeight: 600 }}>
                      📅 {new Date(iv.scheduledAt).toLocaleString()}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      ⏱ {iv.duration} min
                    </p>
                  </div>
                </div>
                {iv.link && (
                  <p style={{ marginTop: 8, fontSize: 13 }}>
                    🔗 <a href={iv.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>{iv.link}</a>
                  </p>
                )}
                {iv.notes && (
                  <p style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    📝 {iv.notes}
                  </p>
                )}
                {iv.status === 'scheduled' && (
                  <div style={{ marginTop: 12 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleCancel(iv._id)}>Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
