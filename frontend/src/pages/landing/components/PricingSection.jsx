import { CheckCircle2, ArrowRight } from './icons';

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    period: 'forever',
    desc: 'For small teams getting started with AI hiring.',
    features: [
      'Up to 3 active job postings',
      'AI resume parsing (50/month)',
      'Match Score ranking',
      'Basic analytics',
      'Email support',
    ],
    cta: 'Get Started Free',
    href: '/register',
    highlight: false,
  },
  {
    name: 'Professional',
    price: '$79',
    period: '/recruiter/month',
    desc: 'For growing teams that need full pipeline control.',
    features: [
      'Unlimited job postings',
      'Unlimited resume parsing',
      'Bias detection on all job posts',
      'Interview scheduling & calendar',
      'CSV/JSON report exports',
      'Priority email + chat support',
    ],
    cta: 'Start 14-Day Trial',
    href: '/register',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For organizations with advanced compliance needs.',
    features: [
      'Everything in Professional',
      'SSO & SAML integration',
      'Custom RBAC policies',
      'Audit log exports & SIEM',
      'Dedicated success manager',
      'SLA with 99.9% uptime',
    ],
    cta: 'Contact Sales',
    href: '#',
    highlight: false,
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-surface-900">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary-400 tracking-wide uppercase mb-3">Pricing</p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            Simple plans that scale with your team
          </h2>
          <p className="text-surface-400 text-lg">
            Start free. Upgrade when you need more horsepower. No credit card required.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-7 flex flex-col ${
                plan.highlight
                  ? 'border-primary-500/40 bg-gradient-to-b from-primary-500/10 to-surface-900/80 shadow-card-hover ring-1 ring-primary-500/20'
                  : 'border-surface-700/40 glass-card hover:border-surface-600'
              } transition-all duration-200`}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 text-xs font-bold text-white bg-gradient-to-r from-primary-600 to-primary-500 rounded-full shadow-sm shadow-primary-600/30">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-heading font-bold text-lg text-white mb-1">{plan.name}</h3>
                <p className="text-sm text-surface-500 mb-4">{plan.desc}</p>
                <div className="flex items-baseline gap-1">
                  <span className="font-heading text-4xl font-bold text-white">{plan.price}</span>
                  {plan.period && (
                    <span className="text-sm text-surface-500">{plan.period}</span>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4.5 h-4.5 text-accent-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-surface-300">{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href={plan.href}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  plan.highlight
                    ? 'text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 shadow-md shadow-primary-600/20 hover:shadow-lg'
                    : 'text-primary-300 bg-primary-500/10 hover:bg-primary-500/20'
                }`}
              >
                {plan.cta}
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
