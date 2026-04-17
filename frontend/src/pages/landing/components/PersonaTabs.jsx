import { useState } from 'react';
import { Users, UserCheck, ShieldCheck, CheckCircle2 } from './icons';

const personas = [
  {
    id: 'recruiter',
    icon: Users,
    label: 'For Recruiters',
    headline: 'Fill roles in days, not weeks',
    benefits: [
      'AI-ranked candidate lists — no more reading every resume',
      'One-click interview scheduling with conflict detection',
      'Exportable reports (JSON/CSV) for hiring committees',
    ],
    cta: { text: 'Start Free Trial', href: '/register' },
    color: 'primary',
  },
  {
    id: 'candidate',
    icon: UserCheck,
    label: 'For Candidates',
    headline: 'Apply once, get matched everywhere',
    benefits: [
      'Drag-and-drop resume upload that auto-fills your profile',
      'Real-time status tracking — always know where you stand',
      'Fair evaluation: bias-checked job descriptions and blind scoring',
    ],
    cta: { text: 'Upload Your Resume', href: '/register' },
    color: 'accent',
  },
  {
    id: 'admin',
    icon: ShieldCheck,
    label: 'For Admins',
    headline: 'Full visibility, full control',
    benefits: [
      'Role-based access control for every user and action',
      'Comprehensive audit logs with filtering and export',
      'System-wide analytics: time-to-hire, source quality, pipeline health',
    ],
    cta: { text: 'Book a Demo', href: '#pricing' },
    color: 'primary',
  },
];

export default function PersonaTabs() {
  const [active, setActive] = useState('recruiter');
  const current = personas.find((p) => p.id === active);

  return (
    <section id="persona-tabs" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-surface-950">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-sm font-semibold text-primary-400 tracking-wide uppercase mb-3">Built For Everyone</p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            One platform, three experiences
          </h2>
          <p className="text-surface-400 text-lg">
            Whether you&apos;re hiring, applying, or managing — SRRSS adapts to you.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex glass-card rounded-2xl p-1.5 gap-1">
            {personas.map((p) => {
              const Icon = p.icon;
              const isActive = active === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setActive(p.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-md shadow-primary-600/20'
                      : 'text-surface-400 hover:text-white hover:bg-white/5'
                  }`}
                  aria-pressed={isActive}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Persona Card */}
        <div className="max-w-2xl mx-auto">
          <div
            key={current.id}
            className="glass-card rounded-2xl p-8 md:p-10 shadow-card animate-fade-in"
          >
            <h3 className="font-heading text-2xl font-bold text-white mb-2">
              {current.headline}
            </h3>
            <p className="text-surface-500 text-sm mb-6">{current.label}</p>

            <ul className="space-y-4 mb-8">
              {current.benefits.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent-400 mt-0.5 shrink-0" />
                  <span className="text-surface-300 text-[15px] leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>

            <a
              href={current.cta.href}
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 rounded-xl shadow-sm shadow-primary-600/20 hover:shadow-md transition-all duration-200 cursor-pointer"
            >
              {current.cta.text}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
