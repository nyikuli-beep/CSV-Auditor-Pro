import React from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  ShieldCheck, 
  Lock, 
  Zap, 
  CheckCircle2, 
  Sliders, 
  RefreshCw, 
  HeartHandshake, 
  Quote, 
  GraduationCap, 
  Code2, 
  Rocket, 
  Compass, 
  Award, 
  Terminal,
  Target,
  ArrowRight,
  UserCheck
} from 'lucide-react';

interface AboutFounderProps {
  isDarkMode?: boolean;
}

export const AboutFounder: React.FC<AboutFounderProps> = ({ isDarkMode = false }) => {
  // Schema.org Person JSON-LD for SEO
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Bramwel Nyikuli",
    "jobTitle": "Founder & Software Engineer",
    "worksFor": {
      "@type": "Organization",
      "name": "CSV Auditor Pro"
    },
    "description": "Founder of CSV Auditor Pro, an enterprise platform for CSV validation, cleaning, auditing, and AI-powered data analysis."
  };

  const coreValues = [
    {
      id: "value-card-innovation",
      title: "Innovation",
      description: "Pioneering intelligent algorithms and AI-assisted workflows for seamless data processing.",
      icon: Sparkles,
      badgeColor: "bg-[#2563EB]/10 text-[#2563EB] dark:bg-[#60A5FA]/10 dark:text-[#60A5FA]"
    },
    {
      id: "value-card-data-integrity",
      title: "Data Integrity",
      description: "Uncompromising standards for accurate, duplicate-free, and perfectly formatted datasets.",
      icon: ShieldCheck,
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400"
    },
    {
      id: "value-card-security",
      title: "Security",
      description: "Bank-grade privacy, local-first sandbox processing, and strict enterprise encryption.",
      icon: Lock,
      badgeColor: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400"
    },
    {
      id: "value-card-performance",
      title: "Performance",
      description: "High-throughput validation streaming millions of rows in milliseconds.",
      icon: Zap,
      badgeColor: "bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400"
    },
    {
      id: "value-card-reliability",
      title: "Reliability",
      description: "Deterministic rules and robust audit logging you can depend on for critical operations.",
      icon: CheckCircle2,
      badgeColor: "bg-teal-500/10 text-teal-600 dark:bg-teal-400/10 dark:text-teal-400"
    },
    {
      id: "value-card-simplicity",
      title: "Simplicity",
      description: "Intuitive interface design removing complexity from complex CSV data transformations.",
      icon: Sliders,
      badgeColor: "bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400"
    },
    {
      id: "value-card-continuous-improvement",
      title: "Continuous Improvement",
      description: "Relentless user-driven iteration, performance tuning, and rule engine expansion.",
      icon: RefreshCw,
      badgeColor: "bg-purple-500/10 text-purple-600 dark:bg-purple-400/10 dark:text-purple-400"
    },
    {
      id: "value-card-customer-success",
      title: "Customer Success",
      description: "Empowering teams and individuals to achieve their goals with clean, trustworthy data.",
      icon: HeartHandshake,
      badgeColor: "bg-rose-500/10 text-rose-600 dark:bg-rose-400/10 dark:text-rose-400"
    }
  ];

  const timelineSteps = [
    {
      id: "timeline-step-idea",
      stage: "Idea",
      year: "2024",
      description: "Identified the critical need for deterministic, fast CSV validation and clean schema enforcement.",
      icon: Compass,
      status: "completed"
    },
    {
      id: "timeline-step-dev",
      stage: "Development",
      year: "2024 - 2025",
      description: "Engineered high-speed parsing engines, multi-threaded worker pipelines, and custom regex validation.",
      icon: Code2,
      status: "completed"
    },
    {
      id: "timeline-step-testing",
      stage: "Testing",
      year: "2025",
      description: "Extensive benchmarking across multi-gigabyte files, edge-case schema testing, and security auditing.",
      icon: Terminal,
      status: "completed"
    },
    {
      id: "timeline-step-[#public-launch]",
      stage: "Public Launch",
      year: "2025",
      description: "Released CSV Auditor Pro with AI-assisted insights, team collaboration, and automated batch cleaning.",
      icon: Rocket,
      status: "active"
    },
    {
      id: "timeline-step-innovation",
      stage: "Continuous Innovation",
      year: "Ongoing",
      description: "Expanding automated data pipelines, enterprise workspace connectors, and advanced AI models.",
      icon: Sparkles,
      status: "upcoming"
    }
  ];

  return (
    <section 
      id="about-founder" 
      className={`py-20 md:py-28 transition-colors duration-200 border-t ${
        isDarkMode 
          ? 'bg-[#0F172A] text-[#F8FAFC] border-[#334155]' 
          : 'bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0]'
      }`}
    >
      {/* Structured SEO Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />

      <div className="max-w-7xl mx-auto px-6 space-y-16">
        
        {/* Header Title */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase border ${
            isDarkMode 
              ? 'bg-[#1E293B] border-[#334155] text-[#60A5FA]' 
              : 'bg-[#EFF6FF] border-[#DBEAFE] text-[#2563EB]'
          }`}>
            <UserCheck className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
            <span>Leadership & Vision</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
            Meet the Founder
          </h2>

          <p className={`text-base sm:text-lg leading-relaxed ${
            isDarkMode ? 'text-[#94A3B8]' : 'text-slate-600'
          }`}>
            The story, core values, and mission behind building CSV Auditor Pro—engineered for performance, precision, and reliable data quality.
          </p>
        </div>

        {/* Main Grid: Founder Profile Card + Biography */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Professional Profile Card */}
          <div 
            id="founder-profile-card"
            className={`lg:col-span-5 rounded-2xl p-6 sm:p-8 border shadow-sm transition-all duration-200 ${
              isDarkMode 
                ? 'bg-[#1E293B] border-[#334155] text-white' 
                : 'bg-white border-[#E2E8F0] text-slate-900'
            }`}
          >
            <div className="flex flex-col items-center text-center space-y-5">
              
              {/* Modern Initials Avatar */}
              <div className="relative">
                <div 
                  id="avatar-bn-placeholder"
                  className="w-24 h-24 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-black text-2xl tracking-widest shadow-md border-4 border-white dark:border-[#0F172A]"
                >
                  BN
                </div>
                <div 
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-emerald-500 text-white shadow-sm border-2 border-white dark:border-[#1E293B]"
                  title="Verified Founder"
                >
                  <Award className="w-4 h-4" />
                </div>
              </div>              {/* Title Info */}
              <div className="space-y-1">
                <h3 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Bramwel Nyikuli
                </h3>
                <p className={`text-sm font-bold ${isDarkMode ? 'text-[#60A5FA]' : 'text-[#2563EB]'}`}>
                  Founder & Software Engineer
                </p>
                <div className={`pt-1 inline-flex items-center gap-1.5 text-xs font-semibold ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  <GraduationCap className={`w-3.5 h-3.5 ${isDarkMode ? 'text-[#60A5FA]' : 'text-[#2563EB]'}`} />
                  <span>Computer Science Student & Engineer</span>
                </div>
              </div>

              {/* Divider */}
              <div className={`w-full border-t ${isDarkMode ? 'border-[#334155]' : 'border-slate-200'}`} />

              {/* Short Bio */}
              <p className={`text-xs leading-relaxed text-center ${
                isDarkMode ? 'text-slate-300' : 'text-slate-600'
              }`}>
                Passionate software developer dedicated to building high-performance, developer-first tools that eliminate data quality headaches and streamline business analytics.
              </p>

              {/* Mission Statement Box */}
              <div 
                id="founder-mission-box"
                className={`w-full p-4 rounded-xl border text-left space-y-1.5 ${
                  isDarkMode 
                    ? 'bg-[#0F172A] border-[#334155]' 
                    : 'bg-[#EFF6FF] border-[#DBEAFE]'
                }`}
              >
                <div className={`flex items-center gap-2 text-xs font-bold ${isDarkMode ? 'text-[#60A5FA]' : 'text-[#2563EB]'}`}>
                  <Target className="w-4 h-4" />
                  <span>Mission Statement</span>
                </div>
                <p className={`text-xs font-medium italic ${
                  isDarkMode ? 'text-slate-200' : 'text-slate-800'
                }`}>
                  "Building trusted tools for better data."
                </p>
              </div>

            </div>
          </div>

          {/* Right Column: Full Biography & Vision Statement */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Biography Paragraphs Card */}
            <div 
              id="founder-biography-card"
              className={`rounded-2xl p-6 sm:p-8 border shadow-sm space-y-5 ${
                isDarkMode 
                  ? 'bg-[#1E293B] border-[#334155]' 
                  : 'bg-white border-[#E2E8F0]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${
                  isDarkMode ? 'bg-[#0F172A] text-[#60A5FA]' : 'bg-[#EFF6FF] text-[#2563EB]'
                }`}>
                  <Code2 className={`w-5 h-5 ${isDarkMode ? 'text-[#60A5FA]' : 'text-[#2563EB]'}`} />
                </div>
                <div>
                  <h3 className={`text-xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Biography
                  </h3>
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    The motivation and journey behind the software
                  </p>
                </div>
              </div>

              <div className={`space-y-4 text-sm sm:text-base leading-relaxed ${
                isDarkMode ? 'text-slate-300' : 'text-slate-700'
              }`}>
                <p>
                  <strong>Bramwel Nyikuli</strong> is a Computer Science student and software engineer passionate about building practical software that solves real-world data challenges.
                </p>
                <p>
                  He founded CSV Auditor Pro to help individuals, businesses, researchers, and organizations improve the quality of CSV data through intelligent validation, automated cleaning, AI-assisted analysis, and secure collaboration.
                </p>
                <p>
                  His goal is to make data preparation faster, more reliable, and accessible to everyone—from individual professionals to enterprise teams.
                </p>
                <p>
                  CSV Auditor Pro reflects his commitment to creating software that combines simplicity, performance, security, and a professional user experience.
                </p>
              </div>
            </div>

            {/* Vision Card */}
            <div 
              id="founder-vision-card"
              className={`rounded-2xl p-6 sm:p-8 border shadow-sm space-y-4 ${
                isDarkMode 
                  ? 'bg-[#1E293B] border-[#334155]' 
                  : 'bg-white border-[#E2E8F0]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${
                  isDarkMode ? 'bg-[#0F172A] text-[#60A5FA]' : 'bg-[#EFF6FF] text-[#2563EB]'
                }`}>
                  <Compass className={`w-5 h-5 ${isDarkMode ? 'text-[#60A5FA]' : 'text-[#2563EB]'}`} />
                </div>
                <h3 className={`text-xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Our Vision
                </h3>
              </div>

              <blockquote className={`text-base sm:text-lg font-medium leading-relaxed p-4 rounded-xl border-l-4 border-[#2563EB] ${
                isDarkMode 
                  ? 'bg-[#0F172A] text-slate-200' 
                  : 'bg-slate-50 text-slate-800'
              }`}>
                "Our vision is to make CSV Auditor Pro the trusted platform for CSV validation, data quality, and AI-powered data intelligence used by professionals around the world."
              </blockquote>
            </div>

          </div>

        </div>

        {/* Personal Quote Card */}
        <div 
          id="founder-quote-card"
          className={`rounded-2xl p-8 border shadow-sm text-center relative overflow-hidden ${
            isDarkMode 
              ? 'bg-[#1E293B] border-[#334155]' 
              : 'bg-white border-[#E2E8F0]'
          }`}
        >
          <div className="max-w-3xl mx-auto space-y-4">
            <Quote className={`w-10 h-10 opacity-40 mx-auto ${isDarkMode ? 'text-[#60A5FA]' : 'text-[#2563EB]'}`} />
            <p className={`text-xl sm:text-2xl font-bold tracking-tight leading-snug ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              «"Great decisions begin with clean, trustworthy data."»
            </p>
            <div className={`pt-2 text-sm font-extrabold ${isDarkMode ? 'text-[#60A5FA]' : 'text-[#2563EB]'}`}>
              — Bramwel Nyikuli
            </div>
          </div>
        </div>

        {/* Core Values Section */}
        <div className="space-y-8" id="founder-core-values">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h3 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Core Values
            </h3>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              The principles that guide our product decisions, engineering, and support.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {coreValues.map((value) => {
              const ValueIcon = value.icon;
              return (
                <div 
                  key={value.id}
                  id={value.id}
                  className={`rounded-2xl p-5 border shadow-sm transition-all duration-200 hover:border-[#2563EB]/50 ${
                    isDarkMode 
                      ? 'bg-[#1E293B] border-[#334155]' 
                      : 'bg-white border-[#E2E8F0]'
                  }`}
                >
                  <div className="space-y-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${value.badgeColor}`}>
                      <ValueIcon className="w-5 h-5" />
                    </div>
                    <h4 className={`text-base font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {value.title}
                    </h4>
                    <p className={`text-xs leading-relaxed ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      {value.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline Section */}
        <div className="space-y-8" id="founder-timeline">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h3 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Product Roadmap & Milestones
            </h3>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              From initial idea to enterprise-ready CSV intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative">
            {timelineSteps.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <div 
                  key={step.id}
                  id={step.id}
                  className={`rounded-2xl p-5 border shadow-sm flex flex-col justify-between space-y-4 relative ${
                    step.status === 'active'
                      ? 'border-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E293B] dark:border-[#60A5FA]'
                      : isDarkMode
                      ? 'bg-[#1E293B] border-[#334155]'
                      : 'bg-white border-[#E2E8F0]'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                        step.status === 'active'
                          ? 'bg-[#2563EB] text-white'
                          : isDarkMode
                          ? 'bg-[#0F172A] text-slate-300'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {step.stage}
                      </span>
                      <span className={`text-xs font-bold ${isDarkMode ? 'text-[#60A5FA]' : 'text-[#2563EB]'}`}>
                        {step.year}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <StepIcon className={`w-4 h-4 ${isDarkMode ? 'text-[#60A5FA]' : 'text-[#2563EB]'}`} />
                      <h4 className={`text-sm font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {step.stage}
                      </h4>
                    </div>

                    <p className={`text-xs leading-relaxed ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      {step.description}
                    </p>
                  </div>

                  {/* Flow Arrow for larger screens */}
                  {idx < timelineSteps.length - 1 && (
                    <div className={`hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 ${isDarkMode ? 'text-[#60A5FA]' : 'text-[#2563EB]'}`}>
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
};

export default AboutFounder;
