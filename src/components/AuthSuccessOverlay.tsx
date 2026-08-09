import React from 'react';
import { motion } from 'motion/react';

interface AuthSuccessOverlayProps {
  title?: string;
  message?: string;
  subtext?: string;
}

export const AuthSuccessOverlay: React.FC<AuthSuccessOverlayProps> = ({
  title = "AUTHENTICATION VERIFIED",
  message = "Access Granted",
  subtext = "Directing you to your enterprise workspace..."
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center py-8 px-4 text-center space-y-5"
    >
      {/* Animated Checkmark Container */}
      <div className="relative flex items-center justify-center">
        {/* Pulsing Ripple */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [0.9, 1.3, 1.1], opacity: [0.25, 0.5, 0.25] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-24 h-24 rounded-full bg-[#10B981]/20 pointer-events-none"
        />

        {/* Solid Circle */}
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.45, ease: [0.175, 0.885, 0.32, 1.275] }}
          className="w-20 h-20 rounded-full bg-[#10B981] flex items-center justify-center relative z-10 shadow-sm"
        >
          {/* Animated SVG Checkmark Path */}
          <svg
            className="w-10 h-10 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              d="M5 13l4 4L19 7"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                duration: 0.55,
                delay: 0.25,
                ease: "easeInOut"
              }}
            />
          </svg>
        </motion.div>
      </div>

      {/* Text Info */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.45 }}
        className="space-y-1.5"
      >
        <span className="text-[10px] font-extrabold tracking-widest text-[#10B981] uppercase block">
          {title}
        </span>
        <h3 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {message}
        </h3>
        <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
          {subtext}
        </p>
      </motion.div>

      {/* Redirect Spinner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.65 }}
        className="pt-2 flex items-center justify-center gap-2 text-xs font-semibold text-[#2563EB]"
      >
        <div className="w-3.5 h-3.5 border-2 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin" />
        <span>Redirecting workspace...</span>
      </motion.div>
    </motion.div>
  );
};

export default AuthSuccessOverlay;
