/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowRight, 
  Sparkles, 
  TrendingUp, 
  Check, 
  Star, 
  Search, 
  Zap, 
  Shield, 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Globe, 
  LineChart, 
  ExternalLink,
  Lock,
  MessageSquare,
  AlertCircle,
  Clock,
  Briefcase,
  Menu,
  X
} from 'lucide-react';

import { GOALS, SERVICES, CASE_STUDIES, PROCESS_STEPS, TESTIMONIALS } from './data';
import { GoalId, CaseStudy } from './types';
import { submitLead } from './lib/leads';
import { trackPageView } from './lib/analytics';
import { trackPageViewStart } from './lib/tracker';

// Subcomponents
import LeadModal from './components/LeadModal';
import InteractiveChart from './components/InteractiveChart';
import Starburst from './components/Starburst';
import Marquee from './components/Marquee';
import Logo from './components/Logo';

export default function App() {
  // Navigation active state and mobile menu toggle
  const [activeSection, setActiveSection] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Compute currentView dynamically based on location.pathname
  const path = location.pathname;
  let currentView: 'home' | 'services' | 'quote' | 'case-studies' | 'audit' | 'privacy-policy' | 'terms-of-conversion' | 'case-study-detail' = 'home';
  let caseStudyId: string | null = null;
  if (path.startsWith('/case-study/')) {
    currentView = 'case-study-detail';
    caseStudyId = path.replace('/case-study/', '');
  } else if (path === '/services') {
    currentView = 'services';
  } else if (path === '/case-studies') {
    currentView = 'case-studies';
  } else if (path === '/quote' || path === '/free-quote') {
    currentView = 'quote';
  } else if (path === '/audit' || path === '/free-audit') {
    currentView = 'audit';
  } else if (path === '/privacy-policy') {
    currentView = 'privacy-policy';
  } else if (path === '/terms-of-service' || path === '/terms-of-conversion') {
    currentView = 'terms-of-conversion';
  }

  const navigateTo = (view: 'home' | 'services' | 'quote' | 'case-studies' | 'audit' | 'privacy-policy' | 'terms-of-conversion' | 'case-study-detail', hash?: string) => {
    let targetPath = '/';
    if (view === 'services') targetPath = '/services';
    else if (view === 'case-studies') targetPath = '/case-studies';
    else if (view === 'quote') targetPath = '/quote';
    else if (view === 'audit') targetPath = '/audit';
    else if (view === 'privacy-policy') targetPath = '/privacy-policy';
    else if (view === 'terms-of-conversion') targetPath = '/terms-of-service';

    setIsMobileMenuOpen(false);

    if (location.pathname === '/' && view === 'home' && hash) {
      const el = document.getElementById(hash.replace('#', ''));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    navigate({
      pathname: targetPath,
      hash: hash || '',
    });
  };

  const handleGetPlan = (goal: GoalId) => {
    setSelectedGoal(goal);
    navigateTo('quote');
  };

  const handleFooterServiceClick = (serviceId: string) => {
    setQuoteService(serviceId);
    setServiceHighlighted(true);
    navigateTo('quote');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Quote page form states
  const [quoteName, setQuoteName] = useState('');
  const [quoteEmail, setQuoteEmail] = useState('');
  const [quoteWebsite, setQuoteWebsite] = useState('');
  const [quoteCompany, setQuoteCompany] = useState('');
  const [quotePhone, setQuotePhone] = useState('');
  const [quoteBudget, setQuoteBudget] = useState('< $1,000/month');
  const [quoteService, setQuoteService] = useState('seo');
  const [serviceHighlighted, setServiceHighlighted] = useState(false);
  const [quoteComments, setQuoteComments] = useState('');
  const [quoteIsSubmitting, setQuoteIsSubmitting] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [quoteIsSuccess, setQuoteIsSuccess] = useState(false);

  // Audit page form states
  const [auditName, setAuditName] = useState('');
  const [auditEmail, setAuditEmail] = useState('');
  const [auditWebsite, setAuditWebsite] = useState('');
  const [auditCompany, setAuditCompany] = useState('');
  const [auditPhone, setAuditPhone] = useState('');
  const [auditCompetitor, setAuditCompetitor] = useState('');
  const [auditGoal, setAuditGoal] = useState<GoalId>('revenue');
  const [auditComments, setAuditComments] = useState('');
  const [auditIsSubmitting, setAuditIsSubmitting] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [auditIsSuccess, setAuditIsSuccess] = useState(false);

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteWebsite || !quoteEmail || !quoteName || !quoteCompany || !quotePhone) return;

    setQuoteIsSubmitting(true);
    setQuoteError('');
    try {
      await submitLead({
        type: 'quote_page',
        goal: selectedGoal,
        service: quoteService,
        website: quoteWebsite,
        email: quoteEmail,
        name: quoteName,
        company: quoteCompany,
        phone: quotePhone,
        budget: quoteBudget,
        comments: quoteComments,
      });
      setQuoteIsSuccess(true);
    } catch {
      setQuoteError('Something went wrong sending your request. Please try again, or call us at 817 409 8408.');
    } finally {
      setQuoteIsSubmitting(false);
    }
  };

  const handleAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditWebsite || !auditEmail) return;

    setAuditIsSubmitting(true);
    setAuditError('');
    try {
      await submitLead({
        type: 'audit_page',
        goal: auditGoal,
        website: auditWebsite,
        email: auditEmail,
        name: auditName,
        company: auditCompany,
        competitor: auditCompetitor,
        phone: auditPhone,
        budget: 'N/A (Free Audit)',
        comments: auditComments,
      });
      setAuditIsSuccess(true);
    } catch {
      setAuditError('Something went wrong sending your request. Please try again, or call us at 817 409 8408.');
    } finally {
      setAuditIsSubmitting(false);
    }
  };

  // Goals-picker states
  const [selectedGoal, setSelectedGoal] = useState<GoalId>('revenue');
  const activeGoal = GOALS.find(g => g.id === selectedGoal) || GOALS[0];

  // Lead Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'quote' | 'audit'>('quote');

  // Testimonial index
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  // Local Storage Lead tracker states (leads entered during session)
  const [localLeads, setLocalLeads] = useState<any[]>([]);
  const [showLeadDrawer, setShowLeadDrawer] = useState(false);

  // Analytics: send SPA page views on route change. The initial load is
  // covered by the gtag config snippet (GA4) and initTracker (first-party),
  // so skip the first render.
  const isFirstPageView = useRef(true);
  useEffect(() => {
    if (isFirstPageView.current) {
      isFirstPageView.current = false;
      return;
    }
    trackPageView(location.pathname + location.search);
    trackPageViewStart(location.pathname + location.search);
  }, [location.pathname, location.search]);

  // Initialize currentView based on URL params on location changes
  useEffect(() => {
    // 1. Set dynamic titles
    switch (currentView) {
      case 'home':
        document.title = "OptimizeIndex | Revenue-First SEO & GEO Performance Agency";
        break;
      case 'services':
        document.title = "Our Services | OptimizeIndex Growth Engine";
        break;
      case 'case-studies':
        document.title = "Case Studies | OptimizeIndex Performance Portfolio";
        break;
      case 'case-study-detail': {
        const study = CASE_STUDIES.find(cs => cs.id === caseStudyId);
        document.title = study ? `${study.client} Case Study | OptimizeIndex` : "Case Study | OptimizeIndex";
        break;
      }
      case 'audit':
        document.title = "Claim Your Free 15-Point Performance Audit | OptimizeIndex";
        break;
      case 'quote':
        document.title = "Get a Free Revenue Growth Quote | OptimizeIndex";
        break;
      case 'privacy-policy':
        document.title = "Privacy Policy | OptimizeIndex";
        break;
      case 'terms-of-conversion':
        document.title = "Terms of Service | OptimizeIndex";
        break;
      default:
        document.title = "OptimizeIndex Performance Agency";
    }

    // 2. Parse query parameters
    const serviceParam = searchParams.get('service');
    const goalParam = searchParams.get('goal');

    if (serviceParam) {
      setQuoteService(serviceParam);
      setServiceHighlighted(true);
    }
    if (goalParam) {
      setSelectedGoal(goalParam as GoalId);
      setAuditGoal(goalParam as GoalId);
    }

    // 3. Handle hash scroll or top scroll
    const hash = location.hash;
    if (hash) {
      setTimeout(() => {
        const el = document.getElementById(hash.replace('#', ''));
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.pathname, location.hash, searchParams, currentView]);

  useEffect(() => {
    // Read persisted leads from localStorage
    const readLeads = () => {
      const stored = localStorage.getItem('optimizeindex_leads');
      if (stored) {
        setLocalLeads(JSON.parse(stored));
      }
    };
    readLeads();

    // Set up window listener in case user submits modal lead
    window.addEventListener('storage', readLeads);

    return () => {
      window.removeEventListener('storage', readLeads);
    };
  }, []);

  const openModal = (type: 'quote' | 'audit') => {
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleGoalSelect = (id: GoalId) => {
    setSelectedGoal(id);
  };

  const nextTestimonial = () => {
    setActiveTestimonial(prev => (prev + 1) % TESTIMONIALS.length);
  };

  const prevTestimonial = () => {
    setActiveTestimonial(prev => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  };

  const clearLeads = () => {
    localStorage.removeItem('optimizeindex_leads');
    setLocalLeads([]);
  };

  return (
    <div className="min-h-dvh bg-cream text-ink font-sans relative flex flex-col antialiased selection:bg-lime selection:text-ink">
      
      {/* HEADER / NAVIGATION */}
      <header className="sticky top-0 z-40 w-full bg-cream/95 backdrop-blur-md border-b-1.5 border-ink select-none">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-18 flex items-center justify-between">
          
          {/* Logo Brand */}
          <a 
            href="/" 
            onClick={(e) => { 
              e.preventDefault(); 
              navigateTo('home'); 
            }} 
            className="flex items-center group p-1"
            id="nav-logo"
          >
            <Logo size={32} variant="light" />
          </a>

          {/* Desktop Navigation links */}
          <nav className="hidden md:flex items-center gap-8 font-mono text-xs font-bold uppercase tracking-wider text-ink">
            <a 
              href="/services"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('services');
              }}
              className={`hover:text-stone transition-colors focus-ring px-2 py-1 rounded cursor-pointer text-left font-bold ${currentView === 'services' ? 'text-lime-700 underline underline-offset-4 decoration-2' : ''}`} 
              id="nav-link-services"
            >
              SERVICES
            </a>
            <a 
              href="/case-studies"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('case-studies');
              }}
              className={`hover:text-stone transition-colors focus-ring px-2 py-1 rounded cursor-pointer text-left font-bold ${currentView === 'case-studies' ? 'text-lime-700 underline underline-offset-4 decoration-2' : ''}`} 
              id="nav-link-cases"
            >
              CASE STUDIES
            </a>
            <a 
              href="/#process"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('home', '#process');
              }}
              className="hover:text-stone transition-colors focus-ring px-2 py-1 rounded cursor-pointer text-left font-bold" 
              id="nav-link-process"
            >
              PROCESS
            </a>
            <a 
              href="/#testimonials"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('home', '#testimonials');
              }}
              className="hover:text-stone transition-colors focus-ring px-2 py-1 rounded cursor-pointer text-left font-bold" 
              id="nav-link-testimonials"
            >
              TESTIMONIALS
            </a>
          </nav>

          {/* Nav CTAs - Two Doors */}
          <div className="flex items-center gap-3">
            <a
              href="/quote"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('quote');
              }}
              className="hidden lg:inline-flex items-center gap-1.5 px-4 py-2 border-1.5 border-ink text-ink font-mono text-[11px] font-bold uppercase rounded-full hover:bg-ink hover:text-cream transition-colors duration-150 cursor-pointer focus-ring font-bold"
              id="nav-quote-btn"
            >
              <span>Get Free Quote</span>
              <span className="font-mono text-xs">→</span>
            </a>
            <a
              href="/audit"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('audit');
              }}
              className={`px-4 py-2 text-[11px] font-mono font-bold uppercase rounded-full border border-ink transition-all duration-200 cursor-pointer focus-ring flex items-center gap-1 ${
                currentView === 'audit'
                  ? 'bg-lime text-ink shadow-hard'
                  : 'bg-ink text-cream hover:bg-lime hover:text-ink hover:shadow-hard'
              }`}
              id="nav-audit-btn"
            >
              <span>Free Audit</span>
              <span className="text-lime font-mono group-hover:text-ink">→</span>
            </a>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex md:hidden p-2 text-ink border-2 border-ink bg-paper rounded-xl shadow-hard hover:bg-cream transition-all cursor-pointer focus-ring"
              aria-label="Toggle menu"
              id="mobile-menu-toggle"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE NAVIGATION DRAWER */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="md:hidden fixed top-18 left-0 right-0 z-30 bg-cream border-b-2 border-ink shadow-hard-lg px-6 py-8 select-none"
          >
            <nav className="flex flex-col gap-6 font-mono text-sm font-bold uppercase tracking-wider text-ink text-center">
              <a 
                href="/services"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('services');
                }}
                className={`hover:text-stone transition-colors py-2 border-b border-ink/5 ${currentView === 'services' ? 'text-lime-700 underline' : ''}`}
                id="mobile-nav-services"
              >
                SERVICES
              </a>
              <a 
                href="/case-studies"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('case-studies');
                }}
                className={`hover:text-stone transition-colors py-2 border-b border-ink/5 ${currentView === 'case-studies' ? 'text-lime-700 underline' : ''}`}
                id="mobile-nav-cases"
              >
                CASE STUDIES
              </a>
              <a 
                href="/#process"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('home', '#process');
                }}
                className="hover:text-stone transition-colors py-2 border-b border-ink/5"
                id="mobile-nav-process"
              >
                PROCESS
              </a>
              <a 
                href="/#testimonials"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('home', '#testimonials');
                }}
                className="hover:text-stone transition-colors py-2 border-b border-ink/5"
                id="mobile-nav-testimonials"
              >
                TESTIMONIALS
              </a>

              {/* Mobile CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <a
                  href="/quote"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('quote');
                  }}
                  className="flex-1 py-3 px-5 border-2 border-ink text-ink font-mono text-xs font-bold uppercase rounded-full hover:bg-ink hover:text-cream transition-all shadow-hard text-center"
                  id="mobile-nav-quote"
                >
                  Get Free Quote →
                </a>
                <a
                  href="/audit"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('audit');
                  }}
                  className="flex-1 py-3 px-5 bg-lime text-ink font-mono text-xs font-bold uppercase rounded-full border-2 border-ink hover:bg-lime/90 transition-all shadow-hard text-center"
                  id="mobile-nav-audit"
                >
                  Free Audit →
                </a>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BODY CONTENT CONTAINER */}
      <main className="flex-1">

        {currentView === 'home' ? (
          <>
            {/* HERO SECTION */}
        <section id="home" className="relative pt-8 pb-16 md:py-20 overflow-hidden px-6 md:px-12 max-w-7xl mx-auto">
          
          {/* Ambient Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Copy Column (58%) */}
            <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6">
              
              {/* Dynamic Badge Eyebrow */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-paper border-1.5 border-ink rounded-full shadow-hard -rotate-1">
                <span className="w-2 h-2 rounded-full bg-lime border border-ink animate-pulse" />
                <span className="font-mono text-[10px] font-bold text-ink uppercase tracking-wider">
                  MODERN SEO & GEO PERFORMANCE AGENCY
                </span>
              </div>

              {/* H1 Display with exact italic accent style */}
              <h1 className="font-display font-extrabold text-4xl md:text-5xl lg:text-6xl text-ink leading-[1.05] tracking-tight">
                We turn search into your #1 <span className="font-serif-accent italic text-lime bg-ink px-3 py-1 rounded-sm shadow-hard inline-block rotate-1">revenue</span> channel.
              </h1>

              {/* Subcopy */}
              <p className="font-sans text-base md:text-lg text-stone max-w-xl leading-relaxed">
                More traffic is nice. More revenue is the point. We get your business found on Google, Google Maps, and AI assistants like ChatGPT — right at the moment customers are ready to buy.
              </p>

              {/* Interactive self-segmentation picker (GOAL PILLS) */}
              <div className="w-full space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone">
                    What's your #1 growth goal right now?
                  </span>
                </div>
                
                {/* Wrapped rows of buttons */}
                <div className="flex flex-wrap gap-2 max-w-2xl">
                  {GOALS.map((goal) => {
                    const isSelected = selectedGoal === goal.id;
                    return (
                      <button
                        key={goal.id}
                        onClick={() => handleGoalSelect(goal.id)}
                        className={`px-4 py-2.5 text-xs font-mono font-bold rounded-full transition-all duration-150 border cursor-pointer focus-ring flex items-center gap-2 ${
                          isSelected
                            ? 'bg-ink border-ink text-lime shadow-hard translate-y-[-1px]'
                            : 'bg-transparent border-ink/20 text-ink hover:border-ink/50'
                        }`}
                        id={`goal-pill-${goal.id}`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-lime" />}
                        <span>{goal.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="font-mono text-[11px] text-stone italic max-w-lg mt-1">
                  💡 {activeGoal.description}
                </p>
              </div>

              {/* CTA block with risk reversal */}
              <div className="w-full pt-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <a
                    href={`/audit?goal=${selectedGoal}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/audit?goal=${selectedGoal}`);
                    }}
                    className="w-full sm:w-auto px-8 py-4 bg-lime text-ink font-sans font-extrabold text-sm border-2 border-ink shadow-hard hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer focus-ring text-center block"
                    id="hero-primary-cta"
                  >
                    <span>{activeGoal.ctaText.replace(/Quote/gi, 'Audit')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                  <a
                    href={`/quote?goal=${selectedGoal}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/quote?goal=${selectedGoal}`);
                    }}
                    className="w-full sm:w-auto px-8 py-4 bg-paper text-ink font-sans font-extrabold text-sm border-2 border-ink shadow-hard hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer focus-ring text-center block"
                    id="hero-secondary-cta"
                  >
                    <span>Get Free Quote</span>
                  </a>
                </div>

                {/* Risk reversal line */}
                <p className="font-mono text-[10px] text-stone tracking-wide">
                  NO CONTRACTS · 15-DAY MONEY BACK GUARANTEE · RESPONSE IN 24 HOURS
                </p>
              </div>



            </div>

            {/* Collage Column (42%) */}
            <div className="lg:col-span-5 relative w-full h-[450px] flex items-center justify-center lg:justify-end">
              
              {/* Starburst Sticker (overlaps top-left) */}
              <Starburst 
                text="FREE AUDIT" 
                className="absolute left-4 top-2 z-20 scale-90 md:scale-100 rotate-[-8deg] cursor-pointer" 
                size={96}
                rotationSpeed={30}
                onClick={() => {
                  navigate(`/audit?goal=${selectedGoal}`);
                }}
              />

              {/* Main Forest Panel Base (holds Interactive Chart) */}
              <div className="w-full max-w-[430px] h-[340px] bg-forest border-2 border-ink shadow-hard-lg rounded-2xl p-5 relative flex flex-col justify-between overflow-hidden z-10 select-none">
                <InteractiveChart />
              </div>

              {/* Overlapping White Card (top-right, half-on/half-off) */}
              <div className="absolute right-[-10px] top-[15px] bg-paper border-1.5 border-ink px-4 py-2.5 rounded-xl shadow-hard z-20 rotate-[6deg] max-w-[190px] text-left select-none pointer-events-none">
                <p className="font-mono text-[9px] text-stone uppercase">CLIENT RESULT</p>
                <p className="font-display font-black text-sm text-ink">+4,900% ORGANIC TRAFFIC</p>
                <p className="font-mono text-[8px] text-forest/70 mt-1">✓ JADE TITLE SERVICES · GA4</p>
              </div>

              {/* Overlapping Ink Card (bottom-left, anchors right) */}
              <div className="absolute left-[20px] bottom-[15px] bg-ink border-1.5 border-ink px-4 py-3 rounded-xl shadow-hard z-20 rotate-[-4deg] max-w-[210px] text-left select-none pointer-events-none">
                <p className="font-mono text-[9px] text-lime/80 uppercase">CLIENT RESULT</p>
                <p className="font-display font-black text-sm text-lime leading-tight">+280% LOCAL LEADS</p>
                <p className="font-mono text-[8px] text-cream/50 mt-1">EcoClean Services · GBP verified</p>
              </div>

            </div>

          </div>
        </section>

        {/* FULL-BLEED OUTCOME TICKER */}
        <section className="w-full bg-ink">
          <Marquee />
        </section>



        {/* SERVICES SECTION */}
        <section id="services" className="py-20 px-6 md:px-12 max-w-7xl mx-auto border-b-1.5 border-ink">
          
          {/* Header block */}
          <div className="mb-16 text-left max-w-2xl">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-stone flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-lime border border-ink" />
              OUR CAPABILITIES
            </span>
            <h2 className="font-display font-extrabold text-4xl lg:text-5xl text-ink tracking-tight mt-3">
              One focused team. Every digital lever that moves <span className="font-serif-accent italic text-lime bg-ink px-2.5 py-0.5 rounded-sm shadow-hard inline-block -rotate-1">revenue</span>.
            </h2>
            <p className="font-sans text-stone mt-4 leading-relaxed">
              No vanity-metric slide decks. We get you found everywhere your customers search — Google, Google Maps, voice assistants, and AI tools like ChatGPT — and we measure it in leads and sales.
            </p>
          </div>

          {/* BENTO GRID (2x2 equal grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SERVICES.slice(0, 4).map((serv) => (
              <div
                key={serv.id}
                className="bg-paper border-2 border-ink p-6 md:p-8 rounded-2xl shadow-hard hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all relative flex flex-col justify-between group"
              >
                {/* Index number */}
                <span className="absolute right-6 top-6 font-mono text-xs font-bold text-stone">
                  // {serv.index}
                </span>

                {/* Content */}
                <div className="space-y-4 text-left">
                  
                  {/* Title & Starburst New badge if applicable */}
                  <div className="flex items-center gap-3">
                    <h3 className="font-display font-extrabold text-2xl text-ink tracking-tight">
                      {serv.title}
                    </h3>
                    
                    {/* Generates standard lime mini starburst for GEO as differentiator */}
                    {serv.isHot && (
                      <div className="px-2 py-0.5 bg-lime text-ink text-[9px] font-mono font-bold border border-ink rounded rotate-3">
                        NEW
                      </div>
                    )}
                  </div>

                  <p className="font-sans text-stone text-xs md:text-sm leading-relaxed max-w-xl">
                    {serv.description}
                  </p>
                </div>

                {/* Click action triggering dynamic popup quote focused on capability */}
                <div className="pt-6 flex items-center justify-between border-t border-ink/10 mt-6">
                  <span className="font-mono text-[10px] text-stone uppercase font-semibold">
                    OPTIMIZEINDEX CAPABILITY SERVICE
                  </span>
                  <a
                    href={`/audit?goal=${serv.id === 'geo' ? 'conversions' : (serv.id === 'seo' ? 'revenue' : 'conversions')}&service=${serv.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/audit?goal=${serv.id === 'geo' ? 'conversions' : (serv.id === 'seo' ? 'revenue' : 'conversions')}&service=${serv.id}`);
                    }}
                    className="flex items-center gap-1 font-mono text-xs font-bold text-ink hover:underline cursor-pointer focus-ring px-2 py-1 rounded"
                    id={`service-btn-${serv.id}`}
                  >
                    <span>GET FREE AUDIT</span>
                    <span>→</span>
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* View All Services & Capabilities CTA Link */}
          <div className="mt-12 text-center">
            <a
              href="/services"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('services');
              }}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-ink text-cream font-mono text-xs font-bold uppercase rounded-full hover:bg-lime hover:text-ink hover:shadow-hard transition-all cursor-pointer focus-ring shadow-hard"
              id="home-view-all-services-btn"
            >
              <span>View All Services & Capabilities ({SERVICES.length})</span>
              <span>→</span>
            </a>
          </div>
        </section>

        {/* RESULTS / CASE STUDIES */}
        <section id="case-studies" className="bg-forest py-20 px-6 md:px-12 border-y-1.5 border-ink text-cream relative overflow-hidden">
          
          {/* Subtle grid elements in forest */}
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[linear-gradient(to_right,#F6F1E6_1px,transparent_1px),linear-gradient(to_bottom,#F6F1E6_1px,transparent_1px)] bg-[size:24px_24px]" />

          <div className="max-w-7xl mx-auto relative z-10">
            {/* Header */}
            <div className="mb-16 text-left max-w-2xl">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-lime flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-lime animate-ping" />
                VERIFIED PERFORMANCE
              </span>
              <h2 className="font-display font-extrabold text-4xl lg:text-5xl text-cream tracking-tight mt-3">
                Zero vanity traffic. Pure bottom-line <span className="font-serif-accent italic text-lime bg-ink px-2.5 py-0.5 rounded-sm shadow-hard inline-block rotate-1">growth</span>.
              </h2>
              <p className="font-sans text-cream/70 mt-4 leading-relaxed">
                We measure performance in leads, sales, and Search Console data — not rank-tracker screenshots. Here's what we've built for real clients.
              </p>
            </div>

            {/* Grid of Results */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {CASE_STUDIES.slice(0, 3).map((study) => (
                <div
                  key={study.id}
                  className="bg-ink border-1.5 border-cream/20 p-6 md:p-8 rounded-2xl flex flex-col justify-between relative shadow-hard"
                >
                  <div className="space-y-4 text-left">
                    <div className="flex items-center justify-between border-b border-cream/10 pb-4">
                      <span className="font-mono text-xs font-black tracking-widest text-cream/50">
                        {study.client}
                      </span>
                      <span className="px-2 py-0.5 bg-forest text-lime border border-lime/20 font-mono text-[9px] font-bold uppercase rounded">
                        {study.goal.toUpperCase()}
                      </span>
                    </div>

                    {/* Giant Lime Stat */}
                    <div className="py-2">
                      <p className="font-mono text-[10px] text-cream/40 uppercase">ATTRIBUTED RESULT</p>
                      <p className="font-display font-black text-4xl md:text-5xl text-lime tracking-tight mt-1">
                        {study.stat}
                      </p>
                      <p className="font-mono text-xs text-cream/80 uppercase mt-0.5">
                        {study.metric}
                      </p>
                    </div>

                    <p className="font-sans text-cream/75 text-xs md:text-sm leading-relaxed">
                      {study.outcome}
                    </p>
                  </div>

                  <div className="pt-5 border-t border-cream/10 mt-6 space-y-4">
                    <span className="block text-[10px] font-mono text-cream/40 uppercase tracking-wide">
                      {study.dataOrigin.toUpperCase()}
                    </span>
                    <div className="flex items-center gap-3">
                      <a
                        href={`/case-study/${study.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/case-study/${study.id}`);
                        }}
                        className="flex-1 text-center px-4 py-2.5 bg-lime text-ink font-mono text-[10px] font-bold uppercase rounded-full hover:bg-cream transition-colors cursor-pointer"
                        id={`study-read-btn-${study.id}`}
                      >
                        Read Study →
                      </a>
                      <a
                        href={`/audit?goal=${study.goal}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/audit?goal=${study.goal}`);
                        }}
                        className="flex-1 text-center px-4 py-2.5 border border-cream/30 text-cream font-mono text-[10px] font-bold uppercase rounded-full hover:border-lime hover:text-lime transition-colors cursor-pointer"
                        id={`study-btn-${study.id}`}
                      >
                        Get Plan →
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* View More Cases CTA Button */}
            <div className="mt-12 text-center">
              <a
                href="/case-studies"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('case-studies');
                }}
                className="inline-flex items-center gap-2.5 px-8 py-4 bg-lime text-ink font-mono text-xs font-bold uppercase rounded-full hover:bg-lime/95 hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer focus-ring shadow-hard"
                id="home-view-more-cases-btn"
              >
                <span>View More Case Studies</span>
                <span>→</span>
              </a>
            </div>

            {/* Static conversion kicker */}
            <div className="mt-16 bg-ink border border-cream/10 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 text-left">
              <div className="space-y-1">
                <p className="font-mono text-xs text-lime uppercase font-bold">CAN WE DUPLICATE THIS IN YOUR MARKET?</p>
                <p className="text-sm text-cream/85">We will construct a bespoke strategy showing exactly which keywords your competitor controls.</p>
              </div>
              <a
                href="/quote"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('quote');
                }}
                className="w-full md:w-auto px-6 py-3 bg-lime text-ink font-mono text-xs font-bold uppercase rounded-full hover:bg-lime/90 cursor-pointer focus-ring text-center block md:inline-block"
                id="cases-footer-quote-btn"
              >
                Get Free Quote →
              </a>
            </div>
          </div>
        </section>

        {/* PROCESS ("How we engineer growth") */}
        <section id="process" className="py-20 px-6 md:px-12 max-w-7xl mx-auto border-b-1.5 border-ink">
          
          {/* Header */}
          <div className="mb-16 text-left max-w-2xl">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-stone flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-lime border border-ink" />
              THE BLUEPRINT
            </span>
            <h2 className="font-display font-extrabold text-4xl lg:text-5xl text-ink tracking-tight mt-3">
              How we engineer search <span className="font-serif-accent italic text-lime bg-ink px-2.5 py-0.5 rounded-sm shadow-hard inline-block -rotate-1">dominance</span>.
            </h2>
            <p className="font-sans text-stone mt-4 leading-relaxed">
              No guesswork, no busywork. We follow the same proven four-step process for every client — starting with your local presence and building toward AI-powered search.
            </p>
          </div>

          {/* Connected Process steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            
            {/* Steps map */}
            {PROCESS_STEPS.map((step, idx) => (
              <div
                key={step.number}
                className="bg-paper border-2 border-ink p-6 rounded-2xl shadow-hard relative flex flex-col justify-between group min-h-[260px] text-left"
              >
                {/* Huge faded numeric background */}
                <span className="absolute right-4 top-2 font-display font-black text-6xl text-ink/5 select-none pointer-events-none">
                  {step.number}
                </span>

                <div className="space-y-3 relative z-10">
                  <div className="w-10 h-10 bg-cream border-1.5 border-ink rounded-xl flex items-center justify-center font-mono font-bold text-ink shadow-hard mb-4">
                    {step.number}
                  </div>
                  <h3 className="font-display font-extrabold text-lg text-ink leading-tight">
                    {step.title}
                  </h3>
                  <p className="font-sans text-stone text-xs md:text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Step CTA if it has special offer (Quote) */}
                {step.isOffer ? (
                  <div className="pt-4 border-t border-ink/10 mt-4 relative z-10">
                    <button
                      onClick={() => openModal('quote')}
                      className="w-full py-2 bg-lime text-ink font-mono text-[10px] font-bold uppercase rounded-lg border border-ink shadow-hard hover:shadow-hard-hover transition-all cursor-pointer"
                      id="process-step-1-btn"
                    >
                      GET FREE QUOTE →
                    </button>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-ink/10 mt-4 text-[9px] font-mono text-stone uppercase relative z-10">
                    ✓ STEP {step.number} OF OUR 4-STEP PROCESS
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* TESTIMONIALS SECTION */}
        <section id="testimonials" className="py-20 bg-cream px-6 md:px-12 border-b-1.5 border-ink overflow-hidden">
          <div className="max-w-4xl mx-auto text-center space-y-8 relative">
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-paper border border-ink text-stone font-mono text-xs rounded-full shadow-hard">
              <Star className="w-3.5 h-3.5 text-lime fill-lime" />
              <span>WHAT OUR CLIENTS SAY</span>
            </div>

            {/* Testimonial Quote Carousel Display */}
            <div className="min-h-[180px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.blockquote
                  key={activeTestimonial}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="font-serif-accent italic text-2xl md:text-3xl text-ink leading-relaxed max-w-2xl px-4"
                >
                  "{TESTIMONIALS[activeTestimonial].quote}"
                </motion.blockquote>
              </AnimatePresence>
            </div>

            {/* Author Attribution */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-4">
              {/* Industry Briefcase Icon Frame */}
              <div className="w-12 h-12 rounded-xl border-1.5 border-ink bg-ink flex items-center justify-center shadow-hard rotate-[-3deg] shrink-0">
                <Briefcase className="w-5 h-5 text-lime" />
              </div>

              <div className="text-center md:text-left font-mono">
                <p className="text-xs font-bold text-ink uppercase">
                  {TESTIMONIALS[activeTestimonial].author}
                </p>
                <p className="text-[10px] text-stone uppercase mt-0.5">
                  {TESTIMONIALS[activeTestimonial].role} @ <span className="text-ink font-bold">{TESTIMONIALS[activeTestimonial].company}</span>
                </p>
              </div>
            </div>

            {/* Carousel Navigation buttons */}
            <div className="flex items-center justify-center gap-3 pt-6">
              <button
                onClick={prevTestimonial}
                className="p-2 border-1.5 border-ink rounded-full bg-paper hover:bg-cream transition-colors cursor-pointer focus-ring"
                aria-label="Previous testimonial"
                id="testimonial-prev-btn"
              >
                <ChevronLeft className="w-4 h-4 text-ink" />
              </button>
              
              <div className="flex gap-1.5">
                {TESTIMONIALS.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveTestimonial(idx)}
                    className={`w-2 h-2 rounded-full border border-ink transition-colors cursor-pointer ${
                      activeTestimonial === idx ? 'bg-lime' : 'bg-stone/20'
                    }`}
                    aria-label={`Go to testimonial ${idx + 1}`}
                    id={`testimonial-dot-${idx}`}
                  />
                ))}
              </div>

              <button
                onClick={nextTestimonial}
                className="p-2 border-1.5 border-ink rounded-full bg-paper hover:bg-cream transition-colors cursor-pointer focus-ring"
                aria-label="Next testimonial"
                id="testimonial-next-btn"
              >
                <ChevronRight className="w-4 h-4 text-ink" />
              </button>
            </div>
          </div>
        </section>
          </>
        ) : currentView === 'services' ? (
          <section className="py-20 bg-cream border-b-1.5 border-ink min-h-[60vh] relative overflow-hidden">
            {/* Subtle grid background */}
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:24px_24px]" />
            
            <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
              {/* Back to Home Button */}
              <div className="mb-12">
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('home');
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-paper text-ink border-2 border-ink font-mono text-xs font-bold uppercase rounded-full hover:bg-cream transition-all cursor-pointer focus-ring shadow-hard hover:shadow-hard-hover"
                  id="services-page-back-btn"
                >
                  <span>← Back to Homepage</span>
                </a>
              </div>

              {/* Header block */}
              <div className="mb-16 text-left max-w-3xl">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-stone flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime border border-ink animate-pulse" />
                  DETAILED SERVICES & CAPABILITIES
                </span>
                <h1 className="font-display font-black text-4xl md:text-5xl lg:text-6xl text-ink tracking-tight mt-4 leading-[1.1]">
                  Our Full-Spectrum <span className="font-serif-accent italic text-lime bg-ink px-2.5 py-0.5 rounded-sm shadow-hard inline-block -rotate-1">Growth</span> Engine
                </h1>
                <p className="font-sans text-stone mt-6 leading-relaxed text-base md:text-lg">
                  Beyond core SEO and AI search optimization, we run every channel that drives measurable growth — paid ads, content, conversion optimization, and web design. One team, one accountable strategy.
                </p>
              </div>

              {/* Bento Grid for Remaining 6 Services */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {SERVICES.slice(2, SERVICES.length - 1).map((serv) => (
                  <div
                    key={serv.id}
                    className="bg-paper border-2 border-ink p-6 md:p-8 rounded-2xl shadow-hard hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all relative flex flex-col justify-between group"
                  >
                    {/* Index number */}
                    <span className="absolute right-6 top-6 font-mono text-xs font-bold text-stone">
                      // {serv.index}
                    </span>

                    {/* Content */}
                    <div className="space-y-4 text-left">
                      <h3 className="font-display font-extrabold text-2xl text-ink tracking-tight">
                        {serv.title}
                      </h3>
                      <p className="font-sans text-stone text-xs md:text-sm leading-relaxed">
                        {serv.description}
                      </p>
                    </div>

                    {/* Action */}
                    <div className="pt-6 flex items-center justify-between border-t border-ink/10 mt-6">
                      <span className="font-mono text-[10px] text-stone uppercase font-semibold">
                        OPTIMIZEINDEX CAPABILITY SERVICE
                      </span>
                      <a
                        href={`/audit?goal=conversions&service=${serv.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/audit?goal=conversions&service=${serv.id}`);
                        }}
                        className="flex items-center gap-1 font-mono text-xs font-bold text-ink hover:underline cursor-pointer focus-ring px-2 py-1 rounded"
                        id={`service-btn-${serv.id}`}
                      >
                        <span>GET FREE AUDIT</span>
                        <span>→</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : currentView === 'case-studies' ? (
          <section className="py-20 bg-forest text-cream border-b-1.5 border-ink min-h-[90vh] relative overflow-hidden">
            {/* Subtle grid elements in forest */}
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[linear-gradient(to_right,#F6F1E6_1px,transparent_1px),linear-gradient(to_bottom,#F6F1E6_1px,transparent_1px)] bg-[size:24px_24px]" />

            <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
              {/* Back to Home Button */}
              <div className="mb-12">
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('home');
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-paper text-ink border-2 border-ink font-mono text-xs font-bold uppercase rounded-full hover:bg-cream transition-all cursor-pointer focus-ring shadow-hard hover:shadow-hard-hover"
                  id="cases-page-back-btn"
                >
                  <span>← Back to Homepage</span>
                </a>
              </div>

              {/* Header block */}
              <div className="mb-16 text-left max-w-3xl">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-lime flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
                  CASE STUDIES REPOSITORY
                </span>
                <h1 className="font-display font-black text-4xl md:text-5xl lg:text-6xl text-cream tracking-tight mt-4 leading-[1.1]">
                  Our Full <span className="font-serif-accent italic text-lime bg-ink px-2.5 py-0.5 rounded-sm shadow-hard inline-block -rotate-1">Portfolio</span> of Organic Proof
                </h1>
                <p className="font-sans text-cream/70 mt-6 leading-relaxed text-base md:text-lg">
                  The complete archive of campaigns we've executed for e-commerce, local service, and B2B companies. Every number is verified in the client's own analytics — no fluff.
                </p>
              </div>

              {/* Grid of Results */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {CASE_STUDIES.map((study, idx) => (
                  <div
                    key={study.id}
                    className="bg-ink border-1.5 border-cream/20 p-6 md:p-8 rounded-2xl flex flex-col justify-between relative shadow-hard group hover:border-lime/40 transition-all duration-200"
                  >
                    {/* Badge showing if it was featured on the homepage */}
                    <div className="absolute top-4 right-4 font-mono text-[9px] text-cream/30">
                      {idx < 3 ? 'FEATURED' : 'FULL STUDY'}
                    </div>

                    <div className="space-y-4 text-left">
                      <div className="flex items-center justify-between border-b border-cream/10 pb-4">
                        <span className="font-mono text-xs font-black tracking-widest text-cream/50">
                          {study.client}
                        </span>
                        <span className="px-2 py-0.5 bg-forest text-lime border border-lime/20 font-mono text-[9px] font-bold uppercase rounded">
                          {study.goal.toUpperCase()}
                        </span>
                      </div>

                      {/* Giant Lime Stat */}
                      <div className="py-2">
                        <p className="font-mono text-[10px] text-cream/40 uppercase">ATTRIBUTED RESULT</p>
                        <p className="font-display font-black text-4xl md:text-5xl text-lime tracking-tight mt-1 group-hover:scale-105 transition-transform origin-left duration-200">
                          {study.stat}
                        </p>
                        <p className="font-mono text-xs text-cream/80 uppercase mt-0.5">
                          {study.metric}
                        </p>
                      </div>

                      <p className="font-sans text-cream/75 text-xs md:text-sm leading-relaxed">
                        {study.outcome}
                      </p>
                    </div>

                    <div className="pt-5 border-t border-cream/10 mt-6 space-y-4">
                      <span className="block text-[10px] font-mono text-cream/40 uppercase tracking-wide">
                        {study.dataOrigin.toUpperCase()}
                      </span>
                      <div className="flex items-center gap-3">
                        <a
                          href={`/case-study/${study.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/case-study/${study.id}`);
                          }}
                          className="flex-1 text-center px-4 py-2.5 bg-lime text-ink font-mono text-[10px] font-bold uppercase rounded-full hover:bg-cream transition-colors cursor-pointer"
                          id={`archive-study-read-btn-${study.id}`}
                        >
                          Read Study →
                        </a>
                        <a
                          href={`/audit?goal=${study.goal}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/audit?goal=${study.goal}`);
                          }}
                          className="flex-1 text-center px-4 py-2.5 border border-cream/30 text-cream font-mono text-[10px] font-bold uppercase rounded-full hover:border-lime hover:text-lime transition-colors cursor-pointer"
                          id={`archive-study-btn-${study.id}`}
                        >
                          Get Plan →
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Conversion footer specifically for cases repository */}
              <div className="mt-16 bg-ink border border-cream/10 p-8 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 text-left">
                <div className="space-y-2 max-w-xl">
                  <p className="font-mono text-xs text-lime uppercase font-bold">CAN WE DUPLICATE THESE RESULTS FOR YOU?</p>
                  <p className="text-sm text-cream/85">Our lead performance analysts will build a custom search strategy & competitor citation audit for your domain.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
                  <a
                    href="/audit"
                    onClick={(e) => {
                      e.preventDefault();
                      navigateTo('audit');
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-lime text-ink font-mono text-xs font-bold uppercase rounded-full hover:bg-lime/90 cursor-pointer focus-ring shadow-hard text-center block"
                  >
                    Get Free Audit
                  </a>
                  <a
                    href="/quote"
                    onClick={(e) => {
                      e.preventDefault();
                      navigateTo('quote');
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-transparent text-cream border border-cream/30 hover:border-cream font-mono text-xs font-bold uppercase rounded-full cursor-pointer focus-ring text-center block"
                  >
                    Get Free Quote
                  </a>
                </div>
              </div>
            </div>
          </section>
        ) : currentView === 'case-study-detail' ? (
          (() => {
            const currentCaseStudy = CASE_STUDIES.find(cs => cs.id === caseStudyId);
            if (!currentCaseStudy) {
              return (
                <section className="py-20 bg-forest text-cream border-b-1.5 border-ink min-h-[90vh] flex items-center justify-center relative overflow-hidden">
                  <div className="max-w-md mx-auto px-6 text-center">
                    <h2 className="font-display font-black text-3xl text-lime mb-4">Case Study Not Found</h2>
                    <p className="font-sans text-cream/70 mb-8">The case study you are looking for does not exist or has been relocated.</p>
                    <a
                      href="/case-studies"
                      onClick={(e) => {
                        e.preventDefault();
                        navigateTo('case-studies');
                      }}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-lime text-ink font-mono text-xs font-bold uppercase rounded-full hover:bg-cream transition-all cursor-pointer shadow-hard"
                    >
                      ← Back to All Case Studies
                    </a>
                  </div>
                </section>
              );
            }
            return (
              <section className="py-20 bg-forest text-cream border-b-1.5 border-ink min-h-[90vh] relative overflow-hidden">
                {/* Subtle grid elements in forest */}
                <div className="absolute inset-0 opacity-5 pointer-events-none bg-[linear-gradient(to_right,#F6F1E6_1px,transparent_1px),linear-gradient(to_bottom,#F6F1E6_1px,transparent_1px)] bg-[size:24px_24px]" />

                <div className="max-w-4xl mx-auto px-6 md:px-12 relative z-10">
                  {/* Back to Case Studies Button */}
                  <div className="mb-12">
                    <a
                      href="/case-studies"
                      onClick={(e) => {
                        e.preventDefault();
                        navigateTo('case-studies');
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-paper text-ink border-2 border-ink font-mono text-xs font-bold uppercase rounded-full hover:bg-cream transition-all cursor-pointer focus-ring shadow-hard hover:shadow-hard-hover"
                      id="case-detail-page-back-btn"
                    >
                      <span>← Back to Case Studies</span>
                    </a>
                  </div>

                  {/* Header block */}
                  <div className="mb-12 text-left">
                    <span className="font-mono text-xs font-bold uppercase tracking-widest text-lime flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
                      {currentCaseStudy.category}
                    </span>
                    <h1 className="font-display font-black text-3xl md:text-5xl text-cream tracking-tight mt-4 leading-[1.1]">
                      {currentCaseStudy.client}
                    </h1>
                  </div>

                  {/* Stat Banner */}
                  <div className="bg-ink border border-cream/15 p-6 md:p-8 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 shadow-hard text-left">
                    <div className="text-left">
                      <span className="font-mono text-[10px] text-lime uppercase font-black tracking-widest">Attributed Performance Result</span>
                      <h4 className="font-display font-black text-4xl md:text-5xl text-lime tracking-tight mt-1">{currentCaseStudy.stat}</h4>
                      <span className="font-mono text-xs text-cream/70 uppercase">{currentCaseStudy.metric}</span>
                    </div>
                    <div className="text-left md:text-right">
                      <span className="font-mono text-[10px] text-cream/40 uppercase block">Data Integrity Log</span>
                      <span className="font-mono text-xs text-cream/80 uppercase font-bold block mt-1">{currentCaseStudy.dataOrigin}</span>
                      <a
                        href={`/audit?goal=${currentCaseStudy.goal}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/audit?goal=${currentCaseStudy.goal}`);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-lime text-ink font-mono text-[10px] font-bold uppercase rounded-md hover:bg-cream transition-all mt-3 shadow-hard cursor-pointer"
                      >
                        GET PLAN FOR MY SITE →
                      </a>
                    </div>
                  </div>

                  {/* Case Study Full Content */}
                  <div className="prose prose-invert max-w-none pb-12 text-left border-b border-cream/10">
                    {parseMarkdownToReact(currentCaseStudy.fullContent || '')}
                  </div>

                  {/* Bottom Conversion CTA */}
                  <div className="mt-16 bg-ink border border-cream/10 p-8 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 text-left shadow-hard">
                    <div className="space-y-2 max-w-xl">
                      <p className="font-mono text-xs text-lime uppercase font-bold">CAN WE DUPLICATE THESE RESULTS FOR YOU?</p>
                      <p className="text-sm text-cream/85">Our lead performance analysts will build a custom search strategy & competitor citation audit for your domain.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
                      <button
                        onClick={() => {
                          setIsModalOpen(true);
                          setModalType('audit');
                        }}
                        className="w-full sm:w-auto px-6 py-3 bg-lime text-ink font-mono text-xs font-bold uppercase rounded-full hover:bg-cream transition-all cursor-pointer focus-ring shadow-hard text-center block"
                      >
                        Get Free Audit
                      </button>
                      <button
                        onClick={() => {
                          setIsModalOpen(true);
                          setModalType('quote');
                        }}
                        className="w-full sm:w-auto px-6 py-3 bg-transparent text-cream border border-cream/30 hover:border-cream font-mono text-xs font-bold uppercase rounded-full cursor-pointer focus-ring text-center block"
                      >
                        Get Free Quote
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            );
          })()
        ) : currentView === 'audit' ? (
          <section className="py-20 bg-forest text-cream border-b-1.5 border-ink min-h-[90vh] relative overflow-hidden">
            {/* Subtle grid background */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:24px_24px]" />
            
            <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
              {/* Back to Home Button */}
              <div className="mb-12">
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('home');
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-paper text-ink border-2 border-ink font-mono text-xs font-bold uppercase rounded-full hover:bg-cream transition-all cursor-pointer focus-ring shadow-hard hover:shadow-hard-hover"
                  id="audit-page-back-btn"
                >
                  <span>← Back to Homepage</span>
                </a>
              </div>

              {/* Title Header */}
              <div className="text-center max-w-3xl mx-auto mb-16">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-lime text-ink border border-ink shadow-hard rounded-full mb-4 -rotate-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="font-mono text-[10px] font-bold">100% FREE NO-CONTRACT AUDIT</span>
                </div>
                <h1 className="font-display font-black text-4xl md:text-5xl lg:text-6xl text-cream tracking-tight leading-[1.1] mt-2">
                  Claim your free <span className="font-serif-accent italic text-lime bg-ink px-2.5 py-0.5 rounded-sm shadow-hard inline-block -rotate-1">15-Point</span> Performance Audit
                </h1>
                <p className="font-sans text-cream/70 mt-6 leading-relaxed text-base md:text-lg">
                  We will scan your search footprint, benchmark competitors, and show you exactly where you are losing revenue. No slides, just raw math.
                </p>
              </div>

              {/* Success / Loading / Form render based on states */}
              {auditIsSuccess ? (
                <div className="max-w-2xl mx-auto text-center bg-paper text-ink border-2 border-ink p-8 md:p-12 rounded-3xl shadow-hard relative">
                  <div className="w-16 h-16 bg-lime text-ink border-2 border-ink rounded-full flex items-center justify-center mx-auto mb-6 shadow-hard rotate-3">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>
                  <h4 className="font-display font-black text-3xl text-ink mb-3">
                    Audit Request Received!
                  </h4>
                  <p className="font-mono text-xs text-stone uppercase tracking-wide mb-6">
                    CONFIRMATION FOR <span className="text-ink underline font-bold">{auditWebsite}</span>
                  </p>

                  <div className="w-full bg-cream border-1.5 border-ink p-6 rounded-2xl text-left shadow-hard mb-6">
                    <p className="font-mono text-[10px] text-stone uppercase tracking-widest mb-3 font-bold">
                      WHAT HAPPENS NEXT:
                    </p>
                    <ul className="space-y-3 font-sans text-sm text-ink/80 leading-relaxed">
                      <li className="flex gap-2.5 items-start">
                        <Check className="w-4 h-4 text-forest shrink-0 mt-0.5 stroke-[3]" />
                        <span>A real strategist (not a bot) manually reviews your site, Google Business Profile, and top competitor.</span>
                      </li>
                      <li className="flex gap-2.5 items-start">
                        <Check className="w-4 h-4 text-forest shrink-0 mt-0.5 stroke-[3]" />
                        <span>We compile your 15-point audit covering local visibility, SEO health, and AI search readiness.</span>
                      </li>
                      <li className="flex gap-2.5 items-start">
                        <Check className="w-4 h-4 text-forest shrink-0 mt-0.5 stroke-[3]" />
                        <span>You receive it at <strong className="text-ink">{auditEmail}</strong> within 24 hours — no strings attached.</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => {
                      setAuditIsSuccess(false);
                      setAuditWebsite('');
                      setAuditEmail('');
                      setAuditCompetitor('');
                      setAuditPhone('');
                      setAuditName('');
                      setAuditCompany('');
                      setAuditComments('');
                    }}
                    className="py-3 px-8 bg-paper text-ink font-mono text-xs border border-ink shadow-hard rounded-full hover:bg-cream text-center font-bold cursor-pointer"
                  >
                    Request Another Audit
                  </button>
                </div>
              ) : auditIsSubmitting ? (
                <div className="max-w-2xl mx-auto bg-paper text-ink border-2 border-ink p-8 md:p-12 rounded-3xl shadow-hard text-center flex flex-col items-center justify-center min-h-[300px]">
                  <div className="w-16 h-16 border-4 border-ink border-t-lime rounded-full animate-spin mb-6" />
                  <h4 className="font-display font-black text-2xl text-ink mb-2">
                    Sending your request...
                  </h4>
                  <p className="font-sans text-sm text-stone">This only takes a second.</p>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto bg-paper text-ink border-2 border-ink p-6 md:p-10 rounded-3xl shadow-hard">
                  <form onSubmit={handleAuditSubmit} className="space-y-6">
                    
                    {/* Goal Selection */}
                    <div>
                      <label className="block font-mono text-xs font-bold uppercase tracking-wider text-stone mb-2">
                        1. YOUR PRIMARY GROWTH OBJECTIVE:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {GOALS.map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setAuditGoal(g.id)}
                            className={`px-4 py-2 text-[10px] font-bold rounded-full border transition-all flex items-center gap-1.5 font-mono uppercase cursor-pointer ${
                              auditGoal === g.id
                                ? 'bg-ink border-ink text-lime'
                                : 'bg-cream/40 border-ink/20 text-ink hover:border-ink/60'
                            }`}
                          >
                            <span>{g.label}</span>
                            {auditGoal === g.id && <Check className="w-3 h-3 shrink-0 text-lime" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Website */}
                      <div>
                        <label htmlFor="audit-website" className="block font-mono text-xs font-bold uppercase tracking-wider text-stone mb-1.5">
                          YOUR WEBSITE *
                        </label>
                        <input
                          type="url"
                          id="audit-website"
                          required
                          placeholder="https://yourcompany.com"
                          value={auditWebsite}
                          onChange={e => setAuditWebsite(e.target.value)}
                          className="w-full px-4 py-2.5 border-1.5 border-ink bg-cream/20 text-ink font-mono text-sm rounded-xl focus-ring"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label htmlFor="audit-email" className="block font-mono text-xs font-bold uppercase tracking-wider text-stone mb-1.5">
                          WORK EMAIL *
                        </label>
                        <input
                          type="email"
                          id="audit-email"
                          required
                          placeholder="name@company.com"
                          value={auditEmail}
                          onChange={e => setAuditEmail(e.target.value)}
                          className="w-full px-4 py-2.5 border-1.5 border-ink bg-cream/20 text-ink font-mono text-sm rounded-xl focus-ring"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Name */}
                      <div>
                        <label htmlFor="audit-name" className="block font-mono text-xs font-bold uppercase tracking-wider text-stone mb-1.5">
                          YOUR NAME
                        </label>
                        <input
                          type="text"
                          id="audit-name"
                          placeholder="Sarah Jenkins"
                          value={auditName}
                          onChange={e => setAuditName(e.target.value)}
                          className="w-full px-4 py-2.5 border-1.5 border-ink bg-cream/20 text-ink font-mono text-sm rounded-xl focus-ring"
                        />
                      </div>

                      {/* Company */}
                      <div>
                        <label htmlFor="audit-company" className="block font-mono text-xs font-bold uppercase tracking-wider text-stone mb-1.5">
                          COMPANY NAME
                        </label>
                        <input
                          type="text"
                          id="audit-company"
                          placeholder="VeloSaaS"
                          value={auditCompany}
                          onChange={e => setAuditCompany(e.target.value)}
                          className="w-full px-4 py-2.5 border-1.5 border-ink bg-cream/20 text-ink font-mono text-sm rounded-xl focus-ring"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Competitor */}
                      <div>
                        <label htmlFor="audit-competitor" className="block font-mono text-xs font-bold uppercase tracking-wider text-stone mb-1.5">
                          TOP COMPETITOR URL
                        </label>
                        <input
                          type="url"
                          id="audit-competitor"
                          placeholder="https://competitor.com"
                          value={auditCompetitor}
                          onChange={e => setAuditCompetitor(e.target.value)}
                          className="w-full px-4 py-2.5 border-1.5 border-ink bg-cream/20 text-ink font-mono text-sm rounded-xl focus-ring"
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label htmlFor="audit-phone" className="block font-mono text-xs font-bold uppercase tracking-wider text-stone mb-1.5">
                          PHONE (FOR TEXT ALERTS)
                        </label>
                        <input
                          type="tel"
                          id="audit-phone"
                          placeholder="+1 (555) 019-2834"
                          value={auditPhone}
                          onChange={e => setAuditPhone(e.target.value)}
                          className="w-full px-4 py-2.5 border-1.5 border-ink bg-cream/20 text-ink font-mono text-sm rounded-xl focus-ring"
                        />
                      </div>
                    </div>

                    {/* Comments */}
                    <div>
                      <label htmlFor="audit-comments" className="block font-mono text-xs font-bold uppercase tracking-wider text-stone mb-1.5">
                        COMMENTS OR QUESTIONS
                      </label>
                      <textarea
                        id="audit-comments"
                        rows={3}
                        placeholder="Tell us about your target keywords, competitors, or growth goals..."
                        value={auditComments}
                        onChange={e => setAuditComments(e.target.value)}
                        className="w-full px-4 py-2.5 border-1.5 border-ink bg-cream/20 text-ink font-mono text-sm rounded-xl focus-ring resize-none"
                      />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2 text-center">
                      {auditError && (
                        <p className="flex items-center justify-center gap-2 font-mono text-xs text-rose-700 font-bold mb-4">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          {auditError}
                        </p>
                      )}
                      <button
                        type="submit"
                        className="w-full sm:w-auto px-12 py-4 bg-lime text-ink font-sans font-extrabold text-base border-2 border-ink shadow-hard hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 rounded-full transition-all flex items-center justify-center gap-2.5 cursor-pointer mx-auto"
                      >
                        <span>Claim My Free 15-Point Audit</span>
                        <ArrowRight className="w-5 h-5" />
                      </button>
                      <p className="font-mono text-[10px] text-stone mt-3 uppercase tracking-wide">
                        Delivered by a real strategist within 24 hours · No contracts
                      </p>
                    </div>

                  </form>
                </div>
              )}

            </div>
          </section>
        ) : currentView === 'privacy-policy' ? (
          <section className="py-20 bg-forest text-cream border-b-1.5 border-ink min-h-[90vh] relative overflow-hidden">
            {/* Subtle grid background */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:24px_24px]" />
            
            <div className="max-w-4xl mx-auto px-6 md:px-12 relative z-10">
              {/* Back to Home Button */}
              <div className="mb-12">
                <button
                  onClick={() => navigateTo('home')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-paper text-ink border-2 border-ink font-mono text-xs font-bold uppercase rounded-full hover:bg-cream transition-all cursor-pointer focus-ring shadow-hard hover:shadow-hard-hover"
                  id="privacy-back-btn"
                >
                  <span>← Back to Homepage</span>
                </button>
              </div>

              {/* Title Header */}
              <div className="text-center max-w-3xl mx-auto mb-16">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-lime text-ink border border-ink shadow-hard rounded-full mb-4 -rotate-1">
                  <Shield className="w-3.5 h-3.5" />
                  <span className="font-mono text-[10px] font-bold">YOUR DATA, PROTECTED</span>
                </div>
                <h1 className="font-display font-black text-4xl md:text-5xl lg:text-6xl text-cream tracking-tight leading-[1.1] mt-2">
                  Privacy Policy
                </h1>
                <p className="font-sans text-cream/70 mt-6 leading-relaxed text-base md:text-lg">
                  How we protect your performance analytics, competitive search intelligence, and organic datasets.
                </p>
              </div>

              <div className="space-y-8 bg-paper text-ink border-2 border-ink p-8 md:p-12 rounded-3xl shadow-hard">
                <section className="space-y-3 text-left">
                  <h3 className="font-display font-extrabold text-xl text-ink">1. What We Collect</h3>
                  <p className="font-sans text-sm text-stone leading-relaxed">
                    When you submit a form on this site, we collect the information you provide — your name, email address, phone number, company, website, growth goals, budget range, and any comments. To measure our own marketing (the same discipline we sell), we also record how you found us: the referring site, campaign parameters (UTM tags), the page you landed on, the page you submitted from, and technical details such as your browser type and IP address.
                  </p>
                </section>

                <section className="space-y-3 text-left border-t border-ink/10 pt-8">
                  <h3 className="font-display font-extrabold text-xl text-ink">2. Analytics & Service Providers</h3>
                  <p className="font-sans text-sm text-stone leading-relaxed">
                    We use Google Analytics 4 to understand site traffic; it sets cookies and processes usage data under Google's privacy policy. Form submissions are delivered to our team through a trusted third-party email delivery service and stored in our own secured database. We use your information solely to respond to your inquiry, prepare your audit or proposal, and analyze our marketing performance. We never sell, rent, or trade your information to anyone.
                  </p>
                </section>

                <section className="space-y-3 text-left border-t border-ink/10 pt-8">
                  <h3 className="font-display font-extrabold text-xl text-ink">3. Data Retention & Your Rights</h3>
                  <p className="font-sans text-sm text-stone leading-relaxed">
                    We keep lead and inquiry records for as long as they are useful for serving you and analyzing our business. You may request a copy of the information we hold about you, or ask us to correct or permanently delete it, at any time — email <a href="mailto:contact@optimizeindex.com" className="underline font-bold text-ink">contact@optimizeindex.com</a> or call 817 409 8408 and we will act on your request promptly.
                  </p>
                </section>

                <section className="space-y-3 text-left border-t border-ink/10 pt-8">
                  <h3 className="font-display font-extrabold text-xl text-ink">4. Client Confidentiality</h3>
                  <p className="font-sans text-sm text-stone leading-relaxed">
                    For active clients: your keyword strategies, competitive research, analytics access, and campaign data are treated as confidential. We never share or repurpose the strategies we build for your business with any competing brand.
                  </p>
                </section>

                <div className="pt-8 border-t border-ink/15 text-center flex flex-col md:flex-row items-center justify-between gap-4">
                  <p className="font-mono text-[10px] text-stone">LAST UPDATED: JULY 2026</p>
                  <button
                    onClick={() => navigateTo('home')}
                    className="px-6 py-3 bg-lime text-ink font-mono text-xs font-bold uppercase rounded-full hover:bg-lime/90 cursor-pointer shadow-hard"
                  >
                    Return to Home
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : currentView === 'terms-of-conversion' ? (
          <section className="py-20 bg-forest text-cream border-b-1.5 border-ink min-h-[90vh] relative overflow-hidden">
            {/* Subtle grid background */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:24px_24px]" />
            
            <div className="max-w-4xl mx-auto px-6 md:px-12 relative z-10">
              {/* Back to Home Button */}
              <div className="mb-12">
                <button
                  onClick={() => navigateTo('home')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-paper text-ink border-2 border-ink font-mono text-xs font-bold uppercase rounded-full hover:bg-cream transition-all cursor-pointer focus-ring shadow-hard hover:shadow-hard-hover"
                  id="terms-back-btn"
                >
                  <span>← Back to Homepage</span>
                </button>
              </div>

              {/* Title Header */}
              <div className="text-center max-w-3xl mx-auto mb-16">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-lime text-ink border border-ink shadow-hard rounded-full mb-4 -rotate-1">
                  <Check className="w-3.5 h-3.5" />
                  <span className="font-mono text-[10px] font-bold">15-DAY MONEY BACK GUARANTEE</span>
                </div>
                <h1 className="font-display font-black text-4xl md:text-5xl lg:text-6xl text-cream tracking-tight leading-[1.1] mt-2">
                  Terms of Service
                </h1>
                <p className="font-sans text-cream/70 mt-6 leading-relaxed text-base md:text-lg">
                  Understanding our performance benchmarks, strategy deliverables, and the 15-day money back guarantee.
                </p>
              </div>

              <div className="space-y-8 bg-paper text-ink border-2 border-ink p-8 md:p-12 rounded-3xl shadow-hard">
                <section className="space-y-3 text-left">
                  <h3 className="font-display font-extrabold text-xl text-ink">1. Performance & Growth Baseline</h3>
                  <p className="font-sans text-sm text-stone leading-relaxed">
                    Organic search gains, indexing updates, and traffic metrics are calculated relative to the domain diagnostics outlined in your initial 15-Point Performance Audit. All metrics are mapped directly to business transactions rather than superficial rank trackers.
                  </p>
                </section>

                <section className="space-y-3 text-left border-t border-ink/10 pt-8">
                  <h3 className="font-display font-extrabold text-xl text-ink text-forest">2. 15-Day Money Back Guarantee</h3>
                  <p className="font-sans text-sm text-stone leading-relaxed">
                    We stand fully behind the precision and performance of our strategic campaigns. If you are not completely satisfied with our custom search architecture, keyword clusters, indexation structures, or initial content recommendations within the first <strong>fifteen (15) calendar days</strong> of our partnership launch, we will refund 100% of your initial service fee, no questions asked.
                  </p>
                </section>

                <section className="space-y-3 text-left border-t border-ink/10 pt-8">
                  <h3 className="font-display font-extrabold text-xl text-ink">3. Implementation Coordination</h3>
                  <p className="font-sans text-sm text-stone leading-relaxed">
                    Search algorithms and generative engine index schemas mutate dynamically. For optimal compound revenue results, our partners agree to provide prompt coordinate access or cooperate in executing technical improvements, server-side metadata injections, and content modifications suggested by our engineers.
                  </p>
                </section>

                <section className="space-y-3 text-left border-t border-ink/10 pt-8">
                  <h3 className="font-display font-extrabold text-xl text-ink">4. Deliverable Ownership</h3>
                  <p className="font-sans text-sm text-stone leading-relaxed">
                    The competitive intelligence assets, indexing scripts, and target keywords we deliver are proprietary strategic items. While you retain full ownership of recommendations once paid, reselling or utilizing our custom strategy templates for unrelated web properties without permission is prohibited.
                  </p>
                </section>

                <div className="pt-8 border-t border-ink/15 text-center flex flex-col md:flex-row items-center justify-between gap-4">
                  <p className="font-mono text-[10px] text-stone">LAST UPDATED: JULY 2026</p>
                  <button
                    onClick={() => navigateTo('home')}
                    className="px-6 py-3 bg-lime text-ink font-mono text-xs font-bold uppercase rounded-full hover:bg-lime/90 cursor-pointer shadow-hard"
                  >
                    Return to Home
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="py-20 bg-forest text-cream border-b-1.5 border-ink min-h-[90vh] relative overflow-hidden">
            {/* Subtle grid background */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:24px_24px]" />
            
            <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
              {/* Back to Home Button */}
              <div className="mb-12">
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('home');
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-paper text-ink border-2 border-ink font-mono text-xs font-bold uppercase rounded-full hover:bg-cream transition-all cursor-pointer focus-ring shadow-hard hover:shadow-hard-hover"
                  id="quote-page-back-btn"
                >
                  <span>← Back to Homepage</span>
                </a>
              </div>

              {/* Title Header */}
              <div className="text-center max-w-3xl mx-auto mb-16">
                <h1 className="font-display font-black text-4xl md:text-5xl lg:text-6xl text-cream tracking-tight leading-[1.1]">
                  Ready to grow your <span className="font-serif-accent italic text-lime bg-ink px-2.5 py-0.5 rounded-sm shadow-hard inline-block -rotate-1">revenue?</span>
                </h1>
                <p className="font-sans text-cream/70 mt-6 leading-relaxed text-base md:text-lg">
                  Request your custom strategy from the experts behind scaled revenue metrics.
                </p>
              </div>

              {/* Two Column Layout (Form left, info right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mt-8">
                
                {/* LEFT: Form Card */}
                <div className="lg:col-span-7 w-full">
                  <div className="relative bg-paper text-ink border-2 border-ink p-6 md:p-10 rounded-2xl shadow-hard max-w-2xl mx-auto">
                    
                    {/* Overlapping capability badges */}
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center -space-x-3 z-20">
                      <div className="w-14 h-14 rounded-full border-2 border-ink bg-lime shadow-hard flex items-center justify-center" title="SEO">
                        <Search className="w-6 h-6 text-ink" />
                      </div>
                      <div className="w-14 h-14 rounded-full border-2 border-ink bg-ink shadow-hard z-10 scale-105 flex items-center justify-center" title="Growth">
                        <TrendingUp className="w-6 h-6 text-lime" />
                      </div>
                      <div className="w-14 h-14 rounded-full border-2 border-ink bg-forest shadow-hard flex items-center justify-center" title="AI Search">
                        <Zap className="w-6 h-6 text-lime" />
                      </div>
                    </div>

                    <div className="pt-6">
                      {!quoteIsSubmitting && !quoteIsSuccess ? (
                        <>
                          <h3 className="font-display font-black text-2xl md:text-3xl text-ink text-center mb-8" id="quote-form-title">
                            Request a FREE Proposal Now!
                          </h3>

                          <form onSubmit={handleQuoteSubmit} className="space-y-5 text-left">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* First and Last Name */}
                              <div>
                                <label htmlFor="quote-name" className="block font-mono text-xs font-bold uppercase tracking-wider text-stone mb-1.5">
                                  First and Last Name *
                                </label>
                                <input
                                  type="text"
                                  id="quote-name"
                                  required
                                  placeholder="Sarah Jenkins"
                                  value={quoteName}
                                  onChange={e => setQuoteName(e.target.value)}
                                  className="w-full px-3.5 py-2.5 border-1.5 border-ink bg-cream/30 text-ink font-mono text-xs rounded-xl focus-ring"
                                />
                              </div>

                              {/* Work Email Address */}
                              <div>
                                <label htmlFor="quote-email" className="block font-mono text-xs font-bold uppercase tracking-wider text-stone mb-1.5">
                                  Work Email Address *
                                </label>
                                <input
                                  type="email"
                                  id="quote-email"
                                  required
                                  placeholder="name@company.com"
                                  value={quoteEmail}
                                  onChange={e => setQuoteEmail(e.target.value)}
                                  className="w-full px-3.5 py-2.5 border-1.5 border-ink bg-cream/30 text-ink font-mono text-xs rounded-xl focus-ring"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Website */}
                              <div>
                                <label htmlFor="quote-website" className="block font-mono text-xs font-bold uppercase tracking-wider text-stone mb-1.5">
                                  Website *
                                </label>
                                <input
                                  type="url"
                                  id="quote-website"
                                  required
                                  placeholder="https://yourcompany.com"
                                  value={quoteWebsite}
                                  onChange={e => setQuoteWebsite(e.target.value)}
                                  className="w-full px-3.5 py-2.5 border-1.5 border-ink bg-cream/30 text-ink font-mono text-xs rounded-xl focus-ring"
                                />
                              </div>

                              {/* Company */}
                              <div>
                                <label htmlFor="quote-company" className="block font-mono text-xs font-bold uppercase tracking-wider text-stone mb-1.5">
                                  Company *
                                </label>
                                <input
                                  type="text"
                                  id="quote-company"
                                  required
                                  placeholder="VeloSaaS"
                                  value={quoteCompany}
                                  onChange={e => setQuoteCompany(e.target.value)}
                                  className="w-full px-3.5 py-2.5 border-1.5 border-ink bg-cream/30 text-ink font-mono text-xs rounded-xl focus-ring"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Phone Number */}
                              <div>
                                <label htmlFor="quote-phone" className="block font-mono text-xs font-bold uppercase tracking-wider text-stone mb-1.5">
                                  Phone Number *
                                </label>
                                <input
                                  type="tel"
                                  id="quote-phone"
                                  required
                                  placeholder="(000) 000-0000"
                                  value={quotePhone}
                                  onChange={e => setQuotePhone(e.target.value)}
                                  className="w-full px-3.5 py-2.5 border-1.5 border-ink bg-cream/30 text-ink font-mono text-xs rounded-xl focus-ring"
                                />
                              </div>

                              {/* Project Budget Dropdown */}
                              <div>
                                <label htmlFor="quote-budget" className="block font-mono text-xs font-bold uppercase tracking-wider text-stone mb-1.5">
                                  Project Budget *
                                </label>
                                <div className="relative">
                                  <select
                                    id="quote-budget"
                                    required
                                    value={quoteBudget}
                                    onChange={e => setQuoteBudget(e.target.value)}
                                    className="w-full appearance-none px-3.5 py-2.5 pr-10 border-1.5 border-ink bg-cream/30 text-ink font-mono text-xs rounded-xl focus-ring cursor-pointer"
                                  >
                                    <option value="< $1,000/month">&lt; $1,000 / month</option>
                                    <option value="$1,000 - $3,000/month">$1,000 - $3,000 / month</option>
                                    <option value="$3,000 - $5,000/month">$3,000 - $5,000 / month</option>
                                    <option value="$5,000+/month">$5,000+ / month</option>
                                  </select>
                                  <ChevronDown className="w-4 h-4 text-ink absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                              </div>
                            </div>

                            {/* Selected Performance Service (full width — titles are long) */}
                            <div>
                              <label htmlFor="quote-service" className="block font-mono text-xs font-bold uppercase tracking-wider text-stone mb-1.5">
                                Target Capability *
                              </label>
                              <div className="relative">
                                <select
                                  id="quote-service"
                                  required
                                  value={quoteService}
                                  onChange={e => {
                                    setQuoteService(e.target.value);
                                    setServiceHighlighted(false);
                                  }}
                                  className={`w-full appearance-none px-3.5 py-2.5 pr-10 border-1.5 font-mono text-xs rounded-xl focus-ring cursor-pointer transition-all bg-cream/30 text-ink ${
                                    serviceHighlighted ? 'border-lime bg-lime/10 font-bold' : 'border-ink'
                                  }`}
                                >
                                  {SERVICES.map(s => (
                                    <option key={s.id} value={s.id} className="bg-paper text-ink font-mono">
                                      {s.title}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="w-4 h-4 text-ink absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>
                            </div>

                            {/* Comments or Questions */}
                            <div>
                              <label htmlFor="quote-comments" className="block font-mono text-xs font-bold uppercase tracking-wider text-stone mb-1.5">
                                Comments or Questions
                              </label>
                              <textarea
                                id="quote-comments"
                                rows={4}
                                placeholder="Looking to get more leads? Frustrated with your current results? Planning something new? Tell us what's going on."
                                value={quoteComments}
                                onChange={e => setQuoteComments(e.target.value)}
                                className="w-full px-3.5 py-2.5 border-1.5 border-ink bg-cream/30 text-ink font-sans text-xs rounded-xl focus-ring resize-none leading-relaxed"
                              />
                            </div>

                            <div className="pt-2">
                              {quoteError && (
                                <p className="flex items-center justify-center gap-2 font-mono text-xs text-rose-700 font-bold mb-4">
                                  <AlertCircle className="w-4 h-4 shrink-0" />
                                  {quoteError}
                                </p>
                              )}
                              <button
                                type="submit"
                                className="w-full py-4 px-6 bg-lime text-ink font-sans font-bold text-sm border-2 border-ink shadow-hard hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer focus-ring"
                                id="quote-page-submit-btn"
                              >
                                <span className="font-extrabold tracking-wide uppercase">Request A Free Proposal</span>
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            </div>
                          </form>
                        </>
                      ) : quoteIsSubmitting ? (
                        <div className="py-12 text-center space-y-6">
                          <div className="relative w-16 h-16 mx-auto">
                            <div className="absolute inset-0 rounded-full border-4 border-lime/20 border-t-lime animate-spin" />
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
                              Sending your request...
                            </h4>
                            <p className="font-mono text-xs text-stone">
                              This only takes a second.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="py-12 text-center space-y-6">
                          <div className="w-16 h-16 bg-lime/20 rounded-full flex items-center justify-center mx-auto border-2 border-ink text-ink shadow-hard">
                            <Check className="w-8 h-8 stroke-[3]" />
                          </div>

                          <div className="space-y-2">
                            <h3 className="font-display font-black text-3xl text-ink">
                              Proposal Request Received!
                            </h3>
                            <p className="font-sans text-stone text-sm max-w-sm mx-auto leading-relaxed">
                              Our strategist has received your details for <span className="font-mono text-xs font-bold text-ink">{quoteWebsite}</span> and will research your business, competitors, and market. Expect your custom proposal within 24 hours.
                            </p>
                          </div>

                          <div className="pt-4">
                            <button
                              onClick={() => {
                                setQuoteIsSuccess(false);
                                setQuoteName('');
                                setQuoteEmail('');
                                setQuoteWebsite('');
                                setQuoteCompany('');
                                setQuotePhone('');
                                setQuoteBudget('< $1,000/month');
                                setQuoteComments('');
                              }}
                              className="px-6 py-2 bg-ink text-cream font-mono text-xs font-bold uppercase rounded-full hover:bg-lime hover:text-ink hover:shadow-hard transition-all shadow-hard"
                              id="reset-quote-form-btn"
                            >
                              Request Another Proposal
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                {/* RIGHT: Steps & Testimonial Column */}
                <div className="lg:col-span-5 text-left space-y-8 lg:pl-4">
                  
                  {/* Title Header */}
                  <div className="space-y-2">
                    <h3 className="font-display font-black text-2xl md:text-3xl text-cream tracking-tight">
                      Here’s what will happen next:
                    </h3>
                  </div>

                  {/* Checklist steps */}
                  <div className="space-y-6">
                    {/* Step 1 */}
                    <div className="flex gap-4 items-start group">
                      <div className="w-7 h-7 bg-lime text-ink rounded-full flex items-center justify-center shrink-0 border border-ink shadow-hard-xs">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-display font-extrabold text-lg text-cream leading-tight">
                          Get to know your business
                        </h4>
                        <p className="font-sans text-cream/70 text-xs md:text-sm leading-relaxed">
                          From our first conversation, we begin researching your business, competitors, and industry. We’ll audit your site to craft a fully customized proposal.
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-4 items-start group">
                      <div className="w-7 h-7 bg-lime text-ink rounded-full flex items-center justify-center shrink-0 border border-ink shadow-hard-xs">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-display font-extrabold text-lg text-cream leading-tight">
                          Put together your flight plan
                        </h4>
                        <p className="font-sans text-cream/70 text-xs md:text-sm leading-relaxed">
                          Based on their research, your strategist will compile personalized recommendations for how your business can drive more revenue.
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-4 items-start group">
                      <div className="w-7 h-7 bg-lime text-ink rounded-full flex items-center justify-center shrink-0 border border-ink shadow-hard-xs">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-display font-extrabold text-lg text-cream leading-tight">
                          Prepare for takeoff
                        </h4>
                        <p className="font-sans text-cream/70 text-xs md:text-sm leading-relaxed">
                          Your flight plan will include pricing, timelines, a detailed view of what a partnership with OptimizeIndex will look like, and how we’ll help your business grow.
                        </p>
                      </div>
                    </div>
                  </div>

             

                </div>

              </div>

            </div>
          </section>
        )}

        {/* SPEAK WITH AN EXPERT / PHONE SECTION */}
        <section className="py-20 bg-forest text-cream border-b-1.5 border-ink px-6 md:px-12 relative overflow-hidden">
          {/* Grid background pattern */}
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[linear-gradient(to_right,#F6F1E6_1px,transparent_1px),linear-gradient(to_bottom,#F6F1E6_1px,transparent_1px)] bg-[size:24px_24px]" />
          
          <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
            <h2 className="font-display font-extrabold text-3xl md:text-5xl text-cream tracking-tight">
              Ready to speak with a marketing expert? Give us a ring.
            </h2>
      

            <div className="flex justify-center pt-2">
              <a
                href="tel:8174098408"
                className="inline-flex items-center gap-4 bg-lime hover:bg-lime/90 text-ink border-2 border-ink py-4 px-8 md:px-12 rounded-2xl shadow-hard hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all duration-150 group"
                id="phone-cta-button"
              >
                <span className="w-10 h-10 bg-ink rounded-xl flex items-center justify-center shrink-0">
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5 text-lime"
                  >
                    <path d="M20 15.5c-1.2 0-2.4-.2-3.6-.6-.3-.1-.7 0-1 .3l-2.2 2.2c-2.8-1.4-5.1-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1-.3-1.1-.5-2.3-.5-3.5 0-.6-.4-1-1-1H4c-.6 0-1 .4-1 1 0 9.4 7.6 17 17 17 .6 0 1-.4 1-1v-3.5c0-.6-.4-1-1-1z" />
                  </svg>
                </span>
                <div className="text-left font-mono">
                  <span className="block text-[10px] uppercase tracking-widest text-ink/70 font-semibold leading-none">
                    SPEAK WITH A STRATEGIST:
                  </span>
                  <span className="block text-2xl md:text-3xl font-black tracking-tight text-ink leading-none mt-1 font-mono">
                    817 409 8408
                  </span>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* PRE-FOOTER INK CTA SECTION */}
        <section className="bg-ink text-cream py-24 px-6 md:px-12 border-b-1.5 border-ink relative overflow-hidden">
          
          {/* Decorative spinning starburst background */}
          <div className="absolute right-[-20px] top-[-20px] opacity-20 hidden md:block">
            <Starburst text="FREE DECK" size={140} rotationSpeed={50} />
          </div>

          <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
            <span className="font-mono text-xs font-bold text-lime uppercase tracking-widest block">
              NO CONTRACTS · RESULTS YOU CAN VERIFY
            </span>
            
            <h2 className="font-display font-extrabold text-3xl md:text-5xl lg:text-6xl text-cream leading-tight max-w-3xl mx-auto">
              Ready to make search your #1 <span className="font-serif-accent italic text-lime bg-forest px-3 py-1 rounded-sm shadow-hard inline-block rotate-1">revenue</span> channel?
            </h2>

            <p className="font-sans text-cream/70 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
              Skip the long exploratory sales calls. Request a custom proposal highlighting search optimization opportunities and growth pathways.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <button
                onClick={() => navigateTo('quote')}
                className="w-full sm:w-auto px-8 py-4 bg-lime text-ink font-sans font-extrabold text-sm border-2 border-ink shadow-hard hover:shadow-hard-hover hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 rounded-full transition-all cursor-pointer focus-ring"
                id="prefooter-quote-btn"
              >
                <span>Get Free Quote →</span>
              </button>
              <button
                onClick={() => navigateTo('audit')}
                className="w-full sm:w-auto px-8 py-4 bg-transparent text-cream border-2 border-cream/30 hover:border-cream text-sm font-sans font-bold rounded-full transition-colors cursor-pointer focus-ring"
                id="prefooter-audit-btn"
              >
                <span>Claim Free Audit</span>
              </button>
            </div>

            <p className="font-mono text-[10px] text-cream/50 tracking-wide">
              15-DAY MONEY BACK GUARANTEE · NO RISK · EXPLAINED IN 24 HOURS
            </p>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-cream border-t-2 border-ink pt-16 pb-8 px-6 md:px-12 select-none overflow-hidden relative">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 relative z-10">
          
          {/* Logo Brand / Pitch Column */}
          <div className="col-span-2 space-y-4 text-left">
            <Logo size={38} variant="light" />
            <p className="font-sans text-stone text-xs leading-relaxed max-w-sm">
              We are SEO and GEO performance engineers. We replace slide decks with profit attribution. Every line of code is written to convert intent into scalable transactions.
            </p>
            
            <div className="pt-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-paper border border-ink text-forest font-mono text-[9px] font-bold rounded uppercase">
                <Shield className="w-3.5 h-3.5" />
                No-Contract Security Active
              </span>
            </div>
          </div>

          {/* Column 1: Services List */}
          <div className="text-left space-y-3">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink border-b border-ink/10 pb-2">SERVICES</p>
            <ul className="space-y-2 font-mono text-[11px] text-stone uppercase">
              <li>
                <a 
                  href="/audit?goal=revenue&service=seo" 
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/audit?goal=revenue&service=seo');
                  }}
                  className="hover:text-ink transition-colors text-left font-bold block"
                >
                  ORGANIC SEO
                </a>
              </li>
              <li>
                <a 
                  href="/audit?goal=conversions&service=geo" 
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/audit?goal=conversions&service=geo');
                  }}
                  className="hover:text-ink transition-colors text-left font-bold block"
                >
                  GENERATIVE GEO
                </a>
              </li>
              <li>
                <a 
                  href="/audit?goal=roi&service=paid-search" 
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/audit?goal=roi&service=paid-search');
                  }}
                  className="hover:text-ink transition-colors text-left font-bold block"
                >
                  PAID SEARCH ADS
                </a>
              </li>
              <li>
                <a 
                  href="/audit?goal=cac&service=paid-social" 
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/audit?goal=cac&service=paid-social');
                  }}
                  className="hover:text-ink transition-colors text-left font-bold block"
                >
                  PAID SOCIAL ADS
                </a>
              </li>
              <li>
                <a 
                  href="/audit?goal=profit&service=cro" 
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/audit?goal=profit&service=cro');
                  }}
                  className="hover:text-ink transition-colors text-left font-bold block"
                >
                  CRO TESTING
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Goals List */}
          <div className="text-left space-y-3">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink border-b border-ink/10 pb-2">BY PERFORMANCE GOAL</p>
            <ul className="space-y-2 font-mono text-[11px] text-stone uppercase">
              {GOALS.map(goal => (
                <li key={goal.id}>
                  <a
                    href={`/audit?goal=${goal.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/audit?goal=${goal.id}`);
                    }}
                    className="hover:text-ink transition-colors text-left block"
                    id={`footer-goal-nav-${goal.id}`}
                  >
                    {goal.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Firm Details */}
          <div className="text-left space-y-3">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink border-b border-ink/10 pb-2">THE AGENCY</p>
            <ul className="space-y-2 font-mono text-[11px] text-stone uppercase">
              <li>
                <a 
                  href="/case-studies"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('case-studies');
                  }}
                  className="hover:text-ink transition-colors text-left font-bold block"
                >
                  CASE STUDIES
                </a>
              </li>
              <li>
                <a 
                  href="mailto:contact@optimizeindex.com"
                  className="hover:text-ink transition-colors text-left font-bold block"
                >
                  CONTACT US
                </a>
              </li>
              <li>
                <a 
                  href="/audit"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('audit');
                  }}
                  className="hover:text-ink transition-colors text-left font-bold block"
                >
                  FREE AUDIT
                </a>
              </li>
              <li>
                <a 
                  href="/quote"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('quote');
                  }}
                  className="hover:text-ink transition-colors text-left font-bold block"
                >
                  GET FREE QUOTE
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Oversized watermark text bleeding off bottom */}
        <div className="text-center w-full select-none pointer-events-none mt-16 overflow-hidden">
          <span className="font-display font-black text-[12vw] tracking-tighter text-ink/[0.04] leading-none block uppercase">
            OPTIMIZEINDEX.
          </span>
        </div>

        {/* Legal bar */}
        <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-ink/10 flex flex-col md:flex-row justify-between items-center text-[10px] font-mono text-stone relative z-10">
          <p>© 2026 OPTIMIZEINDEX PERFORMANCE AGENCY. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-4 mt-2 md:mt-0 uppercase">
            <a 
              href="/privacy-policy" 
              onClick={(e) => {
                e.preventDefault();
                navigateTo('privacy-policy');
              }}
              className="hover:underline"
            >
              PRIVACY POLICY
            </a>
            <span>·</span>
            <a
              href="/terms-of-service"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('terms-of-conversion');
              }}
              className="hover:underline"
            >
              TERMS OF SERVICE
            </a>
          </div>
        </div>
      </footer>

      {/* LEAD CONVERSION DIALOG MODAL */}
      <LeadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type={modalType}
        preselectedGoal={selectedGoal}
      />

    </div>
  );
}

