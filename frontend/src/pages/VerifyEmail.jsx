import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Verification token is missing.');
        return;
      }

      try {
        await authAPI.verifyToken(token);
        setStatus('success');
        setMessage('Your email has been verified successfully! You can now log in to your account.');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Email verification failed. The token may be invalid or expired.');
      }
    };

    verifyToken();
  }, [token]);

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
          {status === 'error' && (
            <div style={{ fontSize: 64, marginBottom: 16, color: 'var(--color-danger)' }}>✕</div>
          )}
        </div>

        <h1 style={{ textAlign: 'center' }}>
          {status === 'loading' && 'Verifying Email...'}
          {status === 'success' && 'Email Verified!'}
          {status === 'error' && 'Verification Failed'}
        </h1>

        <p style={{ textAlign: 'center', marginBottom: 24, color: 'var(--color-text-secondary)' }}>
          {message}
        </p>

        {status === 'success' && (
          <Link to="/login" className="btn btn-primary" style={{ display: 'block', textAlign: 'center' }}>
            Go to Login
          </Link>
        )}

        {status === 'error' && (
          <Link to="/" className="btn btn-secondary" style={{ display: 'block', textAlign: 'center' }}>
            Back to Home
          </Link>
        )}
      </div>
    </div>
  );
}
