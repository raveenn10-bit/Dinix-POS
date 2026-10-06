import React from 'react';
import {
  Menu,
  ShoppingCart,
  Search,
  Bell,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';

interface NavbarProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
  onToggleSidebar: () => void;
  title?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPath = '/dashboard',
  onNavigate,
  onToggleSidebar,
  title,
}) => {
  const { userProfile, role, isAdmin, logout } = useAuth();
  const { notifyInfo } = useNotification();

  const handleLogout = async () => {
    try {
      await logout();
      if (onNavigate) {
        onNavigate('/login');
      } else {
        window.location.href = '/login';
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const getPageTitle = () => {
    if (title) return title;
    const clean = currentPath.replace(/^\//, '').split('/')[0];
    if (!clean || clean === 'dashboard') return 'Dashboard Overview';
    if (clean === 'pos') return 'POS Terminal';
    if (clean === 'orders') return 'Order Management';
    if (clean === 'invoices') return 'Invoices & Billing';
    if (clean === 'deliveries') return 'Delivery Tracking';
    if (clean === 'products') return 'Product Inventory';
    if (clean === 'customers') return 'Customer Directory';
    if (clean === 'expenses') return 'Expense Tracker';
    if (clean === 'reports') return 'Sales & Financial Reports';
    if (clean === 'users') return 'Staff & Users';
    if (clean === 'settings') return 'Business Settings';
    if (clean === 'activity-logs') return 'Activity Logs';
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      {/* Left: Mobile menu toggle & page title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h1 className="text-lg font-bold text-navy-900 sm:text-xl">
            {getPageTitle()}
          </h1>
          <p className="hidden text-xs text-slate-500 sm:block">
            Danix Online Shopping & POS Management
          </p>
        </div>
      </div>

      {/* Right: Quick actions, notifications, role badge, profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Sale / POS Button */}
        <button
          type="button"
          onClick={() => {
            if (onNavigate) onNavigate('/pos');
            else window.location.href = '/pos';
          }}
          className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-brand-500/30 hover:bg-brand-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>New Sale (POS)</span>
        </button>

        {/* Notifications Icon */}
        <button
          type="button"
          onClick={() => notifyInfo('No unread system alerts at this moment', 'Notifications')}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          aria-label="View notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-500" />
        </button>

        {/* Role Badge */}
        <div className="hidden md:flex items-center">
          {isAdmin ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-brand-700 border border-brand-200">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-500" />
              Admin
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-sky-700 border border-sky-200">
              <UserCheck className="h-3.5 w-3.5 text-sky-600" />
              Staff
            </span>
          )}
        </div>

        {/* User Profile Info */}
        <div className="flex items-center gap-2 border-l border-slate-200 pl-2 sm:pl-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-sm font-semibold text-white shadow-sm">
            {userProfile?.name ? (
              userProfile.name.charAt(0).toUpperCase()
            ) : (
              <UserIcon className="h-4 w-4" />
            )}
          </div>

          <div className="hidden xl:block text-left">
            <p className="text-xs font-semibold text-navy-900 leading-tight">
              {userProfile?.name || 'Danix User'}
            </p>
            <p className="text-[10px] text-slate-500 capitalize">
              {role || 'staff'}
            </p>
          </div>

          {/* Quick Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            title="Log Out"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors ml-1"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
