import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Dashboard from './Dashboard'

// Mock AuthContext
const mockAuthContext = {
  user: {
    email: 'test@example.com',
    role: 'candidate',
    profile: { firstName: 'Test', lastName: 'User' },
  },
  isAuthenticated: true,
}

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}))

// Mock API
vi.mock('../services/api', () => ({
  jobsAPI: {
    getAll: vi.fn(),
  },
  applicationsAPI: {
    getMyApplications: vi.fn(),
  },
}))

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render dashboard welcome message', () => {
    renderWithProviders(<Dashboard />)

    expect(screen.getByText(/welcome/i)).toBeInTheDocument()
    expect(screen.getByText(/test user/i)).toBeInTheDocument()
  })

  it('should display candidate dashboard options', async () => {
    const { jobsAPI } = require('../services/api')
    jobsAPI.getAll.mockResolvedValue({ data: { jobs: [], pagination: { total: 0 } } })

    renderWithProviders(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/browse jobs/i)).toBeInTheDocument()
      expect(screen.getByText(/my applications/i)).toBeInTheDocument()
    })
  })

  it('should display recruiter dashboard options', async () => {
    mockAuthContext.user.role = 'recruiter'
    mockAuthContext.user.profile.firstName = 'Recruiter'

    const { jobsAPI } = require('../services/api')
    jobsAPI.getAll.mockResolvedValue({ data: { jobs: [], pagination: { total: 0 } } })

    renderWithProviders(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/post job/i)).toBeInTheDocument()
      expect(screen.getByText(/my jobs/i)).toBeInTheDocument()
    })

    // Reset mock
    mockAuthContext.user.role = 'candidate'
    mockAuthContext.user.profile.firstName = 'Test'
  })

  it('should display admin dashboard options', async () => {
    mockAuthContext.user.role = 'admin'
    mockAuthContext.user.profile.firstName = 'Admin'

    const { jobsAPI } = require('../services/api')
    jobsAPI.getAll.mockResolvedValue({ data: { jobs: [], pagination: { total: 0 } } })

    renderWithProviders(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/admin console/i)).toBeInTheDocument()
      expect(screen.getByText(/manage users/i)).toBeInTheDocument()
    })

    // Reset mock
    mockAuthContext.user.role = 'candidate'
    mockAuthContext.user.profile.firstName = 'Test'
  })

  it('should display loading state initially', () => {
    const { jobsAPI } = require('../services/api')
    jobsAPI.getAll.mockImplementation(() => new Promise(() => {}))

    renderWithProviders(<Dashboard />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should display job statistics', async () => {
    const { jobsAPI } = require('../services/api')
    jobsAPI.getAll.mockResolvedValue({
      data: {
        jobs: [{ title: 'Job 1' }, { title: 'Job 2' }],
        pagination: { total: 2 },
      },
    })

    renderWithProviders(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/2 open positions/i)).toBeInTheDocument()
    })
  })

  it('should handle API error gracefully', async () => {
    const { jobsAPI } = require('../services/api')
    jobsAPI.getAll.mockRejectedValue({ message: 'Network error' })

    renderWithProviders(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/error loading jobs/i)).toBeInTheDocument()
    })
  })
})
