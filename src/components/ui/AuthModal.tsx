import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cpu, Shield, Globe, ArrowRight, Loader2, BookOpen, Zap, History, CheckCircle2, Mail, Smartphone } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAppStore, type UserProfile } from '../../store/appStore';
import { 
  loginUser, registerUser, verifyOtp, resendOtp, requestLoginOtp, verifyLoginOtp, 
  forgotPassword, resetPassword, googleLogin, requestMobileOtp, verifyMobileOtp 
} from '../../services/api';

type AuthMode = 'login' | 'register' | 'verify' | 'login-otp' | 'forgot-password' | 'reset-password' | 'mobile-input' | 'mobile-otp';

interface AuthResponse {
  access_token: string;
  user: UserProfile;
  message?: string;
}

interface AuthModalProps {
  onSuccessCallback?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccessCallback }) => {
  const {
    isModalOpen, setIsModalOpen, setToken, setUser,
    pendingFile, setPendingFile, loadPastSessions,
  } = useAppStore();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [authMethod, setAuthMethod] = useState<'email' | 'mobile'>('email');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [usePasswordless, setUsePasswordless] = useState(false);
  
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    if (!isModalOpen) {
      setMode('login');
      setAuthMethod('email');
      setEmail('');
      setPhoneNumber('');
      setPassword('');
      setOtp('');
      setError('');
      setMessage('');
      if (!useAppStore.getState().user) {
        setPendingFile(null);
      }
    }
  }, [isModalOpen, setPendingFile]);

  const handleSuccess = async (data: AuthResponse) => {
    setToken(data.access_token);
    setUser(data.user);
    setIsModalOpen(false);
    await loadPastSessions();
    if (onSuccessCallback) onSuccessCallback();
    if (pendingFile) setPendingFile(null);
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoading(true);
        setError('');
        const data = await googleLogin(tokenResponse.access_token);
        await handleSuccess(data);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Google Auth failed. Please check your credentials.';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => setError('Google Login failed.')
  });

  if (!isModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      if (mode === 'mobile-input') {
        const res = await requestMobileOtp(phoneNumber);
        setMessage(res.mode === 'dev' ? 'OTP generated! (Check server console in Dev Mode)' : 'OTP sent to your mobile number!');
        setMode('mobile-otp');
        setResendCooldown(30);
      } else if (mode === 'mobile-otp') {
        const data = await verifyMobileOtp(phoneNumber, otp);
        await handleSuccess(data);
      } else if (mode === 'login') {
        if (usePasswordless) {
          await requestLoginOtp(email);
          setMessage('Login code sent! Please check your inbox.');
          setMode('login-otp');
          setResendCooldown(30);
        } else {
          try {
            await loginUser(email, password);
            setMessage('Login code sent! Please check your inbox.');
            setMode('login-otp');
            setPassword('');
            setResendCooldown(30);
          } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : '';
            if (errorMsg === "EMAIL_NOT_VERIFIED") {
              setError("Email not verified. We've sent a new code.");
              await resendOtp(email, 'signup');
              setMode('verify');
              setResendCooldown(30);
            } else {
              throw err;
            }
          }
        }
      } else if (mode === 'register') {
        const data = await registerUser(email, password);
        setMessage(data.message || 'Verification code sent!');
        setMode('verify');
        setResendCooldown(30);
      } else if (mode === 'verify') {
        const data = await verifyOtp(email, otp);
        await handleSuccess(data);
      } else if (mode === 'login-otp') {
        const data = await verifyLoginOtp(email, otp);
        await handleSuccess(data);
      } else if (mode === 'forgot-password') {
        await forgotPassword(email);
        setMessage('Password reset code sent to your email.');
        setMode('reset-password');
        setResendCooldown(30);
      } else if (mode === 'reset-password') {
        await resetPassword(email, otp, password);
        setMessage('Password successfully updated! You can now log in.');
        setMode('login');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    setError('');
    try {
      if (mode === 'mobile-otp') {
        await requestMobileOtp(phoneNumber);
        setMessage('OTP code resent to your mobile number.');
      } else if (mode === 'verify') {
        await resendOtp(email, 'signup');
        setMessage('Verification code resent successfully.');
      } else if (mode === 'login-otp') {
        await requestLoginOtp(email);
        setMessage('Login code resent successfully.');
      } else if (mode === 'reset-password') {
        await forgotPassword(email);
        setMessage('Reset code resent successfully.');
      }
      setResendCooldown(30);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend code';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const benefits = [
    { icon: History, text: 'Full session history saved forever' },
    { icon: BookOpen, text: 'Resume any past PDF discussion' },
    { icon: Zap, text: 'Unlimited document uploads' },
    { icon: Shield, text: 'End-to-end encrypted storage' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsModalOpen(false)}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative w-full max-w-2xl flex overflow-hidden rounded-2xl shadow-2xl border border-white/[0.08] bg-[#0c0d10]"
          style={{ boxShadow: '0 0 60px rgba(16,185,129,0.08), 0 25px 60px rgba(0,0,0,0.8)' }}
        >
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />

          <div className="hidden md:flex flex-col w-[45%] bg-gradient-to-br from-emerald-950/40 to-black/40 border-r border-white/[0.06] p-8 justify-between">
            <div>
              <div className="flex items-center gap-2 mb-8">
                <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-black" />
                </div>
                <span className="text-sm font-bold text-white tracking-tight">
                  quro<span className="text-emerald-500">.</span>io
                </span>
              </div>

              <h2 className="text-lg font-bold text-white leading-tight mb-2">
                Your research,<br />
                <span className="text-emerald-400">saved forever.</span>
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed mb-8">
                Sign in to unlock unlimited PDF analysis and access your full conversation history from any device.
              </p>

              <div className="space-y-4">
                {benefits.map((b, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 + 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <b.icon className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <span className="text-[11px] text-slate-400">{b.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-slate-700">
              <CheckCircle2 className="w-3 h-3 text-emerald-500/40" />
              Free forever · No credit card needed
            </div>
          </div>

          <div className="flex-1 p-6 md:p-8 flex flex-col relative overflow-hidden">
            <div className="flex md:hidden items-center gap-2 mb-6">
              <div className="w-6 h-6 bg-emerald-500 rounded-md flex items-center justify-center">
                <Cpu className="w-3.5 h-3.5 text-black" />
              </div>
              <span className="text-sm font-bold text-white">quro<span className="text-emerald-500">.</span>io</span>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  {mode === 'login' ? 'Welcome back' : 
                   mode === 'register' ? 'Create account' : 
                   mode === 'mobile-input' ? 'Mobile Sign In' :
                   mode === 'mobile-otp' ? 'Verify Mobile OTP' :
                   mode === 'forgot-password' ? 'Reset Password' :
                   mode === 'reset-password' ? 'Set New Password' :
                   'Verify Email'}
                </h3>
                {pendingFile && (mode === 'login' || mode === 'register' || mode === 'mobile-input') && (
                  <p className="text-[10px] text-emerald-400/80 mt-1">
                    Sign in to continue uploading <span className="font-medium text-emerald-400">{pendingFile.name}</span>
                  </p>
                )}
                {mode === 'mobile-otp' && (
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                    <Smartphone className="w-3 h-3 text-emerald-500" /> OTP sent to <span className="text-white font-medium">{phoneNumber}</span>
                  </p>
                )}
                {(mode === 'verify' || mode === 'login-otp' || mode === 'reset-password') && (
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-emerald-500" /> Code sent to <span className="text-white font-medium">{email}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Auth Method Selector Tabs (Email vs Mobile) */}
            {(mode === 'login' || mode === 'register' || mode === 'mobile-input') && (
              <div className="flex p-1 bg-white/[0.04] rounded-xl border border-white/[0.06] mb-4">
                <button
                  type="button"
                  onClick={() => { setAuthMethod('email'); setMode('login'); setError(''); setMessage(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    authMethod === 'email' && mode !== 'mobile-input'
                      ? 'bg-emerald-500 text-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" /> Email
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMethod('mobile'); setMode('mobile-input'); setError(''); setMessage(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    authMethod === 'mobile' || mode === 'mobile-input'
                      ? 'bg-emerald-500 text-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" /> Mobile OTP
                </button>
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.form
                key={mode}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSubmit}
                className="flex flex-col gap-4 flex-1"
              >
                {/* Mobile Input Mode */}
                {mode === 'mobile-input' && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-600 uppercase tracking-widest flex items-center gap-1">
                        Indian Mobile Number (+91)
                      </label>
                      <div className="flex gap-2">
                        <div className="flex items-center justify-center px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-xl text-xs font-medium text-emerald-400">
                          🇮🇳 +91
                        </div>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9+]/g, ''))}
                          placeholder="9876543210"
                          className="field flex-1"
                          required
                          autoFocus
                        />
                      </div>
                      <p className="text-[10px] text-slate-500">
                        An OTP code will be sent to your mobile phone via httpSMS.
                      </p>
                    </div>
                  </div>
                )}

                {/* Email / Register / Forgot Password Mode */}
                {(mode === 'login' || mode === 'register' || mode === 'forgot-password') && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-600 uppercase tracking-widest">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="field w-full"
                        required
                        autoFocus
                      />
                    </div>
                    {(!usePasswordless || mode === 'register') && mode !== 'forgot-password' && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] text-slate-600 uppercase tracking-widest">Password</label>
                          {mode === 'login' && (
                            <button
                              type="button"
                              onClick={() => { setMode('forgot-password'); setError(''); setMessage(''); }}
                              className="text-[10px] text-emerald-500 hover:text-emerald-400 transition-colors"
                            >
                              Forgot password?
                            </button>
                          )}
                        </div>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="field w-full"
                          required
                          minLength={6}
                        />
                      </div>
                    )}
                    
                    {mode === 'login' && (
                      <label className="flex items-center gap-2 cursor-pointer mt-2 group">
                        <div className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center transition-colors border ${usePasswordless ? 'bg-emerald-500 border-emerald-500' : 'bg-transparent border-slate-700 group-hover:border-emerald-500/50'}`}>
                          {usePasswordless && <CheckCircle2 className="w-2.5 h-2.5 text-black" />}
                        </div>
                        <span className="text-[11px] text-slate-400 group-hover:text-slate-300 transition-colors">
                          Send passwordless login code instead
                        </span>
                        <input 
                          type="checkbox" 
                          className="hidden" 
                          checked={usePasswordless} 
                          onChange={(e) => setUsePasswordless(e.target.checked)} 
                        />
                      </label>
                    )}
                  </div>
                )}

                {/* OTP Verification Views (Email & Mobile) */}
                {(mode === 'verify' || mode === 'login-otp' || mode === 'mobile-otp' || mode === 'reset-password') && (
                  <div className="space-y-3 py-2">
                    <div className="space-y-1.5 text-center">
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-3">
                        Enter 6-digit OTP Code
                      </label>
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="field w-full text-center text-2xl tracking-[0.5em] font-mono py-4"
                        required
                        autoFocus
                        pattern="[0-9]{6}"
                      />
                    </div>
                    {mode === 'reset-password' && (
                      <div className="space-y-1.5 mt-4 text-left">
                        <label className="text-[10px] text-slate-600 uppercase tracking-widest">New Password</label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="field w-full"
                          required
                          minLength={6}
                        />
                      </div>
                    )}
                  </div>
                )}

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-[10px] text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20"
                    >
                      {error}
                    </motion.div>
                  )}
                  {message && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-[10px] text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20"
                    >
                      {message}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={isLoading || ((mode === 'verify' || mode === 'login-otp' || mode === 'mobile-otp' || mode === 'reset-password') && otp.length !== 6)}
                  className="w-full btn-solid justify-center py-3 gap-2 text-xs mt-2"
                >
                  {isLoading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <>
                        {mode === 'login' ? (usePasswordless ? 'Send Code' : 'Sign In') : 
                         mode === 'mobile-input' ? 'Send Mobile OTP' :
                         mode === 'register' ? 'Create Account' : 
                         mode === 'forgot-password' ? 'Send Reset Code' :
                         'Verify Code'} 
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                  }
                </button>

                {(mode === 'login' || mode === 'register' || mode === 'mobile-input') && (
                  <div className="pt-2">
                    <div className="relative flex items-center mb-3">
                      <div className="flex-grow border-t border-white/[0.06]"></div>
                      <span className="flex-shrink-0 mx-4 text-[10px] text-slate-600 uppercase tracking-widest">or</span>
                      <div className="flex-grow border-t border-white/[0.06]"></div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleGoogleLogin()}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] rounded-xl transition-all text-xs text-white"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Continue with Google
                    </button>
                  </div>
                )}

                {(mode === 'verify' || mode === 'login-otp' || mode === 'mobile-otp' || mode === 'reset-password') && (
                  <div className="text-center mt-2">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendCooldown > 0 || isLoading}
                      className="text-[10px] text-slate-500 hover:text-emerald-400 transition-colors disabled:opacity-50 disabled:hover:text-slate-500"
                    >
                      {resendCooldown > 0 
                        ? `Resend code in ${resendCooldown}s` 
                        : "Didn't receive a code? Resend"}
                    </button>
                  </div>
                )}

                <div className="text-center">
                  {(mode === 'login' || mode === 'register' || mode === 'forgot-password' || mode === 'mobile-input') && (
                    <button
                      type="button"
                      onClick={() => { 
                        if (mode === 'mobile-input') {
                          setMode('login'); setAuthMethod('email'); 
                        } else {
                          setMode(mode === 'login' ? 'register' : 'login'); 
                        }
                        setError(''); setMessage(''); 
                      }}
                      className="text-[10px] text-emerald-500/60 hover:text-emerald-400 transition-colors"
                    >
                      {mode === 'login' ? "Don't have an account? Sign up free" : mode === 'mobile-input' ? 'Sign in with Email instead' : 'Back to sign in'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 mt-auto border-t border-white/[0.06]">
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-700">
                    <Shield className="w-3 h-3 text-emerald-500/40" />
                    AES-256 encrypted
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-700">
                    <Globe className="w-3 h-3 text-emerald-500/40" />
                    Neural Core v4.0
                  </div>
                </div>
              </motion.form>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
