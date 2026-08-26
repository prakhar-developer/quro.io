import React, { useRef } from 'react';
import { Cpu, RefreshCw, History, LogOut, ChevronDown, User, Key, Shield } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { motion, AnimatePresence } from 'framer-motion';
import { navigateToPath } from '../../utils/navigation';

export const Header: React.FC = () => {
  const {
    uploadedFiles, reset, setIsModalOpen, user, setShowApiDocs,
    showSessionHistory, setShowSessionHistory, logout, loadPastSessions,
  } = useAppStore();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleHistoryToggle = () => {
    if (!showSessionHistory) {
      loadPastSessions();
    }
    setShowSessionHistory(!showSessionHistory);
    setDropdownOpen(false);
  };

  // Identifier & Initials avatar
  const identifier = user?.email || user?.phone_number || 'User';
  const initials = identifier.replace('+', '').slice(0, 2).toUpperCase();

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#08080c]/90 backdrop-blur-xl">
      <div className="max-w-[1440px] mx-auto px-5 flex h-12 items-center justify-between">

        {/* Logo */}
        <motion.div
          onClick={() => { reset(); setShowApiDocs(false); navigateToPath('/'); }}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-6 h-6 bg-emerald-500 rounded-md flex items-center justify-center
                          group-hover:bg-emerald-400 transition-colors duration-200 flex-shrink-0">
            <Cpu className="w-3.5 h-3.5 text-black" />
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">
            quro<span className="text-emerald-500">.</span>io
          </span>
          <span className="tag hidden lg:inline-flex">
            <span className="dot-live" />
            v4.0
          </span>
        </motion.div>

        {/* Nav links */}
        <div className="hidden lg:flex items-center gap-6 text-[11px] font-medium text-slate-500">
          <button onClick={() => { setShowApiDocs(false); navigateToPath('/'); }} className="hover:text-slate-300 transition-colors">Home</button>
          <button onClick={() => { setShowApiDocs(true); navigateToPath('/docs'); }} className="hover:text-slate-300 transition-colors">API Docs</button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {uploadedFiles.length > 0 && !useAppStore.getState().showApiDocs && (
            <button onClick={reset} className="btn gap-1.5 hidden md:inline-flex">
              <RefreshCw className="w-3 h-3" />
              New file
            </button>
          )}
          <div className="w-px h-4 bg-white/[0.08] hidden md:block" />

          {user ? (
            /* ── Authenticated user dropdown ── */
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/[0.08]"
              >
                {/* Avatar circle */}
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-emerald-400">{initials}</span>
                </div>
                <span className="text-[10px] text-slate-400 hidden md:block max-w-[120px] truncate">
                  {user.email || user.phone_number}
                </span>
                <ChevronDown className={`w-3 h-3 text-slate-600 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1.5 w-52 bg-[#0f1013] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    {/* User info */}
                    <div className="px-3 py-2.5 border-b border-white/[0.06]">
                      <p className="text-[10px] text-slate-500">Signed in as</p>
                      <p className="text-[11px] font-medium text-white truncate mt-0.5">{user.email}</p>
                    </div>

                    {/* Menu items */}
                    <div className="p-1">
                      {user.is_admin && (
                        <button
                          onClick={() => { useAppStore.getState().setShowAdminPanel(true); setDropdownOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-emerald-500/10 transition-colors text-left group mb-1"
                        >
                          <Shield className="w-3.5 h-3.5 text-emerald-500 group-hover:text-emerald-400 transition-colors" />
                          <span className="text-[11px] text-emerald-400 group-hover:text-emerald-300 transition-colors font-medium">
                            Admin Center
                          </span>
                        </button>
                      )}
                      
                      <button
                        onClick={handleHistoryToggle}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors text-left group"
                      >
                        <History className="w-3.5 h-3.5 text-emerald-500/60 group-hover:text-emerald-400 transition-colors" />
                        <span className="text-[11px] text-slate-400 group-hover:text-white transition-colors">
                          {showSessionHistory ? 'Hide' : 'Show'} Session History
                        </span>
                      </button>
                      <button
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors text-left group"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <User className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                        <span className="text-[11px] text-slate-400 group-hover:text-white transition-colors">Profile</span>
                      </button>
                      <button
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors text-left group"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Key className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                        <span className="text-[11px] text-slate-400 group-hover:text-white transition-colors">API Key</span>
                      </button>
                    </div>

                    {/* Logout */}
                    <div className="p-1 border-t border-white/[0.06]">
                      <button
                        onClick={() => { logout(); setDropdownOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors text-left group"
                      >
                        <LogOut className="w-3.5 h-3.5 text-slate-600 group-hover:text-red-400 transition-colors" />
                        <span className="text-[11px] text-slate-400 group-hover:text-red-400 transition-colors">Sign out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* ── Guest sign-in button ── */
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-[9px] font-semibold text-emerald-500/50 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                1 free try
              </span>
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn-solid !px-2 md:!px-3"
              >
                <span className="text-[10px]">Sign in</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
};
