import { useState, useEffect } from 'react';
import { recruiterAPI } from '../../services/api';

const STATUS_LABELS = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  hired: 'Hired',
  rejected: 'Rejected',
};

export default function RecruiterAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await recruiterAPI.analytics();
        setAnalytics(res.data.analytics || null);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="loading-center"><div className="spinner spinner-lg" /></div>;
  }

  if (error) {
    return (
      <div className="page">
        <div className="container">
          <div className="alert alert-error fade-in">{error}</div>
        </div>
      </div>
    );
  }

  const jobs = analytics?.jobs || { total: 0, open: 0 };
  const applications = analytics?.applications || { total: 0, averageScore: 0, byStatus: {}, lastWeek: 0 };
  const interviews = analytics?.interviews || { scheduled: 0 };
  const hiring = analytics?.hiring || { totalHired: 0, avgTimeToHire: 0 };
  const topJobs = analytics?.topJobs || [];
  const weeklyTrend = analytics?.weeklyTrend || [];

  return (
    <div className="page">
      <div className="container">
        <div className="page-header fade-in">
          <h1 className="page-title">
            Recruiter <span className="text-gradient">Analytics</span>
          </h1>
          <p className="page-subtitle">Track your hiring metrics and performance</p>
        </div>

        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="stat-card fade-in delay-1">
            <div className="stat-icon purple">💼</div>
            <div className="stat-content">
              <h3>{jobs.total}</h3>
              <p>Total Jobs</p>
            </div>
          </div>
          <div className="stat-card fade-in delay-2">
            <div className="stat-icon green">🟢</div>
            <div className="stat-content">
              <h3>{jobs.open}</h3>
              <p>Open Positions</p>
            </div>
          </div>
          <div className="stat-card fade-in delay-3">
            <div className="stat-icon cyan">📋</div>
            <div className="stat-content">
              <h3>{applications.total}</h3>
              <p>Total Applications</p>
            </div>
          </div>
          <div className="stat-card fade-in delay-4">
            <div className="stat-icon amber">📈</div>
            <div className="stat-content">
              <h3>{applications.averageScore}%</h3>
              <p>Avg Match Score</p>
            </div>
          </div>
        </div>

        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="stat-card fade-in delay-1">
            <div className="stat-icon green">✅</div>
            <div className="stat-content">
              <h3>{hiring.totalHired}</h3>
              <p>Total Hired</p>
            </div>
          </div>
          <div className="stat-card fade-in delay-2">
            <div className="stat-icon purple">⏱️</div>
            <div className="stat-content">
              <h3>{hiring.avgTimeToHire}d</h3>
              <p>Avg Time to Hire</p>
            </div>
          </div>
          <div className="stat-card fade-in delay-3">
            <div className="stat-icon cyan">📅</div>
            <div className="stat-content">
              <h3>{interviews.scheduled}</h3>
              <p>Interviews Scheduled</p>
            </div>
          </div>
          <div className="stat-card fade-in delay-4">
            <div className="stat-icon amber">📊</div>
            <div className="stat-content">
              <h3>{applications.lastWeek}</h3>
              <p>Applications (7d)</p>
            </div>
          </div>
        </div>

        {Object.keys(applications.byStatus || {}).length > 0 && (
          <div className="card slide-up" style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>📊 Application Status Breakdown</h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {Object.entries(applications.byStatus).map(([status, count]) => (
                <div key={status} style={{ padding: '12px 20px', borderRadius: 8, background: 'var(--color-surface)', textAlign: 'center', minWidth: 130 }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-primary)' }}>{count}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{STATUS_LABELS[status] || status}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {topJobs.length > 0 && (
          <div className="card slide-up" style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>🏆 Top Jobs by Applications</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topJobs.map((job, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--color-surface)', borderRadius: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{job.jobTitle}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      Avg Score: {job.averageScore}%
                    </div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-primary)' }}>
                    {job.applicantCount}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {weeklyTrend.length > 0 && (
          <div className="card slide-up">
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>📈 Weekly Application Trend</h2>
            <div style={{ display: 'flex', alignItems: 'end', gap: 8, height: 150 }}>
              {weeklyTrend.map((day, i) => {
                const maxCount = Math.max(...weeklyTrend.map((d) => d.count));
                const height = maxCount > 0 ? (day.count / maxCount) * 120 : 0;
                return (
                  <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                    <div
                      style={{
                        height: `${height}px`,
                        background: 'var(--color-primary)',
                        borderRadius: '4px 4px 0 0',
                        minHeight: 4,
                        transition: 'height 0.3s ease',
                      }}
                    />
                    <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                      {day.count}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--color-text-secondary)' }}>
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {topJobs.length === 0 && weeklyTrend.length === 0 && Object.keys(applications.byStatus || {}).length === 0 && (
          <div className="card">
            <div className="empty-state">
              <div className="icon">📊</div>
              <h3>No data yet</h3>
              <p>Analytics will appear once jobs and applications are available.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
