import { useState, useEffect } from 'react';
import { reportsAPI, jobsAPI } from '../../services/api';

export default function Reports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [filters, setFilters] = useState({ jobId: '', status: '' });

  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await jobsAPI.list({ limit: 100 });
        setJobs(res.data.jobs || []);
      } catch { /* ignore */ }
    }
    loadJobs();
  }, []);

  const generateReport = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.jobId) params.jobId = filters.jobId;
      if (filters.status) params.status = filters.status;
      const res = await reportsAPI.candidates(params);
      setReport(res.data);
    } catch (err) {
      console.error('Report generation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = async () => {
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
      console.error('CSV download failed:', err);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div className="page-header fade-in">
          <h1 className="page-title">
            Candidate <span className="text-gradient">Reports</span>
          </h1>
          <p className="page-subtitle">Generate and export candidate reports</p>
        </div>

        {/* Filters */}
        <div className="card slide-up" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label className="form-label">Job</label>
              <select className="form-input" value={filters.jobId} onChange={(e) => setFilters({ ...filters, jobId: e.target.value })}>
                <option value="">All Jobs</option>
                {jobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
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

        {/* Summary */}
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

        {/* Report Table */}
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
                    <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700,
                      color: row.matchScore >= 70 ? 'var(--color-success)' : row.matchScore >= 40 ? 'var(--color-warning)' : 'var(--color-error)',
                    }}>{row.matchScore}%</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>{row.skillsScore}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>{row.experienceScore}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>{row.educationScore}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <span className={`badge ${row.status === 'hired' ? 'badge-success' : row.status === 'rejected' ? 'badge-error' : 'badge-neutral'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', fontSize: 12 }}>{new Date(row.appliedAt).toLocaleDateString()}</td>
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
      </div>
    </div>
  );
}
