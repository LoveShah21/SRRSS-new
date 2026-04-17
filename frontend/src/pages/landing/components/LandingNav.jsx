import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from './icons';
import { useAuth } from '../../../context/AuthContext';

export default function LandingNav() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  const links = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'For Recruiters', href: '#persona-tabs' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Security', href: '#security' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav
        className="mx-4 mt-4 rounded-2xl glass-card px-6 py-3 flex items-center justify-between"
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 cursor-pointer" aria-label="SRRSS Home">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-400 flex items-center justify-center">
            <span className="text-white font-heading font-bold text-sm">SR</span>
          </div>
          <span className="font-heading font-bold text-lg text-white tracking-tight">
            SRRSS
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="px-4 py-2 text-sm font-medium text-surface-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors duration-200 cursor-pointer"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="px-4 py-2 text-sm font-medium text-surface-300 hover:text-white transition-colors duration-200 cursor-pointer"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-surface-300 hover:text-white transition-colors duration-200 cursor-pointer"
            >
              Log In
            </Link>
          )}
          <Link
            to={isAuthenticated ? '/dashboard' : '/register'}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 rounded-xl shadow-sm shadow-primary-500/20 hover:shadow-md hover:shadow-primary-500/30 transition-all duration-200 cursor-pointer"
          >
            {isAuthenticated ? 'Open Workspace' : 'Get Started Free'}
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-lg text-surface-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile Dropdown */}
      {open && (
        <div className="md:hidden mx-4 mt-2 rounded-2xl glass-card p-4 flex flex-col gap-1 animate-slide-up">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="px-4 py-3 text-sm font-medium text-surface-300 hover:text-white rounded-xl hover:bg-white/5 transition-colors duration-200 cursor-pointer"
            >
              {l.label}
            </a>
          ))}
          <hr className="my-2 border-surface-700" />
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              onClick={() => setOpen(false)}
              className="px-4 py-3 text-sm font-medium text-surface-300 text-center rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="px-4 py-3 text-sm font-medium text-surface-300 text-center rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            >
              Log In
            </Link>
          )}
          <Link
            to={isAuthenticated ? '/dashboard' : '/register'}
            onClick={() => setOpen(false)}
            className="px-4 py-3 text-sm font-semibold text-white text-center bg-gradient-to-r from-primary-600 to-primary-500 rounded-xl cursor-pointer"
          >
            {isAuthenticated ? 'Open Workspace' : 'Get Started Free'}
          </Link>
        </div>
      )}
    </header>
  );
}
