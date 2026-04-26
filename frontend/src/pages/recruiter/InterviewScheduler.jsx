import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { interviewsAPI, jobsAPI, applicationsAPI } from '../../services/api';

/**
 * Validate that a URL is safe to render as an href.
 * Rejects javascript:, data:, and other dangerous schemes.
 */
function isSafeUrl(url) {
  try {
    const u = new URL(url, 'http://example.com');
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(u.protocol);
  } catch {
    return false;
  }
}

/**
 * Format time for 12h clock
 */
function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function toDatetimeLocalValue(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const TYPE_LABELS = {
  video: 'Video',
  phone: 'Phone',
  'in-person': 'In Person',
  technical: 'Technical',
  hr: 'HR',
};

export default function InterviewScheduler() {
  const [searchParams] = useSearchParams();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [editingInterview, setEditingInterview] = useState(null);
  const [view, setView] = useState('list'); // 'list' | 'calendar' | 'week'
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null); // for day-detail modal
  const [decisionLoadingKey, setDecisionLoadingKey] = useState('');

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

  useEffect(() => {
    const preselectedApplicationId = searchParams.get('applicationId');
    if (!preselectedApplicationId) return;

    let cancelled = false;
    async function preloadFromApplication() {
      setShowForm(true);
      setEditingInterview(null);
      setError('');

      try {
        const appRes = await applicationsAPI.getById(preselectedApplicationId);
        if (cancelled) return;
        const app = appRes.data?.application;
        const preselectedJobId = app?.jobId?._id || app?.jobId || '';

        if (preselectedJobId) {
          setSelectedJob(preselectedJobId);
          await loadApplicationsForJob(preselectedJobId, true);
          if (cancelled) return;
        }

        setForm((prev) => ({ ...prev, applicationId: preselectedApplicationId }));
      } catch (err) {
        if (cancelled) return;
        setForm((prev) => ({ ...prev, applicationId: preselectedApplicationId }));
        setError(err.response?.data?.error || 'Unable to preload selected candidate for interview scheduling.');
      }
    }

    preloadFromApplication();
    return () => { cancelled = true; };
  }, [searchParams]);

  async function loadInterviews() {
    try {
      const res = await interviewsAPI.list({ limit: 500 });
      setInterviews(res.data.interviews || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load interviews.');
    } finally {
      setLoading(false);
    }
  }

  async function loadJobs() {
    try {
      const res = await jobsAPI.list({ limit: 100 });
      setJobs(res.data.jobs || []);
    } catch (err) {
      setError((prev) => prev || err.response?.data?.error || 'Failed to load jobs.');
    }
  }

  async function loadApplicationsForJob(jobId, includeAnyStatus = false) {
    if (!jobId) { setApplications([]); return; }
    try {
      const params = { limit: 100 };
      if (!includeAnyStatus) params.status = 'shortlisted';
      const res = await applicationsAPI.forJob(jobId, params);
      setApplications(res.data.applications || []);
    } catch (err) {
      setError((prev) => prev || err.response?.data?.error || 'Failed to load applications for selected job.');
    }
  }

  const handleJobChange = (jobId) => {
    setSelectedJob(jobId);
    setForm((prev) => ({ ...prev, applicationId: '' }));
    loadApplicationsForJob(jobId);
  };

  const resetForm = () => {
    setForm({
      applicationId: '',
      scheduledAt: '',
      duration: 60,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      link: '',
      type: 'video',
      notes: '',
    });
  };

  const openEditInterview = async (iv) => {
    const jobId = iv.jobId?._id || '';
    setEditingInterview(iv);
    setSelectedJob(jobId);
    await loadApplicationsForJob(jobId, true);
    setForm({
      applicationId: iv.applicationId?._id || iv.applicationId || '',
      scheduledAt: toDatetimeLocalValue(iv.scheduledAt),
      duration: iv.duration || 60,
      timezone: iv.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      link: iv.link || '',
      type: iv.type || 'video',
      notes: iv.notes || '',
    });
    setShowForm(true);
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.link && !isSafeUrl(form.link)) {
      setError('Meeting link must be a safe URL (http/https).');
      return;
    }

    if (form.scheduledAt && new Date(form.scheduledAt) < new Date()) {
      setError('Interview time must be in the future.');
      return;
    }

    try {
      if (editingInterview) {
        await interviewsAPI.update(editingInterview._id, {
          scheduledAt: form.scheduledAt,
          duration: form.duration,
          timezone: form.timezone,
          link: form.link,
          type: form.type,
          notes: form.notes,
        });
        setSuccess('Interview updated successfully!');
      } else {
        await interviewsAPI.create(form);
        setSuccess('Interview scheduled successfully!');
      }
      setShowForm(false);
      setEditingInterview(null);
      resetForm();
      loadInterviews();
    } catch (err) {
      const apiError = err.response?.data?.error || 'Failed to schedule interview';
      if (err.response?.status === 409) {
        setError(`Scheduling conflict: ${apiError}`);
      } else {
        setError(apiError);
      }
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this interview?')) return;
    try {
      await interviewsAPI.cancel(id);
      setSuccess('Interview cancelled.');
      loadInterviews();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel');
    }
  };

  const handleMarkCompleted = async (id) => {
    try {
      await interviewsAPI.update(id, { status: 'completed' });
      setSuccess('Interview marked as completed.');
      loadInterviews();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark interview as completed.');
    }
  };

  const getApplicationId = (interview) => interview.applicationId?._id || interview.applicationId;
  const getApplicationStatus = (interview) => interview.applicationId?.status || '';
  const canShowDecisionActions = (interview) => (
    interview.status === 'completed'
    && !['hired', 'rejected'].includes(getApplicationStatus(interview))
  );

  const handlePostInterviewDecision = async (interview, nextStatus) => {
    const applicationId = getApplicationId(interview);
    if (!applicationId) {
      setError('Unable to update candidate status: missing application reference.');
      return;
    }

    const actionKey = `${interview._id}:${nextStatus}`;
    setDecisionLoadingKey(actionKey);
    setError('');
    setSuccess('');

    try {
      await applicationsAPI.updateStatus(applicationId, { status: nextStatus });
      setSuccess(nextStatus === 'hired'
        ? 'Candidate marked as hired.'
        : 'Candidate marked as rejected.');
      await loadInterviews();
    } catch (err) {
      setError(err.response?.data?.error || `Failed to mark candidate as ${nextStatus}.`);
    } finally {
      setDecisionLoadingKey('');
    }
  };

  const getStatusColor = (status) => {
    const map = { scheduled: 'badge-info', completed: 'badge-success', cancelled: 'badge-error', rescheduled: 'badge-warning', 'no-show': 'badge-error' };
    return map[status] || 'badge-neutral';
  };

  // ─── Calendar helpers ───────────────────────────────────
  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const interviewsForDay = (day) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    return interviews.filter(iv => {
      const d = new Date(iv.scheduledAt);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day && iv.status !== 'cancelled';
    });
  };

  // Week view helpers
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getWeekDates = (date) => {
    const start = getStartOfWeek(date);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  };

  const interviewsForDate = (date) => interviews.filter(iv => {
    const d = new Date(iv.scheduledAt);
    return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate() && iv.status !== 'cancelled';
  });

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const today = new Date();
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  const weekDates = getWeekDates(currentMonth);

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevWeek = () => setCurrentMonth(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; }, [currentMonth]);
  const nextWeek = () => setCurrentMonth(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; }, [currentMonth]);
  const goToday = () => setCurrentMonth(new Date());

  // Day detail modal interviews
  const dayDetailInterviews = selectedDay ? interviewsForDay(selectedDay) : [];

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
              <p className="page-subtitle">Schedule and manage candidate interviews — timezone: {form.timezone}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ display: 'flex', background: 'var(--color-surface)', borderRadius: 8, overflow: 'hidden' }}>
                <button
                  className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setView('list')}
                  style={{ borderRadius: 0 }}
                >
                  List
                </button>
                <button
                  className={`btn btn-sm ${view === 'calendar' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setView('calendar')}
                  style={{ borderRadius: 0 }}
                >
                  Month
                </button>
                <button
                  className={`btn btn-sm ${view === 'week' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setView('week')}
                  style={{ borderRadius: 0 }}
                >
                  Week
                </button>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (showForm) {
                    setShowForm(false);
                    setEditingInterview(null);
                    resetForm();
                  } else {
                    setEditingInterview(null);
                    resetForm();
                    setShowForm(true);
                  }
                }}
              >
                {showForm ? 'Close Form' : '+ Schedule Interview'}
              </button>
            </div>
          </div>
        </div>

        {error && <div className="alert alert-error fade-in" style={{ marginBottom: 16 }}>{error}</div>}
        {success && <div className="alert alert-success fade-in" style={{ marginBottom: 16 }}>{success}</div>}

        {/* Schedule Form */}
        {showForm && (
          <div className="card slide-up" style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              {editingInterview ? 'Reschedule Interview' : 'Schedule New Interview'}
            </h2>
            <form onSubmit={handleSchedule}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Job</label>
                  <select
                    className="form-input"
                    value={selectedJob}
                    onChange={(e) => handleJobChange(e.target.value)}
                    required
                    disabled={!!editingInterview}
                  >
                    <option value="">Select a job</option>
                    {jobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Candidate (Application)</label>
                  <select
                    className="form-input"
                    value={form.applicationId}
                    onChange={(e) => setForm({ ...form, applicationId: e.target.value })}
                    required
                    disabled={!!editingInterview}
                  >
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
              <div className="flex gap-sm" style={{ marginTop: 16 }}>
                <button type="submit" className="btn btn-primary">
                  {editingInterview ? 'Save Changes' : 'Schedule Interview'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditingInterview(null);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─── Month Calendar View ─── */}
        {view === 'calendar' && (
          <div className="card slide-up" style={{ marginBottom: 24 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={prevMonth}>Prev</button>
                <button className="btn btn-secondary btn-sm" onClick={goToday}>Today</button>
                <button className="btn btn-secondary btn-sm" onClick={nextMonth}>Next</button>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{monthName}</h2>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                {interviews.length} total interviews • Timezone: {form.timezone}
              </div>
            </div>

            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: 8 }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', padding: 8 }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} style={{ minHeight: 100, background: 'var(--color-surface)', borderRadius: 4 }} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayInterviews = interviewsForDay(day);
                const isToday = today.getDate() === day && today.getMonth() === currentMonth.getMonth() && today.getFullYear() === currentMonth.getFullYear();
                return (
                  <div
                    key={day}
                    role="button"
                    tabIndex={0}
                    onClick={() => dayInterviews.length > 0 && setSelectedDay(day)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && dayInterviews.length > 0) setSelectedDay(day); }}
                    style={{
                      minHeight: 100,
                      padding: 6,
                      background: isToday ? 'var(--color-primary-alpha)' : 'var(--color-surface)',
                      borderRadius: 4,
                      border: isToday ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                      cursor: dayInterviews.length > 0 ? 'pointer' : 'default',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { if (dayInterviews.length > 0) e.currentTarget.style.background = 'var(--color-primary-alpha, #e0edff)'; }}
                    onMouseLeave={(e) => { if (!isToday) e.currentTarget.style.background = 'var(--color-surface)'; }}
                  >
                    <div style={{ fontSize: 12, fontWeight: isToday ? 800 : 600, marginBottom: 4, color: isToday ? 'var(--color-primary)' : 'inherit' }}>
                      {day}
                    </div>
                    {dayInterviews.slice(0, 3).map(iv => {
                      const statusConfig = {
                        scheduled: { bg: 'var(--color-primary-alpha)', border: '2px solid var(--color-info, #3b82f6)' },
                        rescheduled: { bg: 'var(--color-warning-alpha, #fff3e0)', border: '2px solid var(--color-warning, #f59e0b)' },
                        completed: { bg: 'var(--color-surface)', border: '2px solid var(--color-success, #22c55e)' },
                        cancelled: { bg: 'var(--color-surface)', border: '2px solid var(--color-error, #ef4444)' },
                        'no-show': { bg: 'var(--color-surface)', border: '2px solid var(--color-error, #ef4444)' },
                      };
                      const config = statusConfig[iv.status] || statusConfig.scheduled;

                      return (
                        <div
                          key={iv._id}
                          style={{
                            fontSize: 10,
                            padding: '2px 4px',
                            marginBottom: 2,
                            borderRadius: 3,
                            background: config.bg,
                            color: 'var(--color-text-secondary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            borderLeft: config.border,
                          }}
                          title={`${formatTime(new Date(iv.scheduledAt))} — ${iv.candidateId?.profile?.firstName} ${iv.candidateId?.profile?.lastName} — ${iv.jobId?.title} [${iv.status}]`}
                        >
                          {formatTime(new Date(iv.scheduledAt))} {iv.candidateId?.profile?.firstName}
                        </div>
                      );
                    })}
                    {dayInterviews.length > 3 && (
                      <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', padding: '0 4px' }}>+{dayInterviews.length - 3} more</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Week Calendar View ─── */}
        {view === 'week' && (
          <div className="card slide-up" style={{ marginBottom: 24 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
              <button className="btn btn-secondary btn-sm" onClick={prevWeek}>Prev Week</button>
              <div className="flex items-center" style={{ gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={goToday}>Today</button>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>
                  {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </h2>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={nextWeek}>Next Week</button>
            </div>

            {/* Week grid — time slots 8am-7pm */}
            <div style={{ overflowX: 'auto' }}>
              {weekDates.map((date, idx) => {
                const dayInterviews = interviewsForDate(date);
                const isToday = date.toDateString() === today.toDateString();
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '80px 1fr',
                      gap: 0,
                      marginBottom: 12,
                      padding: '8px 12px',
                      background: isToday ? 'var(--color-primary-alpha)' : 'var(--color-surface)',
                      borderRadius: 8,
                      border: isToday ? '1px solid var(--color-border)' : '1px solid transparent',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: isToday ? 800 : 600 }}>{dayName}</div>
                      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{date.getDate()}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center' }}>
                      {dayInterviews.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>No interviews</div>
                      ) : (
                        dayInterviews.map(iv => {
                          const statusConfig = {
                            scheduled: { bg: 'var(--color-primary-alpha)', border: '1px solid var(--color-info, #3b82f6)' },
                            rescheduled: { bg: 'var(--color-warning-alpha, #fff3e0)', border: '1px solid var(--color-warning, #f59e0b)' },
                            completed: { bg: 'var(--color-surface)', border: '1px solid var(--color-success, #22c55e)' },
                            cancelled: { bg: 'var(--color-surface)', border: '1px solid var(--color-error, #ef4444)' },
                            'no-show': { bg: 'var(--color-surface)', border: '1px solid var(--color-error, #ef4444)' },
                          };
                          const config = statusConfig[iv.status] || statusConfig.scheduled;

                          return (
                            <div
                              key={iv._id}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '86px minmax(0, 1fr) auto',
                                alignItems: 'center',
                                gap: 10,
                                padding: '6px 10px',
                                background: config.bg,
                                border: config.border,
                                borderRadius: 6,
                                fontSize: 13,
                              }}
                            >
                              <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{formatTime(new Date(iv.scheduledAt))}</span>
                              <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span
                                  style={{
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {iv.candidateId?.profile?.firstName} {iv.candidateId?.profile?.lastName}
                                </span>
                                <span className="badge badge-neutral" style={{ fontSize: 10 }}>
                                  {TYPE_LABELS[iv.type] || 'Interview'}
                                </span>
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: 'var(--color-text-secondary)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {iv.jobId?.title}
                                </span>
                              </div>
                              <span className={`badge ${getStatusColor(iv.status)}`} style={{ fontSize: 10 }}>{iv.status}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Day Detail Modal ─── */}
        {selectedDay !== null && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          }} onClick={() => setSelectedDay(null)}>
            <div className='card' style={{ maxWidth: 500, width: '90%', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>
                  {currentMonth.toLocaleString('default', { month: 'long' })} {selectedDay} Interviews
                </h3>
                <button className="btn btn-sm btn-ghost" onClick={() => setSelectedDay(null)}>X</button>
              </div>
              {dayDetailInterviews.length === 0 ? (
                <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>No interviews on this day.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {dayDetailInterviews.map(iv => (
                    <div key={iv._id} style={{
                      padding: 12,
                      background: 'var(--color-surface)',
                      borderRadius: 8,
                      border: '1px solid var(--color-border)',
                    }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>
                            {iv.candidateId?.profile?.firstName} {iv.candidateId?.profile?.lastName}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                            {formatTime(new Date(iv.scheduledAt))} — {iv.duration}min — {iv.jobId?.title}
                          </div>
                        </div>
                        <span className={`badge ${getStatusColor(iv.status)}`}>{iv.status}</span>
                      </div>
                      {iv.link && isSafeUrl(iv.link) && (
                        <div style={{ fontSize: 12, marginTop: 6 }}>
                          Link: <a href={iv.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>{iv.link}</a>
                        </div>
                      )}
                      {iv.notes && (
                        <div style={{ fontSize: 12, marginTop: 4, color: 'var(--color-text-secondary)' }}>
                          {iv.notes}
                        </div>
                      )}
                      {iv.status !== 'completed' && iv.status !== 'cancelled' && (
                        <div style={{ marginTop: 8 }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleMarkCompleted(iv._id)}
                          >
                            Mark Completed
                          </button>
                        </div>
                      )}
                      {canShowDecisionActions(iv) && (
                        <div className="flex gap-sm" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={decisionLoadingKey === `${iv._id}:hired`}
                            onClick={() => handlePostInterviewDecision(iv, 'hired')}
                          >
                            {decisionLoadingKey === `${iv._id}:hired` ? 'Updating...' : 'Hire Candidate'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={decisionLoadingKey === `${iv._id}:rejected`}
                            onClick={() => handlePostInterviewDecision(iv, 'rejected')}
                          >
                            {decisionLoadingKey === `${iv._id}:rejected` ? 'Updating...' : 'Reject Candidate'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── List View ─── */}
        {view === 'list' && (
          interviews.length === 0 ? (
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
                        {iv.jobId?.title} • {TYPE_LABELS[iv.type] || 'Interview'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge ${getStatusColor(iv.status)}`}>{iv.status}</span>
                      <p style={{ fontSize: 13, marginTop: 4, fontWeight: 600 }}>
                        {formatTime(new Date(iv.scheduledAt))} — {new Date(iv.scheduledAt).toLocaleDateString()}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {iv.duration} min • {iv.timezone || form.timezone}
                      </p>
                    </div>
                  </div>
                  {iv.link && isSafeUrl(iv.link) && (
                    <p style={{ marginTop: 8, fontSize: 13 }}>
                      <a href={iv.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>{iv.link}</a>
                    </p>
                  )}
                  {iv.link && !isSafeUrl(iv.link) && (
                    <p style={{ marginTop: 8, fontSize: 13, color: 'var(--color-warning)' }}>
                      Unsafe meeting link blocked.
                    </p>
                  )}
                  {iv.notes && (
                    <p style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      {iv.notes}
                    </p>
                  )}
                  {iv.status !== 'cancelled' && iv.status !== 'completed' && (
                    <div className="flex gap-sm" style={{ marginTop: 12 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => handleMarkCompleted(iv._id)}>
                        Mark Completed
                      </button>
                      <button className="btn btn-primary btn-sm" onClick={() => openEditInterview(iv)}>
                        Reschedule
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleCancel(iv._id)}>Cancel</button>
                    </div>
                  )}
                  {canShowDecisionActions(iv) && (
                    <div className="flex gap-sm" style={{ marginTop: 12, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={decisionLoadingKey === `${iv._id}:hired`}
                        onClick={() => handlePostInterviewDecision(iv, 'hired')}
                      >
                        {decisionLoadingKey === `${iv._id}:hired` ? 'Updating...' : 'Hire Candidate'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={decisionLoadingKey === `${iv._id}:rejected`}
                        onClick={() => handlePostInterviewDecision(iv, 'rejected')}
                      >
                        {decisionLoadingKey === `${iv._id}:rejected` ? 'Updating...' : 'Reject Candidate'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
