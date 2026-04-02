import { FileText, Target, Eye, BarChart3, ShieldCheck } from './icons';

const features = [
  {
    icon: FileText,
    title: 'Automated Resume Parsing',
    desc: 'Upload a PDF or DOCX. Our AI extracts skills, experience, education, and contact details in seconds — no manual data entry.',
    span: 'md:col-span-2',
    preview: (
      <div className="mt-4 grid grid-cols-3 gap-2">
        {['12 Skills', '3 Roles', 'MS Computer Science'].map((item) => (
          <div key={item} className="text-center p-2.5 rounded-xl bg-primary-500/10 border border-primary-500/15">
            <span className="text-xs font-semibold text-primary-300">{item}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Target,
    title: 'Smart Ranking & Match Score',
    desc: 'Every candidate gets a 0–100 score based on semantic skill matching, experience depth, and education relevance.',
    span: '',
    preview: (
      <div className="mt-4 space-y-2">
        {[
          { label: 'Skills', value: 35, max: 40, color: 'bg-primary-400' },
          { label: 'Experience', value: 28, max: 35, color: 'bg-accent-400' },
          { label: 'Education', value: 22, max: 25, color: 'bg-amber-400' },
        ].map((bar) => (
          <div key={bar.label} className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-surface-500 w-16">{bar.label}</span>
            <div className="flex-1 h-2 rounded-full bg-surface-700 overflow-hidden">
              <div
                className={`h-full rounded-full ${bar.color}`}
                style={{ width: `${(bar.value / bar.max) * 100}%` }}
              ></div>
            </div>
            <span className="text-[11px] font-bold text-surface-300 w-10 text-right">{bar.value}/{bar.max}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Eye,
    title: 'Bias Detection',
    desc: 'AI scans job descriptions for gendered, ageist, or exclusionary language and suggests inclusive alternatives.',
    span: '',
    preview: (
      <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
        <div className="flex items-start gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0"></div>
          <div>
            <p className="text-xs font-semibold text-amber-300">&quot;young and energetic&quot; → potential age bias</p>
            <p className="text-[11px] text-amber-400/70 mt-0.5">Suggestion: &quot;motivated and driven&quot;</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    desc: 'Track time-to-hire, source quality, conversion rates, and hiring funnel health in real time.',
    span: '',
    preview: (
      <div className="mt-4 flex items-end gap-1.5 h-16 px-1">
        {[35, 52, 45, 68, 72, 55, 80, 64, 90, 78, 85, 92].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm bg-gradient-to-t from-primary-500 to-primary-400 opacity-50 hover:opacity-100 transition-opacity duration-150"
            style={{ height: `${h}%` }}
          ></div>
        ))}
      </div>
    ),
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Access Control',
    desc: 'Candidates, recruiters, and admins each see only what they need. Secure JWT auth, audit logging, and data isolation come standard.',
    span: 'md:col-span-2',
    preview: (
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { role: 'Candidate', perms: 'Apply · Profile · Status' },
          { role: 'Recruiter', perms: 'Jobs · Rank · Interview' },
          { role: 'Admin', perms: 'Users · Logs · Analytics' },
        ].map((r) => (
          <div key={r.role} className="flex-1 min-w-[140px] p-2.5 rounded-xl bg-surface-800/50 border border-surface-700/40 text-center">
            <div className="text-xs font-bold text-primary-300">{r.role}</div>
            <div className="text-[10px] text-surface-500 mt-0.5">{r.perms}</div>
          </div>
        ))}
      </div>
    ),
  },
];

export default function FeatureGrid() {
  return (
    <section id="features" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-surface-900">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary-400 tracking-wide uppercase mb-3">Features</p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            Everything your hiring team actually needs
          </h2>
          <p className="text-surface-400 text-lg">
            Built for real recruitment workflows — not another HR buzzword dashboard.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid md:grid-cols-3 gap-5">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`group glass-card rounded-2xl p-6 hover:border-primary-500/30 transition-all duration-300 cursor-pointer ${f.span}`}
              >
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 group-hover:bg-primary-500/20 flex items-center justify-center transition-colors duration-200 mb-4">
                  <Icon className="w-5 h-5 text-primary-400" />
                </div>
                <h3 className="font-heading font-bold text-lg text-white mb-2">{f.title}</h3>
                <p className="text-sm text-surface-400 leading-relaxed">{f.desc}</p>
                {f.preview}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
