import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LandingPage from './pages/landing/LandingPage';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import JobBoard from './pages/JobBoard';
import JobDetail from './pages/JobDetail';
import MyApplications from './pages/MyApplications';
import AdminConsole from './pages/AdminConsole';

// New pages — Batch 5 implementation
import Profile from './pages/candidate/Profile';
import MyInterviews from './pages/candidate/MyInterviews';
import CandidateList from './pages/recruiter/CandidateList';
import InterviewScheduler from './pages/recruiter/InterviewScheduler';
import Reports from './pages/recruiter/Reports';
import RecruiterAnalytics from './pages/recruiter/RecruiterAnalytics';
import AuditLogs from './pages/admin/AuditLogs';

function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-center">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return children;
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      {isAuthenticated && <Navbar />}
      <Routes>
        {/* Public — Landing Page */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />

        {/* Protected — All Roles */}
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/jobs" element={
          <ProtectedRoute><JobBoard /></ProtectedRoute>
        } />
        <Route path="/jobs/:id" element={
          <ProtectedRoute><JobDetail /></ProtectedRoute>
        } />

        {/* Candidate Routes */}
        <Route path="/applications" element={
          <ProtectedRoute roles={['candidate']}><MyApplications /></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute roles={['candidate']}><Profile /></ProtectedRoute>
        } />
        <Route path="/my-interviews" element={
          <ProtectedRoute roles={['candidate']}><MyInterviews /></ProtectedRoute>
        } />

        {/* Recruiter Routes */}
        <Route path="/candidates" element={
          <ProtectedRoute roles={['recruiter', 'admin']}><CandidateList /></ProtectedRoute>
        } />
        <Route path="/interviews" element={
          <ProtectedRoute roles={['recruiter', 'admin']}><InterviewScheduler /></ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute roles={['recruiter', 'admin']}><Reports /></ProtectedRoute>
        } />
        <Route path="/recruiter/analytics" element={
          <ProtectedRoute roles={['recruiter', 'admin']}><RecruiterAnalytics /></ProtectedRoute>
        } />
        <Route path="/recruiter/analytics" element={
          <ProtectedRoute roles={['recruiter', 'admin']}><RecruiterAnalytics /></ProtectedRoute>
        } />

        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}><AdminConsole /></ProtectedRoute>
        } />
        <Route path="/admin/audit-logs" element={
          <ProtectedRoute roles={['admin']}><AuditLogs /></ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />} />
      </Routes>
    </>
  );
}
