import '../../landing.css';
import LandingNav from './components/LandingNav';
import Hero from './components/Hero';
import SocialProof from './components/SocialProof';
import HowItWorks from './components/HowItWorks';
import FeatureGrid from './components/FeatureGrid';
import PersonaTabs from './components/PersonaTabs';
import AnalyticsSection from './components/AnalyticsSection';
import SecuritySection from './components/SecuritySection';
import PricingSection from './components/PricingSection';
import CtaBanner from './components/CtaBanner';
import Footer from './components/Footer';
import { useAuth } from '../../context/AuthContext';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-surface-950 text-surface-50 font-body antialiased">
      {!isAuthenticated && <LandingNav />}
      <main>
        <Hero />
        <SocialProof />
        <HowItWorks />
        <FeatureGrid />
        <PersonaTabs />
        <AnalyticsSection />
        <SecuritySection />
        <PricingSection />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  );
}
