import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { jobsAPI, applicationsAPI, adminAPI } from '../services/api';

export default function Dashboard() {
  const { user, isRecruiter, isAdmin, isCandidate } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        if (isAdmin) {
          const res = await adminAPI.dashboard();
          setStats(res.data);
        }

        const jobsRes = await jobsAPI.list({ limit: 5 });
        setRecentJobs(jobsRes.data.jobs || jobsRes.data || []);

        if (isCandidate) {
          const appsRes = await applicationsAPI.myApplications();
          const apps = appsRes.data.applications || appsRes.data || [];
          setStats({
            totalApplications: apps.length,
            pendingReview: apps.filter(a => a.status === 'submitted').length,
            shortlisted: apps.filter(a => a.status === 'shortlisted').length,
            rejected: apps.filter(a => a.status === 'rejected').length,
          });
        }

        if (isRecruiter) {
          setStats({
            totalJobs: (jobsRes.data.jobs || jobsRes.data || []).length,
            activeJobs: (jobsRes.data.jobs || jobsRes.data || []).filter(j => j.status === 'open').length,
          });
        }
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [isAdmin, isCandidate, isRecruiter]);

  if (loading) {
    return <div className="loading-center"><div className="spinner spinner-lg" /></div>;
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header fade-in">
          <h1 className="page-title">
            Welcome back, <span className="text-gradient">{user?.firstName}</span>
          </h1>
          <p className="page-subtitle">
            {isCandidate && 'Track your applications and find new opportunities'}
            {isRecruiter && 'Manage your job postings and review candidates'}
            {isAdmin && 'System overview and administration'}
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid-4" style={{ marginBottom: 32 }}>
          {isCandidate && stats && (
            <>
              <div className="stat-card fade-in delay-1">
                <div className="stat-icon purple">📄</div>
                <div className="stat-content">
                  <h3>{stats.totalApplications}</h3>
                  <p>Applications</p>
                </div>
              </div>
              <div className="stat-card fade-in delay-2">
                <div className="stat-icon amber">⏳</div>
                <div className="stat-content">
                  <h3>{stats.pendingReview}</h3>
                  <p>Pending Review</p>
                </div>
              </div>
              <div className="stat-card fade-in delay-3">
                <div className="stat-icon green">✅</div>
                <div className="stat-content">
                  <h3>{stats.shortlisted}</h3>
                  <p>Shortlisted</p>
                </div>
              </div>
              <div className="stat-card fade-in delay-4">
                <div className="stat-icon rose">❌</div>
                <div className="stat-content">
                  <h3>{stats.rejected}</h3>
                  <p>Rejected</p>
                </div>
              </div>
            </>
          )}

          {isRecruiter && stats && (
            <>
              <div className="stat-card fade-in delay-1">
                <div className="stat-icon purple">💼</div>
                <div className="stat-content">
                  <h3>{stats.totalJobs}</h3>
                  <p>Total Jobs</p>
                </div>
              </div>
              <div className="stat-card fade-in delay-2">
                <div className="stat-icon green">🟢</div>
                <div className="stat-content">
                  <h3>{stats.activeJobs}</h3>
                  <p>Active Jobs</p>
                </div>
              </div>
            </>
          )}

          {isAdmin && stats && (
            <>
              <div className="stat-card fade-in delay-1">
                <div className="stat-icon purple">👥</div>
                <div className="stat-content">
                  <h3>{stats.totalUsers || 0}</h3>
                  <p>Total Users</p>
                </div>
              </div>
              <div className="stat-card fade-in delay-2">
                <div className="stat-icon green">💼</div>
                <div className="stat-content">
                  <h3>{stats.totalJobs || 0}</h3>
                  <p>Total Jobs</p>
                </div>
              </div>
              <div className="stat-card fade-in delay-3">
                <div className="stat-icon cyan">📋</div>
                <div className="stat-content">
                  <h3>{stats.totalApplications || 0}</h3>
                  <p>Applications</p>
                </div>
              </div>
              <div className="stat-card fade-in delay-4">
                <div className="stat-icon amber">🤖</div>
                <div className="stat-content">
                  <h3>{stats.aiProcessed || 0}</h3>
                  <p>AI Processed</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Recent Jobs */}
        <div className="card slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>
              {isCandidate ? 'Latest Openings' : 'Recent Job Postings'}
            </h2>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/jobs')}>
              View All →
            </button>
          </div>

          {recentJobs.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📋</div>
              <h3>No jobs yet</h3>
              <p>Job postings will appear here when created.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentJobs.slice(0, 5).map((job) => (
                <div
                  key={job._id}
                  className="job-card"
                  onClick={() => navigate(`/jobs/${job._id}`)}
                >
                  <div className="job-card-header">
                    <div>
                      <div className="job-card-title">{job.title}</div>
                      <div className="job-card-meta">
                        <span>📍 {job.location || 'Remote'}</span>
                        <span>💼 {job.employmentType || 'Full-time'}</span>
                        {job.salaryRange && (
                          <span>💰 ${job.salaryRange.min?.toLocaleString()} – ${job.salaryRange.max?.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <span className={`badge ${job.status === 'open' ? 'badge-success' : 'badge-neutral'}`}>
                      {job.status || 'open'}
                    </span>
                  </div>
                  <div className="job-card-description">{job.description}</div>
                  {job.requiredSkills && (
                    <div className="tag-list">
                      {job.requiredSkills.slice(0, 5).map((skill) => (
                        <span key={skill} className="tag">{skill}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
