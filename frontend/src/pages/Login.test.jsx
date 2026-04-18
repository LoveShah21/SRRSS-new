import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import Login from './Login';
import * as api from '../services/api';

const mockNavigate = vi.fn();
const mockLogin = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    isAuthenticated: false,
  }),
}));

function renderWithProviders(component) {
  return render(<BrowserRouter>{component}</BrowserRouter>);
}

function renderWithRoute(component, route) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {component}
    </MemoryRouter>
  );
}

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form', () => {
    renderWithProviders(<Login />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
  });

  it('calls auth login with valid credentials', async () => {
    mockLogin.mockResolvedValue({});
    renderWithProviders(<Login />);

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('displays backend error message when login fails', async () => {
    mockLogin.mockRejectedValue({
      response: { data: { message: 'Invalid credentials' } },
    });
    renderWithProviders(<Login />);

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('contains register link', () => {
    renderWithProviders(<Login />);
    const registerLink = screen.getByRole('link', { name: /create one/i });
    expect(registerLink).toHaveAttribute('href', '/register');
  });

  it('shows verify-pending UI and resends verification email', async () => {
    vi.spyOn(api.authAPI, 'resendVerification').mockResolvedValue({
      data: { message: 'Verification email sent.' },
    });

    renderWithRoute(<Login />, '/login?verifyPending=1&email=verify%40example.com');

    expect(screen.getByText(/please verify your email before logging in/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /resend verification email/i }));

    await waitFor(() => {
      expect(api.authAPI.resendVerification).toHaveBeenCalledWith({ email: 'verify@example.com' });
      expect(screen.getByText(/verification email sent/i)).toBeInTheDocument();
    });
  });
});
