import { ArrowRight, ChevronRight, Sparkles, Clock, TrendingUp } from './icons';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

export default function Hero() {
  const { isAuthenticated } = useAuth();
  return (
    <section className="hero-gradient pt-32 pb-20 md:pt-40 md:pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Copy */}
          <div className="max-w-xl animate-slide-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 mb-6">
              <Sparkles className="w-4 h-4 text-primary-400" />
              <span className="text-sm font-medium text-primary-300">AI-Powered Recruitment</span>
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl lg:text-[3.5rem] font-bold leading-[1.1] tracking-tight text-white mb-6">
              Hire smarter with AI that reads{' '}
              <span className="gradient-text">every resume</span>{' '}
              for you
            </h1>

            <p className="text-lg text-surface-400 leading-relaxed mb-4 max-w-lg">
              SRRSS parses resumes automatically, matches candidates to your jobs with a semantic Match Score, and flags biased language — so you fill roles faster and fairer.
            </p>

            {/* Stat pills */}
            <div className="flex flex-wrap gap-3 mb-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-800/60 border border-surface-700 text-sm">
                <Clock className="w-4 h-4 text-accent-400" />
                <span className="font-medium text-surface-200">3× faster screening</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-800/60 border border-surface-700 text-sm">
                <TrendingUp className="w-4 h-4 text-primary-400" />
                <span className="font-medium text-surface-200">85% less manual review</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 rounded-xl shadow-lg shadow-primary-600/25 hover:shadow-xl hover:shadow-primary-500/30 transition-all duration-200 cursor-pointer"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <a
                    href="#pricing"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 rounded-xl shadow-lg shadow-primary-600/25 hover:shadow-xl hover:shadow-primary-500/30 transition-all duration-200 cursor-pointer"
                  >
                    Book a Live Demo
                    <ArrowRight className="w-4 h-4" />
                  </a>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-surface-200 bg-white/5 border border-surface-600 hover:border-primary-500/50 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 cursor-pointer"
                  >
                    See Candidate Experience
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Right — UI Mock */}
          <div className="animate-slide-up-delay lg:pl-4">
            <div className="relative">
              {/* Glow */}
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary-500/15 to-accent-400/10 blur-2xl"></div>

              {/* Main Card */}
              <div className="relative glass-card rounded-2xl p-5 shadow-card">
                {/* Top bar */}
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-surface-700/50">
                  <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
                  <span className="ml-3 text-xs text-surface-500 font-medium">SRRSS Dashboard</span>
                </div>

                {/* Candidate Rows */}
                <div className="space-y-3 mb-4">
                  {[
                    { name: 'Sarah Chen', role: 'Senior Engineer', score: 94, bar: 'w-[94%]', color: 'bg-green-500' },
                    { name: 'Marcus Johnson', role: 'Full Stack Dev', score: 87, bar: 'w-[87%]', color: 'bg-green-500' },
                    { name: 'Priya Patel', role: 'Backend Engineer', score: 72, bar: 'w-[72%]', color: 'bg-primary-400' },
                    { name: 'Alex Rivera', role: 'Junior Dev', score: 58, bar: 'w-[58%]', color: 'bg-amber-500' },
                  ].map((c) => (
                    <div key={c.name} className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/50 border border-surface-700/40 hover:border-primary-500/30 transition-colors duration-200 cursor-pointer group">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-600/30 to-primary-500/20 flex items-center justify-center text-primary-300 font-semibold text-xs shrink-0">
                        {c.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-surface-100 truncate">{c.name}</div>
                        <div className="text-xs text-surface-500">{c.role}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-sm font-bold ${c.score >= 80 ? 'text-green-400' : c.score >= 60 ? 'text-primary-400' : 'text-amber-400'}`}>
                          {c.score}
                        </div>
                        <div className="w-16 h-1.5 rounded-full bg-surface-700 mt-1 overflow-hidden">
                          <div className={`h-full rounded-full ${c.color} ${c.bar}`}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Open Roles', value: '24' },
                    { label: 'Avg. Time-to-Hire', value: '12d' },
                    { label: 'Screened Today', value: '186' },
                  ].map((s) => (
                    <div key={s.label} className="text-center p-2.5 rounded-xl bg-primary-500/10 border border-primary-500/15">
                      <div className="text-lg font-bold text-primary-300 font-heading">{s.value}</div>
                      <div className="text-[11px] text-surface-500 font-medium">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
