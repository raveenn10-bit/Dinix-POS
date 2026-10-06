import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, ShieldCheck, UserPlus, Phone, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';

interface LoginPageProps {
  onNavigate?: (path: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login, registerAdmin } = useAuth();
  const { notifySuccess, notifyError } = useNotification();

  // Mode: 'signin' | 'setup_admin'
  const [authMode, setAuthMode] = useState<'signin' | 'setup_admin'>('signin');

  // Sign In Fields (Prefilled with official Danix Admin credentials)
  const [email, setEmail] = useState('danixlkstore@gmail.com');
  const [password, setPassword] = useState('Danix@2026Admin');
  const [rememberMe, setRememberMe] = useState(true);

  // Setup Admin Fields
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
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
      notifySuccess('Welcome to Danix POS!', 'Signed In Successfully');
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
        userFriendlyMsg = 'Incorrect email or password. Please try again.';
      } else if (err?.code === 'auth/invalid-email') {
        userFriendlyMsg = 'Please enter a valid email format.';
      } else if (err?.code === 'auth/too-many-requests') {
        userFriendlyMsg = 'Access temporarily locked due to too many failed attempts. Try again later.';
      } else if (err?.code === 'auth/api-key-not-valid') {
        userFriendlyMsg = 'Firebase configuration is pending or invalid. Please check your .env credentials.';
      }
      setErrorMessage(userFriendlyMsg);
      notifyError(userFriendlyMsg, 'Sign In Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!adminName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!adminEmail.trim()) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (adminPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (adminPassword !== adminConfirmPassword) {
      setErrorMessage('Passwords do not match. Please recheck.');
      return;
    }

    setIsLoading(true);
    try {
      await registerAdmin(adminName, adminEmail, adminPassword, adminPhone);
      notifySuccess('Master Admin account created successfully!', 'Welcome');
      if (onNavigate) {
        onNavigate('/dashboard');
      } else {
        window.location.href = '/dashboard';
      }
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      console.error('Setup admin error:', err);
      let msg = 'Failed to create Master Admin account.';
      if (err?.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Please sign in instead.';
      } else if (err?.code === 'auth/weak-password') {
        msg = 'Password is too weak. Please use a stronger password.';
      }
      setErrorMessage(msg);
      notifyError(msg, 'Registration Error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Radial Gradients */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-navy-500/20 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
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

          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white">
            DANIX <span className="text-brand-500">POS</span>
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Inventory, Invoice, Order & Delivery Management System
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

          {authMode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-5">
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
                    placeholder="name@business.com"
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
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-brand-500/40"
                />
                <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-400">
                  Keep me signed in on this device
                </label>
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

              {/* Setup Admin Link */}
              <div className="pt-4 border-t border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setAuthMode('setup_admin');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-400 transition-colors"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>First-time setup? Create Master Admin Account</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSetupAdmin} className="space-y-4">
              <div className="mb-2">
                <h3 className="text-base font-semibold text-white">Create Master Admin</h3>
                <p className="text-xs text-slate-400">
                  Set up the primary administrative owner account for Danix POS.
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative mt-1.5 rounded-xl shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Store Owner"
                    className="block w-full rounded-xl border border-slate-700 bg-slate-900/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Admin Email
                </label>
                <div className="relative mt-1.5 rounded-xl shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="owner@danix.lk"
                    className="block w-full rounded-xl border border-slate-700 bg-slate-900/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Phone (Optional)
                </label>
                <div className="relative mt-1.5 rounded-xl shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    type="tel"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    placeholder="076 252 4671"
                    className="block w-full rounded-xl border border-slate-700 bg-slate-900/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Password (min 6 characters)
                </label>
                <div className="relative mt-1.5 rounded-xl shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full rounded-xl border border-slate-700 bg-slate-900/80 py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative mt-1.5 rounded-xl shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={adminConfirmPassword}
                    onChange={(e) => setAdminConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full rounded-xl border border-slate-700 bg-slate-900/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all"
                  />
                </div>
              </div>

              {/* Submit Setup */}
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 px-4 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all disabled:opacity-60 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5" />
                    <span>Create Master Admin & Launch POS</span>
                  </>
                )}
              </button>

              <div className="pt-3 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setAuthMode('signin');
                  }}
                  className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                >
                  Already have an account? Sign In
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Security Footer */}
        <div className="flex items-center justify-center gap-2 text-center text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Enterprise 256-bit SSL Encryption & Firestore RBAC Protected</span>
        </div>
      </div>
    </div>
  );
};
