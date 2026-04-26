import { useState, useEffect } from 'react';
import { reportsAPI, jobsAPI } from '../../services/api';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export default function Reports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [filters, setFilters] = useState({ jobId: '', status: '' });
  const [error, setError] = useState('');
  const [selectedCandidateReport, setSelectedCandidateReport] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await jobsAPI.list({ limit: 100 });
        setJobs(res.data.jobs || []);
      } catch {
        setError('Failed to load jobs for report filters.');
      }
    }
    loadJobs();
  }, []);

  const generateReport = async () => {
    setLoading(true);
    setError('');
    setSelectedCandidateReport(null);
    try {
      const params = {};
      if (filters.jobId) params.jobId = filters.jobId;
      if (filters.status) params.status = filters.status;
      const res = await reportsAPI.candidates(params);
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = async () => {
    setError('');
    try {
      const params = {};
      if (filters.jobId) params.jobId = filters.jobId;
      if (filters.status) params.status = filters.status;
      const res = await reportsAPI.downloadCSV(params);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `candidate_report_${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.error || 'CSV download failed.');
    }
  };

  const openCandidateDetail = async (candidateId) => {
    if (!candidateId) return;
    setDetailLoading(true);
    setError('');
    try {
      const res = await reportsAPI.candidateDetail(candidateId);
      setSelectedCandidateReport(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load candidate details.');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedCandidateReport) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedCandidateReport(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedCandidateReport]);

  const weeklyTrend = report?.summary?.weeklyTrend || [];

  return (
    <div className="page">
      <div className="container">
        <div className="page-header fade-in">
          <h1 className="page-title">
            Candidate <span className="text-gradient">Reports</span>
          </h1>
          <p className="page-subtitle">Generate and export candidate reports</p>
        </div>

        {error && (
          <div className="alert alert-error fade-in" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div className="card slide-up" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label className="form-label">Job</label>
              <select className="form-input" value={filters.jobId} onChange={(e) => setFilters({ ...filters, jobId: e.target.value })}>
                <option value="">All Jobs</option>
                {jobs.map((j) => <option key={j._id} value={j._id}>{j.title}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: '1 1 150px' }}>
              <label className="form-label">Status</label>
              <select className="form-input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                <option value="">All</option>
                <option value="applied">Applied</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="interview">Interview</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <button className="btn btn-primary btn-sm" onClick={generateReport} disabled={loading} style={{ height: 40 }}>
              {loading ? 'Generating...' : '📊 Generate Report'}
            </button>
            {report && (
              <button className="btn btn-secondary btn-sm" onClick={downloadCSV} style={{ height: 40 }}>
                📥 Download CSV
              </button>
            )}
          </div>
        </div>

        {!report && !loading && (
          <div className="card">
            <div className="empty-state">
              <div className="icon">📊</div>
              <h3>Generate a report</h3>
              <p>Select filters and click "Generate Report" to load candidate analytics.</p>
            </div>
          </div>
        )}

        {report?.summary && (
          <div className="grid-4 slide-up" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-icon purple">👥</div>
              <div className="stat-content">
                <h3>{report.summary.totalCandidates}</h3>
                <p>Total Candidates</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">📈</div>
              <div className="stat-content">
                <h3>{report.summary.averageScore}%</h3>
                <p>Avg Match Score</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon cyan">✅</div>
              <div className="stat-content">
                <h3>{report.summary.byStatus?.hired || 0}</h3>
                <p>Hired</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon amber">⏳</div>
              <div className="stat-content">
                <h3>{report.summary.byStatus?.interview || 0}</h3>
                <p>In Interview</p>
              </div>
            </div>
          </div>
        )}

        {weeklyTrend.length > 0 && (
          <div className="card slide-up" style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Weekly Application Trends</h2>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyTrend}>
                  <defs>
                    <linearGradient id="reportsWeeklyTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis allowDecimals={false} tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => [`${value}`, 'Applications']}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    contentStyle={{ borderRadius: 8, border: '1px solid var(--color-border)' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} fill="url(#reportsWeeklyTrendFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {loading && (
          <div className="loading-center"><div className="spinner spinner-lg" /></div>
        )}

        {report?.report?.length > 0 && (
          <div className="card slide-up" style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 8px', textAlign: 'left' }}>Candidate</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left' }}>Job</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Match</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Skills</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Exp</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Edu</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left' }}>Applied</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {report.report.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ fontWeight: 600 }}>{row.candidateName}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{row.candidateEmail}</div>
                    </td>
                    <td style={{ padding: '10px 8px' }}>{row.jobTitle}</td>
                    <td style={{
                      padding: '10px 8px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: row.matchScore >= 70 ? 'var(--color-success)' : row.matchScore >= 40 ? 'var(--color-warning)' : 'var(--color-error)',
                    }}
                    >
                      {row.matchScore}%
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>{row.skillsScore}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>{row.experienceScore}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>{row.educationScore}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <span className={`badge ${row.status === 'hired' ? 'badge-success' : row.status === 'rejected' ? 'badge-error' : 'badge-neutral'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', fontSize: 12 }}>{new Date(row.appliedAt).toLocaleDateString()}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      {row.candidateId ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openCandidateDetail(row.candidateId)}
                        >
                          View
                        </button>
                      ) : (
                        <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {report && report.report?.length === 0 && (
          <div className="card">
            <div className="empty-state">
              <div className="icon">📊</div>
              <h3>No data found</h3>
              <p>No candidates match the selected filters.</p>
            </div>
          </div>
        )}

        {detailLoading && (
          <div className="loading-center" style={{ marginTop: 16 }}>
            <div className="spinner spinner-lg" />
          </div>
        )}

        {selectedCandidateReport?.candidate && (
          <div
            className="modal-overlay"
            onClick={(event) => {
              if (event.target === event.currentTarget) setSelectedCandidateReport(null);
            }}
          >
            <div className="modal" style={{ maxWidth: 860, maxHeight: '85vh', overflowY: 'auto' }}>
              <div className="modal-header">
                <h2 className="modal-title">
                  Candidate Detail — {selectedCandidateReport.candidate.profile?.firstName} {selectedCandidateReport.candidate.profile?.lastName}
                </h2>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedCandidateReport(null)}
                >
                  Close
                </button>
              </div>

              <div style={{ marginBottom: 12, fontSize: 14 }}>
                <strong>Email:</strong> {selectedCandidateReport.candidate.email}
              </div>
              <div style={{ marginBottom: 16, fontSize: 14 }}>
                <strong>Skills:</strong> {(selectedCandidateReport.candidate.profile?.skills || []).join(', ') || '—'}
              </div>

              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Applications</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(selectedCandidateReport.applications || []).map((app) => (
                  <div key={app._id} style={{ padding: '10px 12px', background: 'var(--color-surface)', borderRadius: 8 }}>
                    <div style={{ fontWeight: 600 }}>
                      {app.job?.title || 'Unknown Job'} • {app.matchScore}%
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      Status: {app.status} • Applied: {new Date(app.appliedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>

              <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 16, marginBottom: 8 }}>Interviews</h3>
              {(selectedCandidateReport.interviews || []).length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>No interviews for this candidate yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedCandidateReport.interviews.map((iv) => (
                    <div key={iv._id} style={{ padding: '10px 12px', background: 'var(--color-surface)', borderRadius: 8 }}>
                      <div style={{ fontWeight: 600 }}>
                        {iv.job?.title || 'Interview'} • {iv.type}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {new Date(iv.scheduledAt).toLocaleString()} • {iv.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
