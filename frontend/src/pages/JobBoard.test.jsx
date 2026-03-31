import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import JobBoard from './JobBoard'

// Mock AuthContext
const mockAuthContext = {
  user: {
    email: 'test@example.com',
    role: 'candidate',
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
    getById: vi.fn(),
  },
}))

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('JobBoard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockJobs = [
    {
      _id: '1',
      title: 'Full Stack Developer',
      description: 'Build web applications',
      requiredSkills: ['React', 'Node.js'],
      location: 'Remote',
      status: 'open',
      createdAt: new Date().toISOString(),
    },
    {
      _id: '2',
      title: 'Backend Engineer',
      description: 'Build APIs',
      requiredSkills: ['Python', 'Django'],
      location: 'NYC',
      status: 'open',
      createdAt: new Date().toISOString(),
    },
  ]

  it('should render job board header', () => {
    const { jobsAPI } = require('../services/api')
    jobsAPI.getAll.mockResolvedValue({ data: { jobs: [], pagination: { total: 0, pages: 0 } } })

    renderWithProviders(<JobBoard />)

    expect(screen.getByText(/job board/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/search/i)).toBeInTheDocument()
  })

  it('should display list of jobs', async () => {
    const { jobsAPI } = require('../services/api')
    jobsAPI.getAll.mockResolvedValue({
      data: { jobs: mockJobs, pagination: { total: 2, pages: 1 } },
    })

    renderWithProviders(<JobBoard />)

    await waitFor(() => {
      expect(screen.getByText('Full Stack Developer')).toBeInTheDocument()
      expect(screen.getByText('Backend Engineer')).toBeInTheDocument()
    })
  })

  it('should display job skills', async () => {
    const { jobsAPI } = require('../services/api')
    jobsAPI.getAll.mockResolvedValue({
      data: { jobs: mockJobs, pagination: { total: 2, pages: 1 } },
    })

    renderWithProviders(<JobBoard />)

    await waitFor(() => {
      expect(screen.getByText('React')).toBeInTheDocument()
      expect(screen.getByText('Node.js')).toBeInTheDocument()
      expect(screen.getByText('Python')).toBeInTheDocument()
    })
  })

  it('should filter jobs by search term', async () => {
    const { jobsAPI } = require('../services/api')
    jobsAPI.getAll.mockResolvedValue({
      data: { jobs: mockJobs, pagination: { total: 2, pages: 1 } },
    })

    renderWithProviders(<JobBoard />)

    const searchInput = screen.getByLabelText(/search jobs/i)
    await userEvent.type(searchInput, 'Backend')

    await waitFor(() => {
      expect(jobsAPI.getAll).toHaveBeenCalledWith({ search: 'Backend' })
    })
  })

  it('should filter jobs by location', async () => {
    const { jobsAPI } = require('../services/api')
    jobsAPI.getAll.mockResolvedValue({
      data: { jobs: mockJobs, pagination: { total: 2, pages: 1 } },
    })

    renderWithProviders(<JobBoard />)

    const locationInput = screen.getByPlaceholderText(/location/i)
    await userEvent.type(locationInput, 'NYC')

    await waitFor(() => {
      expect(jobsAPI.getAll).toHaveBeenCalledWith({ location: 'NYC' })
    })
  })

  it('should display pagination controls', async () => {
    const { jobsAPI } = require('../services/api')
    jobsAPI.getAll.mockResolvedValue({
      data: { jobs: mockJobs, pagination: { total: 20, pages: 2 } },
    })

    renderWithProviders(<JobBoard />)

    await waitFor(() => {
      expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument()
    })
  })

  it('should navigate to job detail on click', async () => {
    const { jobsAPI } = require('../services/api')
    jobsAPI.getAll.mockResolvedValue({
      data: { jobs: mockJobs, pagination: { total: 2, pages: 1 } },
    })

    renderWithProviders(<JobBoard />)

    await waitFor(() => {
      const jobLink = screen.getByText('Full Stack Developer').closest('a')
      expect(jobLink).toHaveAttribute('href', '/jobs/1')
    })
  })

  it('should display loading state', () => {
    const { jobsAPI } = require('../services/api')
    jobsAPI.getAll.mockImplementation(() => new Promise(() => {}))

    renderWithProviders(<JobBoard />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should display empty state when no jobs', async () => {
    const { jobsAPI } = require('../services/api')
    jobsAPI.getAll.mockResolvedValue({
      data: { jobs: [], pagination: { total: 0, pages: 0 } },
    })

    renderWithProviders(<JobBoard />)

    await waitFor(() => {
      expect(screen.getByText(/no jobs found/i)).toBeInTheDocument()
    })
  })

  it('should handle API error', async () => {
    const { jobsAPI } = require('../services/api')
    jobsAPI.getAll.mockRejectedValue({ message: 'Failed to load' })

    renderWithProviders(<JobBoard />)

    await waitFor(() => {
      expect(screen.getByText(/error loading jobs/i)).toBeInTheDocument()
    })
  })
})
