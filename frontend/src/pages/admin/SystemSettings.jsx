import { useState } from 'react';

const SETTINGS_SECTIONS = [
  {
    id: 'email',
    title: '📧 Email Configuration',
    description: 'Configure SMTP settings for email notifications',
    fields: [
      { key: 'EMAIL_ENABLED', label: 'Enable Email Notifications', type: 'toggle', default: false },
      { key: 'SMTP_HOST', label: 'SMTP Host', type: 'text', default: 'smtp.gmail.com' },
      { key: 'SMTP_PORT', label: 'SMTP Port', type: 'number', default: 587 },
      { key: 'SMTP_SECURE', label: 'Use TLS', type: 'toggle', default: false },
      { key: 'SMTP_USER', label: 'SMTP Username', type: 'text', default: '' },
      { key: 'SMTP_PASS', label: 'SMTP Password', type: 'password', default: '' },
      { key: 'EMAIL_FROM', label: 'Sender Email', type: 'text', default: 'noreply@srrss.com' },
    ],
  },
  {
    id: 'storage',
    title: '💾 Cloudflare R2 Storage',
    description: 'Configure object storage for resume uploads',
    fields: [
      { key: 'R2_ACCOUNT_ID', label: 'Cloudflare Account ID', type: 'text', default: '' },
      { key: 'R2_ACCESS_KEY_ID', label: 'R2 Access Key ID', type: 'text', default: '' },
      { key: 'R2_SECRET_ACCESS_KEY', label: 'R2 Secret Access Key', type: 'password', default: '' },
      { key: 'R2_BUCKET_NAME', label: 'R2 Bucket Name', type: 'text', default: 'srrss' },
      { key: 'R2_ENDPOINT', label: 'R2 Endpoint (optional)', type: 'text', default: '' },
      { key: 'R2_PUBLIC_URL', label: 'R2 Public URL (optional)', type: 'text', default: '' },
    ],
  },
  {
    id: 'calendar',
    title: '📅 Google Calendar Integration',
    description: 'Sync interview schedules with Google Calendar',
    fields: [
      { key: 'CALENDAR_ENABLED', label: 'Enable Calendar Sync', type: 'toggle', default: false },
      { key: 'GOOGLE_CLIENT_EMAIL', label: 'Service Account Email', type: 'text', default: '' },
      { key: 'GOOGLE_PRIVATE_KEY', label: 'Service Account Private Key', type: 'password', default: '' },
      { key: 'CALENDAR_ID', label: 'Calendar ID', type: 'text', default: 'primary' },
    ],
  },
  {
    id: 'security',
    title: '🔒 Security Settings',
    description: 'Configure authentication and security parameters',
    fields: [
      { key: 'JWT_EXPIRES_IN', label: 'Access Token Expiry', type: 'text', default: '15m' },
      { key: 'JWT_REFRESH_EXPIRES_IN', label: 'Refresh Token Expiry', type: 'text', default: '7d' },
      { key: 'RATE_LIMIT_GENERAL', label: 'General Rate Limit (per 15min)', type: 'number', default: 200 },
      { key: 'RATE_LIMIT_AUTH', label: 'Auth Rate Limit (per 15min)', type: 'number', default: 20 },
      { key: 'RATE_LIMIT_UPLOAD', label: 'Upload Rate Limit (per hour)', type: 'number', default: 10 },
    ],
  },
];

export default function SystemSettings() {
  const [activeSection, setActiveSection] = useState('email');
  const [settings, setSettings] = useState(() => {
    const initial = {};
    SETTINGS_SECTIONS.forEach(section => {
      section.fields.forEach(field => {
        initial[field.key] = localStorage.getItem(`srrss_setting_${field.key}`) ?? field.default;
      });
    });
    return initial;
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setError('');
    setSaved(false);
    try {
      Object.entries(settings).forEach(([key, value]) => {
        localStorage.setItem(`srrss_setting_${key}`, String(value));
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save settings');
    }
  };

  const currentSection = SETTINGS_SECTIONS.find(s => s.id === activeSection);

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 900 }}>
        <div className="page-header fade-in">
          <h1 className="page-title">
            System <span className="text-gradient">Settings</span>
          </h1>
          <p className="page-subtitle">Configure email, storage, calendar, and security settings</p>
        </div>

        {error && (
          <div className="alert alert-error fade-in" style={{ marginBottom: 16 }}>❌ {error}</div>
        )}
        {saved && (
          <div className="alert alert-success fade-in" style={{ marginBottom: 16 }}>✅ Settings saved successfully!</div>
        )}

        <div style={{ display: 'flex', gap: 24 }}>
          {/* Sidebar */}
          <div style={{ width: 220, flexShrink: 0 }}>
            <div className="card" style={{ padding: 8 }}>
              {SETTINGS_SECTIONS.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 12px',
                    textAlign: 'left',
                    background: activeSection === section.id ? 'var(--color-primary-alpha)' : 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: activeSection === section.id ? 600 : 400,
                    color: activeSection === section.id ? 'var(--color-primary)' : 'inherit',
                    marginBottom: 4,
                  }}
                >
                  {section.title}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1 }}>
            <div className="card slide-up">
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{currentSection.title}</h2>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 24 }}>
                {currentSection.description}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {currentSection.fields.map(field => (
                  <div key={field.key}>
                    <label className="form-label" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {field.label}
                      {field.default !== '' && field.default !== false && (
                        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>(default: {field.default})</span>
                      )}
                    </label>
                    {field.type === 'toggle' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                          onClick={() => handleChange(field.key, !settings[field.key])}
                          style={{
                            width: 48,
                            height: 24,
                            borderRadius: 12,
                            background: settings[field.key] === 'true' || settings[field.key] === true ? 'var(--color-primary)' : 'var(--color-border)',
                            border: 'none',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'background 0.2s',
                          }}
                        >
                          <div style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: 'white',
                            position: 'absolute',
                            top: 2,
                            left: settings[field.key] === 'true' || settings[field.key] === true ? 26 : 2,
                            transition: 'left 0.2s',
                          }} />
                        </button>
                        <span style={{ fontSize: 14 }}>
                          {settings[field.key] === 'true' || settings[field.key] === true ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    ) : (
                      <input
                        className="form-input"
                        type={field.type}
                        value={settings[field.key] || ''}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        placeholder={field.default || field.label}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
                <button className="btn btn-primary" onClick={handleSave}>
                  💾 Save Settings
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    const reset = {};
                    currentSection.fields.forEach(f => { reset[f.key] = f.default; });
                    setSettings(prev => ({ ...prev, ...reset }));
                  }}
                >
                  Reset to Defaults
                </button>
              </div>

              <div style={{ marginTop: 24, padding: 16, background: 'var(--color-surface)', borderRadius: 8, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>⚠️ Note</p>
                <p>Settings are stored locally in your browser. For production deployments, configure these values as environment variables on your server. See <code style={{ background: 'var(--color-border)', padding: '2px 6px', borderRadius: 4 }}>DEPLOYMENT.md</code> for details.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
