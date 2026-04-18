import { useState, useEffect } from 'react';
import { recruiterAPI } from '../../services/api';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  LineChart,
  Line,
  BarChart,
  Bar,
} from 'recharts';

const STATUS_LABELS = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  hired: 'Hired',
  rejected: 'Rejected',
};

const STATUS_COLORS = {
  applied: '#2563eb',
  shortlisted: '#0ea5e9',
  interview: '#f59e0b',
  hired: '#22c55e',
  rejected: '#ef4444',
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
  const statusChartData = Object.entries(applications.byStatus || {}).map(([status, count]) => ({
    status,
    label: STATUS_LABELS[status] || status,
    count,
  }));

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

        {statusChartData.length > 0 && (
          <div className="card slide-up" style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Application Status Breakdown</h2>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    label={(entry) => `${entry.label} (${entry.count})`}
                  >
                    {statusChartData.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}`, 'Applications']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {topJobs.length > 0 && (
          <div className="card slide-up" style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Top Jobs by Applications</h2>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topJobs}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="jobTitle" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`${value}`, 'Applicants']} />
                  <Bar dataKey="applicantCount" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {weeklyTrend.length > 0 && (
          <div className="card slide-up">
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Weekly Application Trend</h2>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyTrend}>
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
                  />
                  <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {topJobs.length === 0 && weeklyTrend.length === 0 && statusChartData.length === 0 && (
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
