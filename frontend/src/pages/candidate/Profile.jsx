import { useState, useEffect, useCallback, useRef } from 'react';
import { resumeAPI } from '../../services/api';

function isSafeUrl(url) {
  try {
    const u = new URL(url, 'http://example.com');
    return ['http:', 'https:'].includes(u.protocol);
  } catch {
    return false;
  }
}

const createEmptyEducation = () => ({
  degree: '',
  institution: '',
  year: '',
});

const createEmptyExperience = () => ({
  title: '',
  company: '',
  years: '',
  description: '',
});

const createEmptyProject = () => ({
  name: '',
  techStack: '',
  description: '',
});

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const uploadProgressTimerRef = useRef(null);

  // Form fields
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    linkedIn: '',
    skills: '',
    education: [createEmptyEducation()],
    experience: [createEmptyExperience()],
    projects: [createEmptyProject()],
  });

  const loadProfile = useCallback(async () => {
    try {
      const res = await resumeAPI.getProfile();
      const p = res.data.profile;
      setProfile(p);

      const education = Array.isArray(p?.education) && p.education.length > 0
        ? p.education.map((edu) => ({
          degree: edu?.degree || '',
          institution: edu?.institution || '',
          year: edu?.year != null ? String(edu.year) : '',
        }))
        : [createEmptyEducation()];

      const experience = Array.isArray(p?.experience) && p.experience.length > 0
        ? p.experience.map((exp) => ({
          title: exp?.title || '',
          company: exp?.company || '',
          years: exp?.years != null ? String(exp.years) : '',
          description: exp?.description || '',
        }))
        : [createEmptyExperience()];

      const projects = Array.isArray(p?.projects) && p.projects.length > 0
        ? p.projects.map((project) => ({
          name: project?.name || '',
          techStack: Array.isArray(project?.techStack) ? project.techStack.join(', ') : '',
          description: project?.description || '',
        }))
        : [createEmptyProject()];

      setForm({
        firstName: p?.firstName || '',
        lastName: p?.lastName || '',
        phone: p?.phone || '',
        linkedIn: p?.linkedIn || '',
        skills: (p?.skills || []).join(', '),
        education,
        experience,
        projects,
      });
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  useEffect(() => () => {
    if (uploadProgressTimerRef.current) {
      clearInterval(uploadProgressTimerRef.current);
      uploadProgressTimerRef.current = null;
    }
  }, []);

  const stopUploadProgressSimulation = () => {
    if (uploadProgressTimerRef.current) {
      clearInterval(uploadProgressTimerRef.current);
      uploadProgressTimerRef.current = null;
    }
  };

  const startUploadProgressSimulation = () => {
    stopUploadProgressSimulation();
    uploadProgressTimerRef.current = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) return prev;
        return Math.min(90, prev + 4);
      });
    }, 220);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const education = form.education
        .map((edu) => ({
          degree: edu.degree.trim(),
          institution: edu.institution.trim(),
          year: edu.year.trim() ? Number(edu.year.trim()) : undefined,
        }))
        .filter((edu) => edu.degree || edu.institution || edu.year !== undefined);

      const experience = form.experience
        .map((exp) => ({
          title: exp.title.trim(),
          company: exp.company.trim(),
          years: exp.years.trim() ? Number(exp.years.trim()) : undefined,
          description: exp.description.trim(),
        }))
        .filter((exp) => exp.title || exp.company || exp.years !== undefined || exp.description);

      const projects = form.projects
        .map((project) => ({
          name: project.name.trim(),
          techStack: project.techStack.split(',').map((s) => s.trim()).filter(Boolean),
          description: project.description.trim(),
        }))
        .filter((project) => project.name || project.description || project.techStack.length > 0);

      const data = {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        linkedIn: form.linkedIn,
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
        education,
        experience,
        projects,
      };
      await resumeAPI.updateProfile(data);
      setSuccess('Profile updated successfully!');
      setEditMode(false);
      loadProfile();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    const allowedTypes = new Set([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ]);
    const fileName = (file.name || '').toLowerCase();
    const hasAllowedExtension = fileName.endsWith('.pdf') || fileName.endsWith('.docx');
    if (!allowedTypes.has(file.type) && !hasAllowedExtension) {
      setError('Only PDF and DOCX files are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB.');
      return;
    }

    setUploading(true);
    setUploadProgress(1);
    startUploadProgressSimulation();
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const res = await resumeAPI.upload(formData, {
        onUploadProgress: (progressEvent) => {
          if (!progressEvent?.total) return;
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress((prev) => Math.max(prev, Math.min(95, percent)));
        },
      });
      setSuccess(res.data?.message || 'Resume uploaded successfully.');
      setUploadProgress(100);
      loadProfile();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Upload failed');
      setUploadProgress(0);
    } finally {
      stopUploadProgressSimulation();
      setUploading(false);
    }
  };

  const handleResumeAccess = async (action = 'preview') => {
    setDownloading(true);
    setError('');
    setSuccess('');
    try {
      const res = await resumeAPI.download();
      const downloadUrl = res.data?.url;
      if (!downloadUrl || !isSafeUrl(downloadUrl)) {
        throw new Error('Invalid resume download URL received.');
      }

      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      if (action === 'download') {
        anchor.download = '';
      }
      anchor.click();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to access resume.');
    } finally {
      setDownloading(false);
    }
  };

  const updateEducation = (index, field, value) => {
    setForm((prev) => {
      const education = [...prev.education];
      education[index] = { ...education[index], [field]: value };
      return { ...prev, education };
    });
  };

  const addEducation = () => {
    setForm((prev) => ({ ...prev, education: [...prev.education, createEmptyEducation()] }));
  };

  const removeEducation = (index) => {
    setForm((prev) => {
      const education = prev.education.filter((_, i) => i !== index);
      return { ...prev, education: education.length ? education : [createEmptyEducation()] };
    });
  };

  const updateExperience = (index, field, value) => {
    setForm((prev) => {
      const experience = [...prev.experience];
      experience[index] = { ...experience[index], [field]: value };
      return { ...prev, experience };
    });
  };

  const addExperience = () => {
    setForm((prev) => ({ ...prev, experience: [...prev.experience, createEmptyExperience()] }));
  };

  const removeExperience = (index) => {
    setForm((prev) => {
      const experience = prev.experience.filter((_, i) => i !== index);
      return { ...prev, experience: experience.length ? experience : [createEmptyExperience()] };
    });
  };

  const updateProject = (index, field, value) => {
    setForm((prev) => {
      const projects = [...prev.projects];
      projects[index] = { ...projects[index], [field]: value };
      return { ...prev, projects };
    });
  };

  const addProject = () => {
    setForm((prev) => ({ ...prev, projects: [...prev.projects, createEmptyProject()] }));
  };

  const removeProject = (index) => {
    setForm((prev) => {
      const projects = prev.projects.filter((_, i) => i !== index);
      return { ...prev, projects: projects.length ? projects : [createEmptyProject()] };
    });
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileUpload(file);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  if (loading) {
    return <div className="loading-center"><div className="spinner spinner-lg" /></div>;
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 1120 }}>
        <div className="page-header fade-in">
          <h1 className="page-title">
            My <span className="text-gradient">Profile</span>
          </h1>
          <p className="page-subtitle">
            Manage your resume and profile information
          </p>
        </div>

        {error && (
          <div className="alert alert-error fade-in" style={{ marginBottom: 16 }}>
            ❌ {error}
            <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
          </div>
        )}
        {success && (
          <div className="alert alert-success fade-in" style={{ marginBottom: 16 }}>
            ✅ {success}
            <button onClick={() => setSuccess('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
          </div>
        )}

        {/* Resume Upload Section */}
        <div className="card slide-up" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>📄 Resume Upload</h2>

          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={() => setDragOver(false)}
            onClick={() => document.getElementById('resume-file-input').click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--color-border)'}`,
              borderRadius: 12,
              padding: '40px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragOver ? 'var(--color-primary-alpha)' : 'var(--color-surface)',
              transition: 'all 0.2s ease',
            }}
          >
            {uploading ? (
              <>
                <div className="spinner" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: 'var(--color-text-secondary)' }}>Uploading... {uploadProgress}%</p>
                <div style={{ marginTop: 10, maxWidth: 320, marginInline: 'auto' }}>
                  <div style={{ height: 8, borderRadius: 999, background: 'var(--color-border)' }}>
                    <div
                      style={{
                        width: `${Math.max(0, Math.min(uploadProgress, 100))}%`,
                        height: '100%',
                        borderRadius: 999,
                        background: 'var(--color-primary)',
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 48, marginBottom: 8 }}>📎</div>
                <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                  Drag & drop your resume here
                </p>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
                  or click to browse • PDF/DOCX • Max 5MB
                </p>
              </>
            )}
          </div>

          <input
            id="resume-file-input"
            type="file"
            accept=".pdf,.docx"
            style={{ display: 'none' }}
            onChange={(e) => {
              handleFileUpload(e.target.files[0]);
              e.target.value = '';
            }}
          />

          {profile?.resumeUrl && (
            <>
              <p style={{ marginTop: 12, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                ✅ Current resume: <span style={{ fontWeight: 600 }}>{profile.resumeUrl.split(/[/\\]/).pop()}</span>
                {profile.parsedAt && (
                  <> • Parsed {new Date(profile.parsedAt).toLocaleDateString()}</>
                )}
              </p>
              <div className="flex gap-sm" style={{ marginTop: 10, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  type="button"
                  onClick={() => handleResumeAccess('preview')}
                  disabled={downloading}
                >
                  {downloading ? 'Opening…' : 'Preview Resume'}
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  type="button"
                  onClick={() => handleResumeAccess('download')}
                  disabled={downloading}
                >
                  {downloading ? 'Preparing…' : 'Download Resume'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Profile Info Section */}
        <div className="card slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>👤 Profile Information</h2>
            <button
              className={`btn ${editMode ? 'btn-secondary' : 'btn-primary'} btn-sm`}
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>

          {editMode ? (
            <form onSubmit={handleSave}>
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input
                    className="form-input"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input
                    className="form-input"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    className="form-input"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+1-555-0100"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">LinkedIn</label>
                  <input
                    className="form-input"
                    value={form.linkedIn}
                    onChange={(e) => setForm({ ...form, linkedIn: e.target.value })}
                    placeholder="linkedin.com/in/..."
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label">Skills (comma-separated)</label>
                <input
                  className="form-input"
                  value={form.skills}
                  onChange={(e) => setForm({ ...form, skills: e.target.value })}
                  placeholder="JavaScript, React, Node.js, Python"
                />
              </div>

              <div style={{ marginTop: 24 }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Education</label>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addEducation}>
                    + Add Education
                  </button>
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {form.education.map((edu, index) => (
                    <div key={`edu-${index}`} className="card" style={{ padding: 16 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px auto', gap: 10, alignItems: 'end' }}>
                        <div className="form-group">
                          <label className="form-label">Degree</label>
                          <input
                            className="form-input"
                            value={edu.degree}
                            onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                            placeholder="B.Tech, MBA..."
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Institution</label>
                          <input
                            className="form-input"
                            value={edu.institution}
                            onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                            placeholder="University name"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Year</label>
                          <input
                            className="form-input"
                            value={edu.year}
                            onChange={(e) => updateEducation(index, 'year', e.target.value)}
                            placeholder="2024"
                            inputMode="numeric"
                          />
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => removeEducation(index)}
                          style={{ height: 38 }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 24 }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Experience</label>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addExperience}>
                    + Add Experience
                  </button>
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {form.experience.map((exp, index) => (
                    <div key={`exp-${index}`} className="card" style={{ padding: 16 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px', gap: 10 }}>
                        <div className="form-group">
                          <label className="form-label">Title</label>
                          <input
                            className="form-input"
                            value={exp.title}
                            onChange={(e) => updateExperience(index, 'title', e.target.value)}
                            placeholder="Software Engineer"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Company</label>
                          <input
                            className="form-input"
                            value={exp.company}
                            onChange={(e) => updateExperience(index, 'company', e.target.value)}
                            placeholder="Company name"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Years</label>
                          <input
                            className="form-input"
                            value={exp.years}
                            onChange={(e) => updateExperience(index, 'years', e.target.value)}
                            placeholder="2"
                            inputMode="decimal"
                          />
                        </div>
                      </div>
                      <div className="form-group" style={{ marginTop: 10 }}>
                        <label className="form-label">Description</label>
                        <textarea
                          className="form-input"
                          value={exp.description}
                          onChange={(e) => updateExperience(index, 'description', e.target.value)}
                          placeholder="Key responsibilities and achievements"
                          rows={3}
                          style={{ resize: 'vertical' }}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => removeExperience(index)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 24 }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Projects</label>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addProject}>
                    + Add Project
                  </button>
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {form.projects.map((project, index) => (
                    <div key={`project-${index}`} className="card" style={{ padding: 16 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                        <div className="form-group">
                          <label className="form-label">Project Name</label>
                          <input
                            className="form-input"
                            value={project.name}
                            onChange={(e) => updateProject(index, 'name', e.target.value)}
                            placeholder="Leazo Premium Rental Platform"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Tech Stack (comma-separated)</label>
                          <input
                            className="form-input"
                            value={project.techStack}
                            onChange={(e) => updateProject(index, 'techStack', e.target.value)}
                            placeholder="Next.js, Node.js, TypeScript, MongoDB, Docker"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Description</label>
                          <textarea
                            className="form-input"
                            value={project.description}
                            onChange={(e) => updateProject(index, 'description', e.target.value)}
                            placeholder="Built a production-ready platform with real-time inventory and automated workflows."
                            rows={3}
                            style={{ resize: 'vertical' }}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => removeProject(index)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditMode(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Full Name</p>
                  <p style={{ fontWeight: 600 }}>
                    {[profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || '—'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Phone</p>
                  <p style={{ fontWeight: 600 }}>{profile?.phone || '—'}</p>
                </div>
                <div>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4 }}>LinkedIn</p>
                  <p style={{ fontWeight: 600 }}>{profile?.linkedIn || '—'}</p>
                </div>
              </div>

              {profile?.parsedAt && (
                <p style={{ marginTop: 16, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  Resume data parsed on {new Date(profile.parsedAt).toLocaleString()}
                </p>
              )}

              {profile?.skills?.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Skills</p>
                  <div className="tag-list">
                    {profile.skills.map((skill) => (
                      <span key={skill} className="tag">{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              {profile?.education?.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Education</p>
                  {profile.education.map((edu, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                      <p style={{ fontWeight: 600 }}>{edu.degree || 'Education entry'}</p>
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
                        {[edu.institution, edu.year].filter((v) => v !== undefined && v !== null && v !== '').join(' • ') || '—'}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {profile?.experience?.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Experience</p>
                  {profile.experience.map((exp, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                      <p style={{ fontWeight: 600 }}>{exp.title || 'Experience entry'}</p>
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
                        {[exp.company, exp.years != null ? `${exp.years} year(s)` : ''].filter(Boolean).join(' • ') || '—'}
                      </p>
                      {exp.description && <p style={{ fontSize: 13, marginTop: 4 }}>{exp.description}</p>}
                    </div>
                  ))}
                </div>
              )}

              {profile?.projects?.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Projects</p>
                  {profile.projects.map((project, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                      <p style={{ fontWeight: 600 }}>{project.name || 'Project'}</p>
                      {Array.isArray(project.techStack) && project.techStack.length > 0 && (
                        <div className="tag-list" style={{ marginTop: 6 }}>
                          {project.techStack.map((tech) => (
                            <span key={`${project.name}-${tech}`} className="tag">{tech}</span>
                          ))}
                        </div>
                      )}
                      {project.description && <p style={{ fontSize: 13, marginTop: 6 }}>{project.description}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
