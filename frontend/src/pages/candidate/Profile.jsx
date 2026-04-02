import { useState, useEffect, useCallback } from 'react';
import { resumeAPI } from '../../services/api';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Form fields
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    linkedIn: '',
    skills: '',
  });

  const loadProfile = useCallback(async () => {
    try {
      const res = await resumeAPI.getProfile();
      const p = res.data.profile;
      setProfile(p);
      setForm({
        firstName: p?.firstName || '',
        lastName: p?.lastName || '',
        phone: p?.phone || '',
        linkedIn: p?.linkedIn || '',
        skills: (p?.skills || []).join(', '),
      });
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const data = {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        linkedIn: form.linkedIn,
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
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

    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only PDF and DOCX files are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('resume', file);

    try {
      await resumeAPI.upload(formData);
      setSuccess('Resume uploaded and parsed successfully!');
      setUploadProgress(100);
      loadProfile();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
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
      <div className="container" style={{ maxWidth: 800 }}>
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
            onChange={(e) => handleFileUpload(e.target.files[0])}
          />

          {profile?.resumeUrl && (
            <p style={{ marginTop: 12, fontSize: 13, color: 'var(--color-text-secondary)' }}>
              ✅ Current resume: <span style={{ fontWeight: 600 }}>{profile.resumeUrl.split(/[/\\]/).pop()}</span>
              {profile.parsedAt && (
                <> • Parsed {new Date(profile.parsedAt).toLocaleDateString()}</>
              )}
            </p>
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
                  <p style={{ fontWeight: 600 }}>{profile?.firstName} {profile?.lastName}</p>
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
                      <p style={{ fontWeight: 600 }}>{edu.degree}</p>
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{edu.institution} • {edu.year}</p>
                    </div>
                  ))}
                </div>
              )}

              {profile?.experience?.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Experience</p>
                  {profile.experience.map((exp, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                      <p style={{ fontWeight: 600 }}>{exp.title}</p>
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{exp.company} • {exp.years} year(s)</p>
                      {exp.description && <p style={{ fontSize: 13, marginTop: 4 }}>{exp.description}</p>}
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
