import { Briefcase, FileText, Sparkles, Calendar } from './icons';

const steps = [
  {
    num: '01',
    icon: Briefcase,
    title: 'Post a job',
    desc: 'Create a role with requirements, skills, and experience range. The AI flags biased language in real time.',
    preview: {
      label: 'Senior React Engineer',
      tags: ['React', 'TypeScript', 'Node.js'],
      status: 'Bias-checked',
    },
  },
  {
    num: '02',
    icon: FileText,
    title: 'Candidates apply',
    desc: 'Applicants upload a PDF or DOCX resume. The parser extracts skills, experience, and education automatically.',
    preview: {
      label: 'resume_sarah_chen.pdf',
      tags: ['5 yrs exp', '12 skills', 'MS CS'],
      status: 'Parsed in 2s',
    },
  },
  {
    num: '03',
    icon: Sparkles,
    title: 'AI scores everyone',
    desc: 'Each candidate gets a semantic Match Score (0–100) based on skills overlap, experience depth, and education fit.',
    preview: {
      label: 'Match Score',
      tags: ['Skills 35/40', 'Exp 30/35', 'Edu 22/25'],
      status: 'Score: 87/100',
    },
  },
  {
    num: '04',
    icon: Calendar,
    title: 'Shortlist and interview',
    desc: 'Review ranked candidates, update statuses, and schedule interviews — all with conflict detection built in.',
    preview: {
      label: '3 shortlisted',
      tags: ['Video call', 'Mar 28, 2pm', '60 min'],
      status: 'Scheduled',
    },
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-surface-950">
      <div className="max-w-7xl mx-auto">
        {/* Heading */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary-400 tracking-wide uppercase mb-3">How It Works</p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            From job post to hire, in four steps
          </h2>
          <p className="text-surface-400 text-lg">
            No manual resume screening. No spreadsheet tracking. Just post, match, and hire.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="group relative glass-card rounded-2xl p-6 hover:border-primary-500/30 transition-all duration-300 cursor-pointer"
              >
                {/* Step Number */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-bold text-primary-400 font-heading">{step.num}</span>
                  <div className="w-10 h-10 rounded-xl bg-primary-500/10 group-hover:bg-primary-500/20 flex items-center justify-center transition-colors duration-200">
                    <Icon className="w-5 h-5 text-primary-400" />
                  </div>
                </div>

                <h3 className="font-heading font-bold text-lg text-white mb-2">{step.title}</h3>
                <p className="text-sm text-surface-400 leading-relaxed mb-5">{step.desc}</p>

                {/* Mini UI Preview */}
                <div className="rounded-xl bg-surface-800/60 border border-surface-700/40 p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-surface-200 truncate">{step.preview.label}</span>
                    <span className="text-[10px] font-medium text-accent-400 bg-accent-400/10 px-2 py-0.5 rounded-full shrink-0 ml-2">
                      {step.preview.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {step.preview.tags.map((t) => (
                      <span key={t} className="text-[10px] font-medium text-primary-300 bg-primary-500/10 px-2 py-0.5 rounded-md">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
