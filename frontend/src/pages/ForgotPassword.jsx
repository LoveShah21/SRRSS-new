import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await authAPI.forgotPassword({ email });
      setMessage(res.data?.message || 'If that email exists, a password reset link has been sent.');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to process forgot password request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        <h1>Forgot Password</h1>
        <p className="auth-subtitle">Enter your email and we will send you a reset link.</p>

        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="forgot-email">Email</label>
            <input
              id="forgot-email"
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoFocus
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 24 }}>
            {loading ? <div className="spinner" /> : 'Send Reset Link'}
          </button>
        </form>

        <div className="auth-footer">
          Remembered your password? <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
