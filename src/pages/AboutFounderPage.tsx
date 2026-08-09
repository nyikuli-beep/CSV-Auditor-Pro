import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { FileSpreadsheet, ArrowLeft, Sun, Moon } from 'lucide-react';
import { AboutFounder } from '../components/AboutFounder';

export const AboutFounderPage: React.FC = () => {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.backgroundColor = '#0F172A';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.backgroundColor = '#FFFFFF';
    }
  }, [isDarkMode]);

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 ${
      isDarkMode ? 'bg-[#0F172A] text-[#F8FAFC]' : 'bg-[#FFFFFF] text-[#0F172A]'
    }`}>
      {/* Navigation Bar */}
      <header className={`sticky top-0 z-50 border-b ${
        isDarkMode ? 'border-[#334155] bg-[#0F172A]' : 'border-[#E2E8F0] bg-white'
      } transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div 
            onClick={() => navigate('/')} 
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className={`p-2.5 rounded-xl ${
              isDarkMode ? 'bg-[#1E293B] text-[#2563EB]' : 'bg-[#EFF6FF] text-[#2563EB]'
            }`}>
              <FileSpreadsheet className="w-6 h-6 text-[#2563EB]" />
            </div>
            <div>
              <span className={`font-bold tracking-tight text-lg ${
                isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'
              }`}>CSV Auditor</span>
              <span className={`ml-1.5 px-2 py-0.5 text-xs font-bold rounded-md ${
                isDarkMode ? 'bg-[#1E293B] text-[#60A5FA] border border-[#334155]' : 'bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]'
              }`}>PRO</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <motion.button 
              onClick={toggleTheme} 
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              className={`p-2 rounded-xl border transition-colors duration-200 cursor-pointer ${
                isDarkMode ? 'bg-[#1E293B] border-[#334155] text-amber-400 hover:bg-[#334155]' : 'bg-white border-[#E2E8F0] text-[#2563EB] hover:bg-[#F8FAFC] shadow-sm'
              }`}
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={isDarkMode ? 'dark' : 'light'}
                  initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center"
                >
                  {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#2563EB]" />}
                </motion.div>
              </AnimatePresence>
            </motion.button>

            {/* Back Home CTA */}
            <button
              onClick={() => navigate('/')}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                isDarkMode 
                  ? 'bg-[#1E293B] border-[#334155] text-white hover:bg-[#334155]' 
                  : 'bg-white border-[#E2E8F0] text-slate-900 hover:bg-slate-50 shadow-sm'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to App</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <AboutFounder isDarkMode={isDarkMode} />
      </main>

      {/* Simplified Footer */}
      <footer className={`border-t py-8 text-xs text-center transition-colors duration-200 ${
        isDarkMode ? 'border-[#334155] bg-[#0F172A] text-[#CBD5E1]' : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]'
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; {new Date().getFullYear()} CSV Auditor Pro. Built by Bramwel Nyikuli.</p>
          <button
            onClick={() => navigate('/')}
            className="text-[#2563EB] dark:text-[#60A5FA] font-bold hover:underline cursor-pointer"
          >
            Explore CSV Auditor Pro
          </button>
        </div>
      </footer>
    </div>
  );
};

export default AboutFounderPage;
