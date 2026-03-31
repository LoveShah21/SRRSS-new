import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import Login from './Login'

// Mock AuthContext
const mockLogin = vi.fn()
const mockAuthContext = {
  login: mockLogin,
  isAuthenticated: false,
}

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}))

// Mock API
vi.mock('../services/api', () => ({
  authAPI: {
    login: vi.fn(),
  },
}))

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render login form', () => {
    renderWithProviders(<Login />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument()
  })

  it('should display validation error for empty email', async () => {
    renderWithProviders(<Login />)

    const passwordInput = screen.getByLabelText(/password/i)
    fireEvent.change(passwordInput, { target: { value: 'password123' } })

    const loginButton = screen.getByRole('button', { name: /login/i })
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    })
  })

  it('should display validation error for empty password', async () => {
    renderWithProviders(<Login />)

    const emailInput = screen.getByLabelText(/email/i)
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

    const loginButton = screen.getByRole('button', { name: /login/i })
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('should call login function with valid credentials', async () => {
    const { authAPI } = require('../services/api')
    authAPI.login.mockResolvedValue({
      data: {
        token: 'test-token',
        user: { email: 'test@example.com', role: 'candidate' },
      },
    })

    renderWithProviders(<Login />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)

    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'password123')

    const loginButton = screen.getByRole('button', { name: /login/i })
    await userEvent.click(loginButton)

    await waitFor(() => {
      expect(authAPI.login).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })

  it('should display error message on login failure', async () => {
    const { authAPI } = require('../services/api')
    authAPI.login.mockRejectedValue({
      response: { data: { error: 'Invalid credentials' } },
    })

    renderWithProviders(<Login />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)

    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'wrongpassword')

    const loginButton = screen.getByRole('button', { name: /login/i })
    await userEvent.click(loginButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })

  it('should navigate to register page when clicking register link', async () => {
    renderWithProviders(<Login />)

    const registerLink = screen.getByText(/sign up/i)
    await userEvent.click(registerLink)

    // Navigation is handled by react-router
    expect(registerLink).toHaveAttribute('href', '/register')
  })
})
