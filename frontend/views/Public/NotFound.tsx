import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ICONS } from '../../constants';

const ACCENT = '#38BDF2';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div 
      className="min-h-[70vh] flex items-center justify-center px-4 py-16 sm:px-6 sm:py-24 md:grid-cols-2 lg:px-8 relative overflow-hidden select-none"
      style={{ zoom: 0.8 }}
    >
      {/* Background Decorative Blobs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#38BDF2]/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none animate-pulse duration-[12000ms]" />

      <div className="max-w-2xl w-full text-center relative z-10">
        {/* Animated Error Illustration */}
        <div className="flex justify-center mb-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-[#38BDF2]/20 rounded-full blur-xl group-hover:bg-[#38BDF2]/35 transition-all duration-500 scale-110" />
            <div className="w-24 h-24 rounded-full bg-white dark:bg-[#1E293B] border border-[#2E2E2F]/10 dark:border-white/10 flex items-center justify-center shadow-2xl relative transform transition-transform group-hover:scale-105 duration-300">
              <ICONS.AlertTriangle className="w-12 h-12 text-[#38BDF2] animate-bounce duration-1000" />
            </div>
          </div>
        </div>

        {/* 404 Title */}
        <h1 className="text-8xl sm:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#2E2E2F] via-[#38BDF2] to-[#2E2E2F] dark:from-white dark:via-[#38BDF2] dark:to-white">
          404
        </h1>
        
        <h2 className="mt-4 text-2xl sm:text-3xl font-black text-[#2E2E2F] dark:text-white tracking-tight uppercase">
          Lost in Space?
        </h2>
        
        <p className="mt-4 text-base text-primary-text dark:text-white/60 font-semibold leading-relaxed max-w-md mx-auto">
          We searched high and low, but this page seems to have floated away. Let's get you back on track.
        </p>

        {/* Glassmorphic Navigation Box */}
        <div className="mt-10 p-6 sm:p-8 rounded-3xl bg-white/40 dark:bg-[#1E293B]/40 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-xl max-w-lg mx-auto">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#2E2E2F]/50 dark:text-white/40 mb-6">
            Quick Navigation
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/"
              className="flex items-center justify-center gap-3 px-6 py-3.5 bg-[#38BDF2] hover:bg-[#2E2E2F] dark:hover:bg-white dark:hover:text-[#2E2E2F] text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-lg shadow-[#38BDF2]/20 hover:shadow-none hover:scale-[1.02] active:scale-[0.98]"
            >
              <ICONS.Home className="w-4 h-4" />
              <span>Go Home</span>
            </Link>

            <Link
              to="/browse-events"
              className="flex items-center justify-center gap-3 px-6 py-3.5 bg-white dark:bg-[#1E293B]/50 hover:bg-gray-100 dark:hover:bg-[#1E293B] text-[#2E2E2F] dark:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 border border-[#2E2E2F]/10 dark:border-white/10 hover:scale-[1.02] active:scale-[0.98]"
            >
              <ICONS.Calendar className="w-4 h-4" />
              <span>Browse Events</span>
            </Link>
          </div>

          <div className="mt-6 pt-6 border-t border-[#2E2E2F]/5 dark:border-white/5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-xs font-bold text-primary-text dark:text-white/60 hover:text-[#38BDF2] dark:hover:text-[#38BDF2] transition-colors"
            >
              <ICONS.ArrowLeft className="w-4 h-4" />
              <span>Go Back</span>
            </button>
            <span className="text-[#2E2E2F]/10 dark:text-white/10">|</span>
            <Link
              to="/contact-us"
              className="inline-flex items-center gap-2 text-xs font-bold text-primary-text dark:text-white/60 hover:text-[#38BDF2] dark:hover:text-[#38BDF2] transition-colors"
            >
              <ICONS.MessageSquare className="w-4 h-4" />
              <span>Report Issue</span>
            </Link>
          </div>
        </div>

        {/* Footer Power logo section */}
        <div className="mt-12 flex items-center justify-center gap-2 grayscale opacity-40 hover:opacity-80 transition-all duration-500">
          <div className="w-7 h-7 rounded-lg bg-[#2E2E2F] dark:bg-white flex items-center justify-center shadow-md">
            <ICONS.Monitor className="w-4 h-4 text-white dark:text-[#2E2E2F]" />
          </div>
          <span className="text-xs font-black tracking-tight text-[#2E2E2F] dark:text-white uppercase italic">
            StartupLab
          </span>
        </div>
      </div>
    </div>
  );
};
