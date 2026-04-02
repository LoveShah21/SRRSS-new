import { ArrowRight } from './icons';

export default function CtaBanner() {
  return (
    <section className="py-20 md:py-24 px-4 sm:px-6 lg:px-8 bg-surface-950 overflow-hidden relative">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-primary-500/10 blur-3xl"></div>
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-accent-400/5 blur-3xl"></div>
      </div>

      <div className="max-w-3xl mx-auto text-center relative z-10">
        <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-5">
          Ready to stop reading resumes manually?
        </h2>
        <p className="text-lg text-surface-400 mb-8 max-w-xl mx-auto">
          Join hundreds of hiring teams that have cut their time-to-hire in half with SRRSS.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="#pricing"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-surface-950 bg-white hover:bg-surface-100 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
          >
            Book a Live Demo
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="/register"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white border border-surface-600 hover:border-primary-500/50 bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-200 cursor-pointer"
          >
            Start Free Trial
          </a>
        </div>
      </div>
    </section>
  );
}
