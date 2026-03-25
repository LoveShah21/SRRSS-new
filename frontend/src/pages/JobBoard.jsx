import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { jobsAPI } from '../services/api';

export default function JobBoard() {
  const { isRecruiter, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '', department: '', description: '', location: '',
    employmentType: 'full-time', requiredSkills: '',
    salaryMin: '', salaryMax: '',
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const loadJobs = async () => {
    try {
      const res = await jobsAPI.list({ search });
      setJobs(res.data.jobs || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadJobs(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setLoading(true);
    loadJobs();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        department: form.department,
        description: form.description,
        location: form.location,
        employmentType: form.employmentType,
        requiredSkills: form.requiredSkills.split(',').map(s => s.trim()).filter(Boolean),
        salaryRange: form.salaryMin && form.salaryMax
          ? { min: Number(form.salaryMin), max: Number(form.salaryMax) }
          : undefined,
      };
      await jobsAPI.create(payload);
      setShowCreate(false);
      setForm({ title: '', department: '', description: '', location: '', employmentType: 'full-time', requiredSkills: '', salaryMin: '', salaryMax: '' });
      loadJobs();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create job');
    } finally {
      setCreating(false);
    }
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className="page">
      <div className="container">
        <div className="page-header fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title">Job Board</h1>
              <p className="page-subtitle">Browse and discover open positions</p>
            </div>
            {(isRecruiter || isAdmin) && (
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                + Post New Job
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-md" style={{ marginBottom: 24 }}>
          <input
            className="form-input flex-1"
            placeholder="Search jobs by title, department, or skills…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>

        {/* Job List */}
        {loading ? (
          <div className="loading-center"><div className="spinner spinner-lg" /></div>
        ) : jobs.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="icon">🔍</div>
              <h3>No jobs found</h3>
              <p>Try adjusting your search or check back later.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {jobs.map((job, i) => (
              <div
                key={job._id}
                className="job-card fade-in"
                style={{ animationDelay: `${i * 0.05}s` }}
                onClick={() => navigate(`/jobs/${job._id}`)}
              >
                <div className="job-card-header">
                  <div>
                    <div className="job-card-title">{job.title}</div>
                    <div className="job-card-meta">
                      {job.department && <span>🏢 {job.department}</span>}
                      <span>📍 {job.location || 'Remote'}</span>
                      <span>💼 {job.employmentType || 'Full-time'}</span>
                      {job.salaryRange && (
                        <span>💰 ${job.salaryRange.min?.toLocaleString()} – ${job.salaryRange.max?.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <span className={`badge ${job.status === 'open' ? 'badge-success' : job.status === 'closed' ? 'badge-danger' : 'badge-warning'}`}>
                    {job.status}
                  </span>
                </div>
                <div className="job-card-description">{job.description}</div>
                {job.requiredSkills?.length > 0 && (
                  <div className="tag-list">
                    {job.requiredSkills.slice(0, 6).map((skill) => (
                      <span key={skill} className="tag">{skill}</span>
                    ))}
                    {job.requiredSkills.length > 6 && (
                      <span className="tag" style={{ opacity: 0.6 }}>+{job.requiredSkills.length - 6} more</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create Job Modal */}
        {showCreate && (
          <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
            <div className="modal" style={{ maxWidth: 600 }}>
              <div className="modal-header">
                <h2 className="modal-title">Post New Job</h2>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}>✕</button>
              </div>

              {error && <div className="alert alert-error">{error}</div>}

              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label className="form-label">Job Title</label>
                  <input className="form-input" value={form.title} onChange={set('title')} required placeholder="Senior Frontend Engineer" />
                </div>
                <div className="flex gap-md" style={{ marginTop: 16 }}>
                  <div className="form-group flex-1">
                    <label className="form-label">Department</label>
                    <input className="form-input" value={form.department} onChange={set('department')} placeholder="Engineering" />
                  </div>
                  <div className="form-group flex-1">
                    <label className="form-label">Location</label>
                    <input className="form-input" value={form.location} onChange={set('location')} placeholder="Remote / New York" />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: 16 }}>
                  <label className="form-label">Employment Type</label>
                  <select className="form-select" value={form.employmentType} onChange={set('employmentType')}>
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginTop: 16 }}>
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={form.description} onChange={set('description')} required placeholder="Describe the role and responsibilities…" />
                </div>
                <div className="form-group" style={{ marginTop: 16 }}>
                  <label className="form-label">Required Skills (comma-separated)</label>
                  <input className="form-input" value={form.requiredSkills} onChange={set('requiredSkills')} placeholder="React, TypeScript, Node.js" />
                </div>
                <div className="flex gap-md" style={{ marginTop: 16 }}>
                  <div className="form-group flex-1">
                    <label className="form-label">Min Salary ($)</label>
                    <input className="form-input" type="number" value={form.salaryMin} onChange={set('salaryMin')} placeholder="80000" />
                  </div>
                  <div className="form-group flex-1">
                    <label className="form-label">Max Salary ($)</label>
                    <input className="form-input" type="number" value={form.salaryMax} onChange={set('salaryMax')} placeholder="120000" />
                  </div>
                </div>
                <div className="flex gap-md" style={{ marginTop: 24 }}>
                  <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary flex-1" disabled={creating}>
                    {creating ? <div className="spinner" /> : 'Publish Job'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
