import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function VerifyEmail() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(token ? 'loading' : 'pending');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    setEmail(searchParams.get('email') || '');
  }, [searchParams]);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus('pending');
        setMessage('Check your inbox and click the latest verification link we sent you.');
        return;
      }

      try {
        await authAPI.verifyToken(token);
        setStatus('success');
        setMessage('Your email has been verified successfully! You can now log in to your account.');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || err.response?.data?.error || 'Email verification failed. The token may be invalid or expired.');
      }
    };

    verifyToken();
  }, [token]);

  const handleResendVerification = async () => {
    if (!email) {
      setMessage('Enter your email to resend a fresh verification link.');
      return;
    }
    setResendLoading(true);
    try {
      const res = await authAPI.resendVerification({ email });
      setStatus('error');
      setMessage(res.data?.message || 'If that email exists, a verification link has been sent.');
    } catch (err) {
      setMessage(err.response?.data?.message || err.response?.data?.error || 'Failed to resend verification email.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          {status === 'loading' && (
            <div className="spinner spinner-lg" style={{ margin: '0 auto' }} />
          )}
          {status === 'success' && (
            <div style={{ fontSize: 64, marginBottom: 16 }}>✓</div>
          )}
          {(status === 'error' || status === 'pending') && (
            <div style={{ fontSize: 64, marginBottom: 16, color: 'var(--color-danger)' }}>✕</div>
          )}
        </div>

        <h1 style={{ textAlign: 'center' }}>
          {status === 'loading' && 'Verifying Email...'}
          {status === 'success' && 'Email Verified!'}
          {status === 'pending' && 'Verify Your Email'}
          {status === 'error' && 'Verification Failed'}
        </h1>

        <p style={{ textAlign: 'center', marginBottom: 24, color: 'var(--color-text-secondary)' }}>
          {message || (status === 'pending'
            ? 'Click the verification link in your inbox to activate your account.'
            : '')}
        </p>

        {status === 'success' && (
          <Link to="/login" className="btn btn-primary" style={{ display: 'block', textAlign: 'center' }}>
            Go to Login
          </Link>
        )}

        {(status === 'error' || status === 'pending') && (
          <>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label" htmlFor="verify-email">Email</label>
              <input
                id="verify-email"
                className="form-input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-full"
              onClick={handleResendVerification}
              disabled={resendLoading}
            >
              {resendLoading ? <div className="spinner" /> : 'Resend Verification Email'}
            </button>
            <Link to="/login" className="btn btn-primary btn-full" style={{ display: 'block', textAlign: 'center', marginTop: 10 }}>
              Go to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
