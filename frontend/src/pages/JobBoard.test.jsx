import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import JobBoard from './JobBoard';
import * as api from '../services/api';

const mockAuthContext = {
  user: { email: 'test@example.com', role: 'candidate' },
  isRecruiter: false,
  isAdmin: false,
};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

function renderWithProviders(component) {
  return render(<BrowserRouter>{component}</BrowserRouter>);
}

describe('JobBoard Page', () => {
  const mockJobs = [
    {
      _id: '1',
      title: 'Full Stack Developer',
      description: 'Build web applications',
      requiredSkills: ['React', 'Node.js'],
      location: 'Remote',
      experienceMin: 2,
      experienceMax: 5,
      status: 'open',
    },
    {
      _id: '2',
      title: 'Backend Engineer',
      description: 'Build APIs',
      requiredSkills: ['Python', 'Django'],
      location: 'NYC',
      experienceMin: 3,
      experienceMax: 6,
      status: 'open',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    mockAuthContext.isRecruiter = false;
    mockAuthContext.isAdmin = false;
  });

  it('renders header and search input', async () => {
    vi.spyOn(api.jobsAPI, 'list').mockResolvedValue({ data: { jobs: [] } });

    renderWithProviders(<JobBoard />);

    expect(screen.getByText(/job board/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search jobs by title/i)).toBeInTheDocument();
  });

  it('displays jobs and skills', async () => {
    vi.spyOn(api.jobsAPI, 'list').mockResolvedValue({ data: { jobs: mockJobs } });

    renderWithProviders(<JobBoard />);

    await waitFor(() => {
      expect(screen.getByText('Full Stack Developer')).toBeInTheDocument();
      expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('Python')).toBeInTheDocument();
    });
  });

  it('calls list with the submitted search term', async () => {
    const listSpy = vi.spyOn(api.jobsAPI, 'list').mockResolvedValue({ data: { jobs: mockJobs } });

    renderWithProviders(<JobBoard />);

    const searchInput = screen.getByPlaceholderText(/search jobs by title/i);
    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, 'Backend');
    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(listSpy).toHaveBeenLastCalledWith({ search: 'Backend' });
    });
  });

  it('shows loading spinner while list is pending', () => {
    vi.spyOn(api.jobsAPI, 'list').mockImplementation(() => new Promise(() => {}));

    const { container } = renderWithProviders(<JobBoard />);
    expect(container.querySelector('.spinner-lg')).toBeInTheDocument();
  });

  it('shows empty state when no jobs are returned', async () => {
    vi.spyOn(api.jobsAPI, 'list').mockResolvedValue({ data: { jobs: [] } });

    renderWithProviders(<JobBoard />);

    await waitFor(() => {
      expect(screen.getByText(/no jobs found/i)).toBeInTheDocument();
    });
  });

  it('shows create button for recruiter', async () => {
    mockAuthContext.isRecruiter = true;
    vi.spyOn(api.jobsAPI, 'list').mockResolvedValue({ data: { jobs: [] } });

    renderWithProviders(<JobBoard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ post new job/i })).toBeInTheDocument();
    });
  });
});
