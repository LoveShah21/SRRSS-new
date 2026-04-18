import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

export default function Login() {
  const [searchParams] = useSearchParams();
  const verifyPending = searchParams.get('verifyPending') === '1';
  const pendingEmail = searchParams.get('email') || '';
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: pendingEmail, password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState(pendingEmail);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResendMessage('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.error || 'Login failed. Please try again.';
      setError(message);
      if (err.response?.status === 403 && /verify your email/i.test(message)) {
        setUnverifiedEmail(form.email);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) {
      setError('Enter your email to resend verification.');
      return;
    }
    setResendLoading(true);
    setError('');
    setResendMessage('');
    try {
      const res = await authAPI.resendVerification({ email: unverifiedEmail });
      setResendMessage(res.data?.message || 'Verification email sent.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend verification email.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        <h1>
          Welcome to <span className="text-gradient">SRRSS</span>
        </h1>
        <p className="auth-subtitle">Smart Recruitment & Resume Screening System</p>

        {verifyPending && (
          <div className="alert alert-warning" style={{ marginBottom: 12 }}>
            Please verify your email before logging in.
          </div>
        )}
        {error && <div className="alert alert-error">{error}</div>}
        {resendMessage && <div className="alert alert-success">{resendMessage}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className="form-input"
              type="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              onBlur={(e) => setUnverifiedEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label" htmlFor="login-password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => setShowPassword((prev) => !prev)}
                style={{ position: 'absolute', right: 4, top: 4, width: 36, height: 36 }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div style={{ marginTop: 8, textAlign: 'right' }}>
              <Link to="/forgot-password" style={{ fontSize: 13 }}>
                Forgot password?
              </Link>
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            style={{ marginTop: 24 }}
          >
            {loading ? <div className="spinner" /> : 'Sign In'}
          </button>
        </form>

        {(verifyPending || /verify your email/i.test(error)) && (
          <button
            type="button"
            className="btn btn-secondary btn-full"
            onClick={handleResendVerification}
            disabled={resendLoading}
            style={{ marginTop: 12 }}
          >
            {resendLoading ? <div className="spinner" /> : 'Resend Verification Email'}
          </button>
        )}

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
}
