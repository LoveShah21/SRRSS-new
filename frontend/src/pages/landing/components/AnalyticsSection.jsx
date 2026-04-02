import { TrendingUp, Clock, Award } from './icons';

export default function AnalyticsSection() {
  return (
    <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-surface-900">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Charts */}
          <div className="order-2 lg:order-1">
            <div className="glass-card rounded-2xl p-6">
              {/* Time-to-Hire Chart */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-white">Time-to-Hire (days)</h4>
                  <span className="text-xs font-medium text-accent-400 bg-accent-400/10 px-2 py-0.5 rounded-full">
                    ↓ 42% improvement
                  </span>
                </div>
                <div className="flex items-end gap-2 h-32">
                  {[
                    { month: 'Jan', before: 28, after: 22 },
                    { month: 'Feb', before: 32, after: 19 },
                    { month: 'Mar', before: 25, after: 16 },
                    { month: 'Apr', before: 30, after: 14 },
                    { month: 'May', before: 27, after: 12 },
                    { month: 'Jun', before: 29, after: 11 },
                  ].map((d) => (
                    <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex gap-0.5 items-end h-24">
                        <div
                          className="flex-1 rounded-t-sm bg-surface-600"
                          style={{ height: `${(d.before / 35) * 100}%` }}
                          title={`Before: ${d.before} days`}
                        ></div>
                        <div
                          className="flex-1 rounded-t-sm bg-gradient-to-t from-primary-600 to-primary-400"
                          style={{ height: `${(d.after / 35) * 100}%` }}
                          title={`After: ${d.after} days`}
                        ></div>
                      </div>
                      <span className="text-[10px] text-surface-500 font-medium">{d.month}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-2 rounded-sm bg-surface-600"></div>
                    <span className="text-[10px] text-surface-500">Before SRRSS</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-2 rounded-sm bg-primary-500"></div>
                    <span className="text-[10px] text-surface-500">With SRRSS</span>
                  </div>
                </div>
              </div>

              {/* Source Quality */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">Source Quality</h4>
                <div className="space-y-2.5">
                  {[
                    { source: 'Career Page', quality: 82, color: 'bg-primary-500' },
                    { source: 'LinkedIn', quality: 74, color: 'bg-primary-400' },
                    { source: 'Referrals', quality: 91, color: 'bg-accent-400' },
                    { source: 'Job Boards', quality: 58, color: 'bg-amber-400' },
                  ].map((s) => (
                    <div key={s.source} className="flex items-center gap-3">
                      <span className="text-xs text-surface-500 w-24 shrink-0">{s.source}</span>
                      <div className="flex-1 h-2.5 rounded-full bg-surface-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${s.color} transition-all duration-500`}
                          style={{ width: `${s.quality}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold text-surface-300 w-8 text-right">{s.quality}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right — Copy */}
          <div className="order-1 lg:order-2">
            <p className="text-sm font-semibold text-primary-400 tracking-wide uppercase mb-3">Analytics</p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-tight mb-6">
              Measure what matters in your hiring pipeline
            </h2>
            <p className="text-surface-400 text-lg leading-relaxed mb-8">
              SRRSS captures data at every stage — from application to offer. No extra setup, no guessing.
            </p>

            <div className="space-y-5">
              {[
                {
                  icon: Clock,
                  title: 'Time-to-hire tracking',
                  desc: 'See how long each stage takes and where bottlenecks form.',
                },
                {
                  icon: TrendingUp,
                  title: 'Source quality analysis',
                  desc: 'Compare channels by match score and conversion rate.',
                },
                {
                  icon: Award,
                  title: 'Hiring funnel health',
                  desc: 'Monitor applied → shortlisted → interview → hired conversion.',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4.5 h-4.5 text-primary-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-0.5">{item.title}</h4>
                      <p className="text-sm text-surface-500">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
