import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';

interface LoginPageProps {
  onNavigate?: (path: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const { notifySuccess, notifyError } = useNotification();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      notifySuccess('Welcome back to Danix POS!', 'Signed In');
      if (onNavigate) {
        onNavigate('/dashboard');
      } else {
        window.location.href = '/dashboard';
      }
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      console.error('Login error:', err);
      let userFriendlyMsg = 'Authentication failed. Please verify your credentials.';
      if (err?.code === 'auth/user-not-found') {
        userFriendlyMsg = 'No account found with this email address.';
      } else if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        userFriendlyMsg = 'Incorrect password. Please try again.';
      } else if (err?.code === 'auth/invalid-email') {
        userFriendlyMsg = 'Please provide a valid email format.';
      } else if (err?.code === 'auth/too-many-requests') {
        userFriendlyMsg = 'Access temporarily locked due to too many attempts. Reset your password or try later.';
      }
      setErrorMessage(userFriendlyMsg);
      notifyError(userFriendlyMsg, 'Sign In Error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await login(demoEmail, demoPass);
      notifySuccess(`Signed in as ${demoEmail.includes('admin') ? 'Admin' : 'Staff'}!`, 'Demo Access');
      if (onNavigate) {
        onNavigate('/dashboard');
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to sign in with demo credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Radial Gradients */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-navy-500/20 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-2xl ring-4 ring-brand-500/30">
            <img
              src="/logo.jpg"
              alt="Danix POS Logo"
              className="h-full w-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white">
            DANIX <span className="text-brand-500">POS</span>
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Trusted Online Shopping Management System
          </p>
        </div>

        {/* Card Form */}
        <div className="rounded-2xl border border-slate-800 bg-slate-800/80 p-8 shadow-2xl backdrop-blur-xl">
          {errorMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs text-rose-300 animate-in fade-in">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email-input"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
              >
                Email Address
              </label>
              <div className="relative mt-2 rounded-xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email-input"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@danix.lk"
                  className="block w-full rounded-xl border border-slate-700 bg-slate-900/80 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password-input"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (onNavigate) onNavigate('/forgot-password');
                    else window.location.href = '/forgot-password';
                  }}
                  className="text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative mt-2 rounded-xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password-input"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-xl border border-slate-700 bg-slate-900/80 py-3 pl-11 pr-11 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-200 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 px-4 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  <span>Sign In to POS</span>
                </>
              )}
            </button>
          </form>

          {/* Demo Quick Access */}
          <div className="mt-8 border-t border-slate-700/80 pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-brand-400" />
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Quick Demo Accounts:
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleQuickFill('admin@danix.lk', 'admin123')}
                disabled={isLoading}
                className="flex flex-col items-start p-2.5 rounded-xl border border-slate-700 bg-slate-900/50 hover:bg-slate-700/60 hover:border-brand-500/50 transition-all text-left group"
              >
                <div className="flex items-center gap-1.5 w-full justify-between">
                  <span className="text-xs font-semibold text-white group-hover:text-brand-400">
                    Super Admin
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                </div>
                <span className="text-[11px] text-slate-400 font-mono mt-0.5">
                  admin@danix.lk
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('staff@danix.lk', 'staff123')}
                disabled={isLoading}
                className="flex flex-col items-start p-2.5 rounded-xl border border-slate-700 bg-slate-900/50 hover:bg-slate-700/60 hover:border-sky-500/50 transition-all text-left group"
              >
                <div className="flex items-center gap-1.5 w-full justify-between">
                  <span className="text-xs font-semibold text-white group-hover:text-sky-400">
                    Counter Staff
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                </div>
                <span className="text-[11px] text-slate-400 font-mono mt-0.5">
                  staff@danix.lk
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500">
          Danix POS © {new Date().getFullYear()} • Secure Cloud POS System
        </p>
      </div>
    </div>
  );
};
