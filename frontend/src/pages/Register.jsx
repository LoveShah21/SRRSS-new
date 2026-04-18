import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'candidate',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const result = await register(form);
      if (result?.verificationRequired) {
        navigate(`/login?verifyPending=1&email=${encodeURIComponent(result.email || form.email)}`);
        return;
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        <h1>
          Join <span className="text-gradient">SRRSS</span>
        </h1>
        <p className="auth-subtitle">Create your account to get started</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="flex gap-md">
            <div className="form-group flex-1">
              <label className="form-label" htmlFor="reg-first">First Name</label>
              <input id="reg-first" className="form-input" value={form.firstName} onChange={set('firstName')} required />
            </div>
            <div className="form-group flex-1">
              <label className="form-label" htmlFor="reg-last">Last Name</label>
              <input id="reg-last" className="form-input" value={form.lastName} onChange={set('lastName')} required />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label" htmlFor="reg-email">Email</label>
            <input id="reg-email" className="form-input" type="email" value={form.email} onChange={set('email')} required />
          </div>
          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label" htmlFor="reg-password">Password</label>
            <input id="reg-password" className="form-input" type="password" placeholder="At least 6 characters" value={form.password} onChange={set('password')} required />
          </div>
          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label" htmlFor="reg-role">I am a</label>
            <select id="reg-role" className="form-select" value={form.role} onChange={set('role')}>
              <option value="candidate">Candidate</option>
              <option value="recruiter">Recruiter</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 24 }}>
            {loading ? <div className="spinner" /> : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
