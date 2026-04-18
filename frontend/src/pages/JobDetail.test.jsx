import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import JobDetail from './JobDetail';
import * as api from '../services/api';

const mockNavigate = vi.fn();
const mockAuthContext = {
  isCandidate: true,
  isRecruiter: false,
  isAdmin: false,
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'job-1' }),
  };
});

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

function renderWithProviders(component) {
  return render(<BrowserRouter>{component}</BrowserRouter>);
}

describe('JobDetail Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    mockAuthContext.isCandidate = true;
    mockAuthContext.isRecruiter = false;
    mockAuthContext.isAdmin = false;
  });

  it('shows current application status and hides submit button for already-applied candidate', async () => {
    vi.spyOn(api.jobsAPI, 'get').mockResolvedValue({
      data: {
        job: {
          _id: 'job-1',
          title: 'Frontend Developer',
          description: 'Build polished UI experiences',
          status: 'open',
          requiredSkills: ['React'],
        },
      },
    });
    vi.spyOn(api.applicationsAPI, 'myApplications').mockResolvedValue({
      data: {
        applications: [
          {
            _id: 'app-1',
            jobId: { _id: 'job-1' },
            status: 'shortlisted',
            appliedAt: new Date().toISOString(),
            statusHistory: [{ changedAt: new Date().toISOString() }],
          },
        ],
      },
    });

    renderWithProviders(<JobDetail />);

    await waitFor(() => {
      expect(screen.getByText(/your application status/i)).toBeInTheDocument();
      expect(screen.getByText(/shortlisted/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /submit application/i })).not.toBeInTheDocument();
    });
  });

  it('surfaces recruiter application-load errors instead of failing silently', async () => {
    mockAuthContext.isCandidate = false;
    mockAuthContext.isRecruiter = true;

    vi.spyOn(api.jobsAPI, 'get').mockResolvedValue({
      data: {
        job: {
          _id: 'job-1',
          title: 'Backend Developer',
          description: 'Build APIs',
          status: 'open',
          requiredSkills: ['Node.js'],
        },
      },
    });
    vi.spyOn(api.applicationsAPI, 'forJob').mockRejectedValue({
      response: { data: { error: 'Failed to load applications for this job.' } },
    });

    renderWithProviders(<JobDetail />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load applications for this job/i)).toBeInTheDocument();
    });
  });
});
