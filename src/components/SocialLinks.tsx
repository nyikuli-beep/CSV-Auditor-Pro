import React from 'react';

interface SocialLinkProps {
  isDarkMode?: boolean;
  className?: string;
  iconSize?: number;
  showLabels?: boolean;
}

// Official brand colors (no gradients, strict hex colors)
export const BRAND_COLORS = {
  xDark: '#000000',
  xLight: '#FFFFFF',
  twitter: '#1DA1F2',
  githubDark: '#24292F',
  githubLight: '#F0F6FC',
  linkedin: '#0A66C2'
};

export const XIcon: React.FC<{ size?: number; className?: string; isDarkMode?: boolean; color?: string }> = ({ 
  size = 18, 
  className = "",
  isDarkMode = false,
  color
}) => {
  const fillColor = color || (isDarkMode ? BRAND_COLORS.xLight : BRAND_COLORS.xDark);
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill={fillColor}
      className={`shrink-0 transition-transform duration-200 hover:scale-110 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
};

// Backwards compatibility alias
export const TwitterIcon = XIcon;

export const GitHubIcon: React.FC<{ size?: number; className?: string; isDarkMode?: boolean; color?: string }> = ({ 
  size = 18, 
  className = "",
  isDarkMode = false,
  color
}) => {
  const fillColor = color || (isDarkMode ? '#F0F6FC' : BRAND_COLORS.githubDark);
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill={fillColor}
      className={`shrink-0 transition-transform duration-200 hover:scale-110 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path 
        fillRule="evenodd" 
        clipRule="evenodd" 
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" 
      />
    </svg>
  );
};

export const LinkedInIcon: React.FC<{ size?: number; className?: string; color?: string }> = ({ 
  size = 18, 
  className = "",
  color = BRAND_COLORS.linkedin
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill={color}
    className={`shrink-0 transition-transform duration-200 hover:scale-110 ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v7.6H9.2v-7.6H6.46M7.83 6.25a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2" />
  </svg>
);

export const SocialLinksGroup: React.FC<SocialLinkProps> = ({ 
  isDarkMode = false, 
  className = "flex items-center gap-4",
  iconSize = 18,
  showLabels = false
}) => {
  return (
    <div className={className} id="footer-social-links">
      {/* X (formerly Twitter) */}
      <a 
        href="https://x.com" 
        target="_blank" 
        rel="noopener noreferrer" 
        id="footer-social-x"
        aria-label="Follow CSV Auditor Pro on X"
        title="X (@CSVAuditorPro)"
        className={`inline-flex items-center gap-1.5 p-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
          isDarkMode 
            ? 'hover:bg-[#1E293B] text-slate-300' 
            : 'hover:bg-[#F1F5F9] text-slate-700'
        }`}
      >
        <XIcon size={iconSize} isDarkMode={isDarkMode} />
        {showLabels && (
          <span className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>
            X
          </span>
        )}
      </a>

      {/* GitHub */}
      <a 
        href="https://github.com" 
        target="_blank" 
        rel="noopener noreferrer" 
        id="footer-social-github"
        aria-label="View CSV Auditor Pro source and documentation on GitHub"
        title="GitHub (CSV Auditor Pro)"
        className={`inline-flex items-center gap-1.5 p-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
          isDarkMode 
            ? 'hover:bg-[#1E293B] text-slate-300' 
            : 'hover:bg-[#F1F5F9] text-slate-700'
        }`}
      >
        <GitHubIcon size={iconSize} isDarkMode={isDarkMode} />
        {showLabels && (
          <span className={`text-xs font-semibold ${isDarkMode ? 'text-[#F0F6FC]' : 'text-[#24292F]'}`}>
            GitHub
          </span>
        )}
      </a>

      {/* LinkedIn */}
      <a 
        href="https://linkedin.com" 
        target="_blank" 
        rel="noopener noreferrer" 
        id="footer-social-linkedin"
        aria-label="Connect with CSV Auditor Pro on LinkedIn"
        title="LinkedIn (CSV Auditor Pro)"
        className={`inline-flex items-center gap-1.5 p-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
          isDarkMode 
            ? 'hover:bg-[#1E293B] text-slate-300' 
            : 'hover:bg-[#EFF6FF] text-slate-700'
        }`}
      >
        <LinkedInIcon size={iconSize} />
        {showLabels && <span className="text-xs font-semibold" style={{ color: BRAND_COLORS.linkedin }}>LinkedIn</span>}
      </a>
    </div>
  );
};
