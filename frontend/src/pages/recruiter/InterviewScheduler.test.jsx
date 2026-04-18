import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InterviewScheduler from './InterviewScheduler';
import * as api from '../../services/api';

function renderWithRoute(component, route) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {component}
    </MemoryRouter>
  );
}

describe('InterviewScheduler Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('pre-fills job and application when opened with applicationId query param', async () => {
    vi.spyOn(api.interviewsAPI, 'list').mockResolvedValue({ data: { interviews: [] } });
    vi.spyOn(api.jobsAPI, 'list').mockResolvedValue({
      data: {
        jobs: [{ _id: 'job-1', title: 'SRE Engineer' }],
      },
    });
    vi.spyOn(api.applicationsAPI, 'getById').mockResolvedValue({
      data: {
        application: {
          _id: 'app-42',
          jobId: { _id: 'job-1' },
        },
      },
    });
    vi.spyOn(api.applicationsAPI, 'forJob').mockResolvedValue({
      data: {
        applications: [
          {
            _id: 'app-42',
            matchScore: 86,
            candidateId: { profile: { firstName: 'Pat', lastName: 'Lee' } },
          },
        ],
      },
    });

    renderWithRoute(<InterviewScheduler />, '/interviews?applicationId=app-42');

    await waitFor(() => {
      expect(api.applicationsAPI.getById).toHaveBeenCalledWith('app-42');
      expect(api.applicationsAPI.forJob).toHaveBeenCalledWith('job-1', { limit: 100 });
      expect(screen.getByText(/schedule new interview/i)).toBeInTheDocument();
    });

    const combos = screen.getAllByRole('combobox');
    expect(combos[0]).toHaveValue('job-1');
    expect(combos[1]).toHaveValue('app-42');
  });
});