// Lightweight Markdown to React parser to avoid dependencies and React 19 issues
function parseMarkdownToReact(text: string) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    // Headings
    if (line.startsWith('# ')) {
      return (
        <h1 key={idx} className="font-display font-black text-2xl md:text-3xl lg:text-4xl text-cream tracking-tight mt-8 mb-4 border-b border-cream/10 pb-2">
          {line.replace('# ', '')}
        </h1>
      );
    }
    if (line.startsWith('## ')) {
      return (
        <h2 key={idx} className="font-display font-bold text-xl md:text-2xl text-lime tracking-tight mt-6 mb-3">
          {line.replace('## ', '')}
        </h2>
      );
    }
    if (line.startsWith('### ')) {
      return (
        <h3 key={idx} className="font-display font-semibold text-lg text-cream tracking-tight mt-5 mb-2">
          {line.replace('### ', '')}
        </h3>
      );
    }
    // Dividers
    if (line.trim() === '---') {
      return <hr key={idx} className="my-6 border-t border-cream/15" />;
    }
    // Bullet points
    if (line.startsWith('* ')) {
      const bulletText = line.replace('* ', '');
      if (bulletText.includes('**')) {
        const parts = bulletText.split('**');
        return (
          <li key={idx} className="ml-5 list-disc text-cream/80 text-sm md:text-base leading-relaxed my-1">
            {parts.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="text-lime font-bold">{part}</strong> : part)}
          </li>
        );
      }
      return (
        <li key={idx} className="ml-5 list-disc text-cream/80 text-sm md:text-base leading-relaxed my-1">
          {bulletText}
        </li>
      );
    }
    // Empty lines
    if (line.trim() === '') {
      return <div key={idx} className="h-2" />;
    }

    // Process inline markdown like bold (**text**)
    if (line.includes('**')) {
      const parts = line.split('**');
      return (
        <p key={idx} className="font-sans text-cream/75 text-sm md:text-base leading-relaxed my-2">
          {parts.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="text-lime font-bold">{part}</strong> : part)}
        </p>
      );
    }

    // Return simple paragraph
    return (
      <p key={idx} className="font-sans text-cream/75 text-sm md:text-base leading-relaxed my-2">
        {line}
      </p>
    );
  });
}
