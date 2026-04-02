export default function Footer() {
  const year = new Date().getFullYear();

  const columns = [
    {
      title: 'Product',
      links: [
        { label: 'Features', href: '#features' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'How It Works', href: '#how-it-works' },
        { label: 'Security', href: '#security' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'API Documentation', href: '/docs/API_DOCS.md' },
        { label: 'Deployment Guide', href: '/docs/DEPLOYMENT.md' },
        { label: 'User Guide', href: '/docs/USER_GUIDE.md' },
        { label: 'System Status', href: '#' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', href: '#' },
        { label: 'Careers', href: '#' },
        { label: 'Privacy Policy', href: '#' },
        { label: 'Terms of Service', href: '#' },
      ],
    },
  ];

  return (
    <footer className="bg-surface-950 text-white/60 pt-16 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <span className="text-white font-heading font-bold text-xs">SR</span>
              </div>
              <span className="font-heading font-bold text-lg text-white tracking-tight">SRRSS</span>
            </div>
            <p className="text-sm leading-relaxed mb-4 max-w-[240px]">
              AI-powered recruitment that&apos;s faster, fairer, and built for modern hiring teams.
            </p>
            <p className="text-xs text-white/30">
              Smart Recruitment &amp; Resume Screening System
            </p>
          </div>

          {/* Link Columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-white mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-white/50 hover:text-white transition-colors duration-200 cursor-pointer"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30">
            &copy; {year} SRRSS. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-white/30 hover:text-white/60 transition-colors cursor-pointer">
              Privacy
            </a>
            <a href="#" className="text-xs text-white/30 hover:text-white/60 transition-colors cursor-pointer">
              Terms
            </a>
            <a href="#" className="text-xs text-white/30 hover:text-white/60 transition-colors cursor-pointer">
              Support
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
