import { useState, useEffect } from 'react';
import { candidatesAPI, applicationsAPI, jobsAPI, recruiterAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import CandidateCard from '../../components/Recruiter/CandidateCard';

export default function CandidateList() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [blindMode, setBlindMode] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingBlindMode, setSavingBlindMode] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    jobId: '',
    skills: '',
    score_min: '',
    status: '',
    search: '',
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await recruiterAPI.getSettings();
        setBlindMode(!!res.data?.settings?.blindScreeningEnabled);
      } catch {
        // ignore and keep local default
      } finally {
        setSettingsLoading(false);
      }
    }
    loadSettings();
  }, []);

  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await jobsAPI.list({ limit: 100 });
        setJobs(res.data.jobs || []);
      } catch { /* ignore */ }
    }
    loadJobs();
  }, []);

  useEffect(() => {
    loadCandidates();
  }, [filters.jobId, filters.status, pagination.page, blindMode, settingsLoading]);

  async function loadCandidates() {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: 20 };
      if (filters.jobId) params.jobId = filters.jobId;
      if (filters.skills) params.skills = filters.skills;
      if (filters.score_min) params.score_min = filters.score_min;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      params.blind = blindMode;

      const res = await candidatesAPI.list(params);
      setCandidates(res.data.candidates || []);
      if (res.data?.blindMode !== undefined) {
        setBlindMode(!!res.data.blindMode);
      }
      setPagination(prev => ({ ...prev, ...res.data.pagination }));
    } catch (err) {
      console.error('Failed to load candidates:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    loadCandidates();
  };

  async function handleShortlist(applicationId) {
    try {
      await applicationsAPI.updateStatus(applicationId, { status: 'shortlisted' });
      loadCandidates();
    } catch (err) {
      console.error('Failed to shortlist candidate:', err);
    }
  }

  function handleSchedule(applicationId) {
    navigate(`/interviews?applicationId=${applicationId}`);
  }

  async function handleReveal(applicationId) {
    try {
      await applicationsAPI.reveal(applicationId);
      loadCandidates();
    } catch (err) {
      console.error('Failed to reveal candidate identity:', err);
    }
  }

  async function handleBlindModeToggle() {
    const nextValue = !blindMode;
    setBlindMode(nextValue);
    setSavingBlindMode(true);
    try {
      await recruiterAPI.updateSettings({ blindScreeningEnabled: nextValue });
      setPagination((prev) => ({ ...prev, page: 1 }));
    } catch (err) {
      console.error('Failed to save blind screening preference:', err);
      setBlindMode(!nextValue);
    } finally {
      setSavingBlindMode(false);
    }
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header fade-in">
          <h1 className="page-title">
            <span className="text-gradient">Candidates</span>
          </h1>
          <p className="page-subtitle">Filter and review candidate profiles</p>
        </div>

        {/* Filters */}
        <div className="card slide-up" style={{ marginBottom: 24 }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label className="form-label">Job</label>
              <select
                className="form-input"
                value={filters.jobId}
                onChange={(e) => setFilters({ ...filters, jobId: e.target.value })}
              >
                <option value="">All Jobs</option>
                {jobs.map(job => (
                  <option key={job._id} value={job._id}>{job.title}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label className="form-label">Skills</label>
              <input
                className="form-input"
                placeholder="React, Node.js"
                value={filters.skills}
                onChange={(e) => setFilters({ ...filters, skills: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ flex: '1 1 120px' }}>
              <label className="form-label">Min Score</label>
              <input
                className="form-input"
                type="number"
                min="0" max="100"
                placeholder="0"
                value={filters.score_min}
                onChange={(e) => setFilters({ ...filters, score_min: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ flex: '1 1 150px' }}>
              <label className="form-label">Status</label>
              <select
                className="form-input"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">All</option>
                <option value="applied">Applied</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="interview">Interview</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: '1 1 180px' }}>
              <label className="form-label">Search</label>
              <input
                className="form-input"
                placeholder="Name or email"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" style={{ height: 40 }}>
              🔍 Search
            </button>
            <button
              type="button"
              className={`btn btn-sm ${blindMode ? 'btn-primary' : 'btn-secondary'}`}
              style={{ height: 40 }}
              disabled={settingsLoading || savingBlindMode}
              onClick={handleBlindModeToggle}
            >
              {savingBlindMode ? 'Saving…' : blindMode ? 'Blind Mode: On' : 'Blind Mode: Off'}
            </button>
          </form>
        </div>

        {/* Results */}
        {loading ? (
          <div className="loading-center"><div className="spinner spinner-lg" /></div>
        ) : candidates.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="icon">👥</div>
              <h3>No candidates found</h3>
              <p>Try adjusting your filters.</p>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {candidates.map((candidate) => (
                <CandidateCard
                  key={candidate._id}
                  candidate={candidate}
                  application={candidate.application}
                  job={candidate.job}
                  blindMode={blindMode}
                  onShortlist={handleShortlist}
                  onSchedule={handleSchedule}
                  onReveal={handleReveal}
                />
              ))}
            </div>

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
          </>
        )}
      </div>
    </div>
  );
}
