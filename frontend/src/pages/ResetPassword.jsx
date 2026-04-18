import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../services/api';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('Reset token is missing.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.resetPassword({ token, password });
      setMessage(res.data?.message || 'Password reset successful.');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        <h1>Reset Password</h1>
        <p className="auth-subtitle">Enter a new password for your account.</p>

        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="reset-password">New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="reset-password"
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
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
          </div>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label" htmlFor="reset-confirm-password">Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="reset-confirm-password"
                className="form-input"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                style={{ position: 'absolute', right: 4, top: 4, width: 36, height: 36 }}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 24 }}>
            {loading ? <div className="spinner" /> : 'Reset Password'}
          </button>
        </form>

        <div className="auth-footer">
          Back to <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
}
