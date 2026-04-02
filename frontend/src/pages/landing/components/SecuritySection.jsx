import { Lock, ShieldCheck, Eye, Users } from './icons';

const items = [
  {
    icon: Lock,
    title: 'JWT Authentication',
    desc: 'Industry-standard token-based auth with automatic refresh and secure logout.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Access',
    desc: 'Each user type sees only their data. Admins control everything, candidates see only their own.',
  },
  {
    icon: Eye,
    title: 'Audit Logging',
    desc: 'Every mutation is tracked — who did what, when, to which record.',
  },
  {
    icon: Users,
    title: 'No Data Selling',
    desc: 'Candidate data is never sold, shared, or used for advertising. Period.',
  },
];

export default function SecuritySection() {
  return (
    <section id="security" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-surface-950">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary-400 tracking-wide uppercase mb-3">Security & Privacy</p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            Your data stays your data
          </h2>
          <p className="text-surface-400 text-lg">
            SRRSS is designed with enterprise security from day one — not bolted on later.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="glass-card rounded-2xl p-6 hover:border-primary-500/20 transition-colors duration-200"
              >
                <div className="w-10 h-10 rounded-xl bg-surface-700/60 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-surface-300" />
                </div>
                <h3 className="font-heading font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-surface-400 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-4 mt-12">
          {['HTTPS Encrypted', 'GDPR-Ready', 'SOC 2 Aligned', 'No PII Exposure'].map((badge) => (
            <div
              key={badge}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm font-medium text-surface-300"
            >
              <ShieldCheck className="w-4 h-4 text-accent-400" />
              {badge}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
