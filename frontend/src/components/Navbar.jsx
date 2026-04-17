import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isAdmin, isCandidate, isRecruiter } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.profile?.firstName || user?.firstName || '';
  const lastName = user?.profile?.lastName || user?.lastName || '';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user
    ? `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
    : '??';

  return (
    <nav className="topbar">
      <div className="topbar-brand">
        <span className="logo-accent">SRRSS</span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }}>
          Smart Recruitment
        </span>
      </div>

      <div className="topbar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `topbar-link ${isActive ? 'active' : ''}`}>
          Dashboard
        </NavLink>
        <NavLink to="/jobs" className={({ isActive }) => `topbar-link ${isActive ? 'active' : ''}`}>
          Jobs
        </NavLink>
        {isCandidate && (
          <>
            <NavLink to="/applications" className={({ isActive }) => `topbar-link ${isActive ? 'active' : ''}`}>
              My Applications
            </NavLink>
            <NavLink to="/my-interviews" className={({ isActive }) => `topbar-link ${isActive ? 'active' : ''}`}>
              My Interviews
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => `topbar-link ${isActive ? 'active' : ''}`}>
              Profile
            </NavLink>
          </>
        )}
        {(isRecruiter || isAdmin) && (
          <>
            <NavLink to="/candidates" className={({ isActive }) => `topbar-link ${isActive ? 'active' : ''}`}>
              Candidates
            </NavLink>
            <NavLink to="/interviews" className={({ isActive }) => `topbar-link ${isActive ? 'active' : ''}`}>
              Interviews
            </NavLink>
            <NavLink to="/reports" className={({ isActive }) => `topbar-link ${isActive ? 'active' : ''}`}>
              Reports
            </NavLink>
            <NavLink to="/recruiter/analytics" className={({ isActive }) => `topbar-link ${isActive ? 'active' : ''}`}>
              Analytics
            </NavLink>
          </>
        )}
        {isAdmin && (
          <>
            <NavLink to="/admin" className={({ isActive }) => `topbar-link ${isActive ? 'active' : ''}`}>
              Admin
            </NavLink>
            <NavLink to="/admin/audit-logs" className={({ isActive }) => `topbar-link ${isActive ? 'active' : ''}`}>
              Audit Logs
            </NavLink>
          </>
        )}
      </div>

      <div className="topbar-user">
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{firstName} {lastName}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</div>
        </div>
        <div className="avatar">{initials}</div>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
