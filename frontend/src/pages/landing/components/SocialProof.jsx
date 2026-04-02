import { Building2 } from './icons';

const LOGOS = [
  'TechNova', 'Meridian HR', 'QuantumLeap', 'Bridgepoint', 'Axiom Talent', 'CrestLine',
];

export default function SocialProof() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-surface-900/80 border-y border-surface-700/30">
      <div className="max-w-7xl mx-auto">
        {/* Stat Line */}
        <p className="text-center text-sm font-medium text-surface-500 tracking-wide uppercase mb-8">
          Trusted by talent teams at forward-thinking companies
        </p>

        {/* Logo Marquee */}
        <div className="relative overflow-hidden" aria-hidden="true">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-surface-900/80 to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-surface-900/80 to-transparent z-10 pointer-events-none"></div>

          <div className="flex animate-marquee">
            {[...LOGOS, ...LOGOS].map((name, i) => (
              <div
                key={`${name}-${i}`}
                className="flex items-center gap-2.5 px-10 shrink-0"
              >
                <Building2 className="w-6 h-6 text-surface-600" />
                <span className="text-lg font-heading font-semibold text-surface-500 whitespace-nowrap">
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Proof stat */}
        <div className="flex flex-wrap justify-center gap-8 mt-10">
          {[
            { value: '73%', desc: 'reduction in time-to-hire' },
            { value: '50K+', desc: 'resumes screened monthly' },
            { value: '4.8/5', desc: 'recruiter satisfaction' },
          ].map((s) => (
            <div key={s.desc} className="text-center">
              <div className="text-2xl font-heading font-bold gradient-text">{s.value}</div>
              <div className="text-sm text-surface-500 mt-0.5">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
