import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileText,
  Truck,
  Boxes,
  ArrowLeftRight,
  Users,
  Receipt,
  BarChart3,
  Shield,
  History,
  Settings,
  LogOut,
  X,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ElementType;
  requiredRole?: UserRole;
  badge?: string;
}

interface NavSection {
  title: string;
  items: SidebarItem[];
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'OPERATIONS',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'POS Terminal', href: '/pos', icon: ShoppingCart, badge: 'Sale' },
      { name: 'Orders', href: '/orders', icon: Package },
      { name: 'Invoices', href: '/invoices', icon: FileText },
      { name: 'Deliveries', href: '/deliveries', icon: Truck },
    ],
  },
  {
    title: 'CATALOG & CRM',
    items: [
      { name: 'Products', href: '/products', icon: Boxes },
      {
        name: 'Stock Movements',
        href: '/inventory/movements',
        icon: ArrowLeftRight,
        requiredRole: 'admin',
      },
      { name: 'Customers', href: '/customers', icon: Users },
    ],
  },
  {
    title: 'FINANCE & REPORTS',
    items: [
      {
        name: 'Expenses',
        href: '/expenses',
        icon: Receipt,
        requiredRole: 'admin',
      },
      {
        name: 'Reports & Insights',
        href: '/reports',
        icon: BarChart3,
        requiredRole: 'admin',
      },
    ],
  },
  {
    title: 'MANAGEMENT',
    items: [
      {
        name: 'Team & Staff',
        href: '/users',
        icon: Shield,
        requiredRole: 'admin',
      },
      {
        name: 'Activity Logs',
        href: '/activity-logs',
        icon: History,
        requiredRole: 'admin',
      },
      {
        name: 'Settings',
        href: '/settings',
        icon: Settings,
        requiredRole: 'admin',
      },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  currentPath = '/dashboard',
  onNavigate,
}) => {
  const { userProfile, role, isAdmin, logout } = useAuth();

  const handleNavClick = (href: string) => {
    if (onNavigate) {
      onNavigate(href);
    } else {
      window.location.href = href;
    }
    onClose();
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return currentPath === '/' || currentPath === '/dashboard';
    }
    return currentPath.startsWith(href);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          role="button"
          tabIndex={0}
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onClose();
          }}
          className="fixed inset-0 z-40 bg-navy-950/60 backdrop-blur-sm lg:hidden transition-opacity"
          aria-label="Close sidebar backdrop"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-navy-900 text-slate-200 shadow-2xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-navy-800 px-5">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-white p-0.5 shadow-md">
              <img
                src="/logo.jpg"
                alt="Danix POS Logo"
                className="h-full w-full object-contain"
                onError={(e) => {
                  // Fallback to text avatar if logo missing
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-wider text-white text-base">
                  DANIX
                </span>
                <span className="font-bold text-brand-500 text-base">POS</span>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-navy-300 font-medium">
                Online Management
              </p>
            </div>
          </div>

          {/* Close button for mobile */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-navy-800 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Card Summary */}
        <div className="mx-4 mt-4 rounded-xl border border-navy-800 bg-navy-950/60 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500 font-bold text-white shadow-sm">
                {userProfile?.name?.charAt(0) || 'D'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">
                  {userProfile?.name || 'Danix POS'}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {userProfile?.email || 'user@danix.lk'}
                </p>
              </div>
            </div>

            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide shrink-0 ${
                isAdmin
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
              }`}
            >
              {role || 'staff'}
            </span>
          </div>
        </div>

        {/* Nav Items List */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-thumb-navy-700">
          {NAV_SECTIONS.map((section) => {
            // Filter section items according to user role
            const visibleItems = section.items.filter(
              (item) => !item.requiredRole || (item.requiredRole === 'admin' && isAdmin)
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title}>
                <h3 className="mb-2 px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => handleNavClick(item.href)}
                        className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
                          active
                            ? 'bg-brand-500 text-white font-semibold shadow-md shadow-brand-500/20'
                            : 'text-slate-300 hover:bg-navy-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            className={`h-4 w-4 shrink-0 transition-colors ${
                              active
                                ? 'text-white'
                                : 'text-slate-400 group-hover:text-brand-400'
                            }`}
                          />
                          <span>{item.name}</span>
                        </div>

                        {item.badge && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${
                              active
                                ? 'bg-white text-brand-600'
                                : 'bg-brand-500/20 text-brand-300'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer info & Logout */}
        <div className="border-t border-navy-800 p-4">
          <button
            type="button"
            onClick={async () => {
              await logout();
              if (onNavigate) onNavigate('/login');
              else window.location.href = '/login';
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-navy-700 bg-navy-950/40 px-3 py-2 text-xs font-medium text-slate-300 hover:border-rose-500/50 hover:bg-rose-950/30 hover:text-rose-400 transition-all"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>

          <div className="mt-3 text-center">
            <p className="text-[10px] text-slate-400">Danix POS v1.0 • Sri Lanka</p>
          </div>
        </div>
      </aside>
    </>
  );
};
