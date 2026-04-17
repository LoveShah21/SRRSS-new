import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import * as api from '../services/api';

const mockAuthContext = {
  user: {
    email: 'test@example.com',
    role: 'candidate',
    profile: { firstName: 'Test', lastName: 'User' },
  },
  isCandidate: true,
  isRecruiter: false,
  isAdmin: false,
};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

function renderWithProviders(component) {
  return render(<BrowserRouter>{component}</BrowserRouter>);
}

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    mockAuthContext.user.role = 'candidate';
    mockAuthContext.user.profile.firstName = 'Test';
    mockAuthContext.isCandidate = true;
    mockAuthContext.isRecruiter = false;
    mockAuthContext.isAdmin = false;
  });

  it('renders welcome message for candidate', async () => {
    vi.spyOn(api.jobsAPI, 'list').mockResolvedValue({ data: { jobs: [] } });
    vi.spyOn(api.applicationsAPI, 'myApplications').mockResolvedValue({ data: { applications: [] } });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.getByText(/latest openings/i)).toBeInTheDocument();
    });
  });

  it('shows recruiter stats', async () => {
    mockAuthContext.user.role = 'recruiter';
    mockAuthContext.user.profile.firstName = 'Recruiter';
    mockAuthContext.isCandidate = false;
    mockAuthContext.isRecruiter = true;

    vi.spyOn(api.jobsAPI, 'list').mockResolvedValue({ data: { jobs: [] } });
    vi.spyOn(api.recruiterAPI, 'analytics').mockResolvedValue({
      data: {
        analytics: {
          jobs: { total: 4, open: 3 },
          applications: { total: 25 },
          interviews: { scheduled: 5 },
        },
      },
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/total jobs/i)).toBeInTheDocument();
      expect(screen.getByText(/active jobs/i)).toBeInTheDocument();
      expect(screen.getByText(/interviews/i)).toBeInTheDocument();
    });
  });

  it('shows admin stats', async () => {
    mockAuthContext.user.role = 'admin';
    mockAuthContext.user.profile.firstName = 'Admin';
    mockAuthContext.isCandidate = false;
    mockAuthContext.isAdmin = true;

    vi.spyOn(api.jobsAPI, 'list').mockResolvedValue({ data: { jobs: [] } });
    vi.spyOn(api.adminAPI, 'analytics').mockResolvedValue({
      data: {
        analytics: {
          users: { total: 100 },
          jobs: { total: 50, open: 12 },
          applications: { total: 200, lastWeek: 40 },
        },
      },
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/total users/i)).toBeInTheDocument();
      expect(screen.getByText(/open jobs/i)).toBeInTheDocument();
    });
  });

  it('shows loading spinner while API is pending', () => {
    vi.spyOn(api.jobsAPI, 'list').mockImplementation(() => new Promise(() => {}));
    vi.spyOn(api.applicationsAPI, 'myApplications').mockResolvedValue({ data: { applications: [] } });

    const { container } = renderWithProviders(<Dashboard />);
    expect(container.querySelector('.spinner-lg')).toBeInTheDocument();
  });
});
