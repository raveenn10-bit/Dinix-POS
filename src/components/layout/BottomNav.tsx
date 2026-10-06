import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileText,
  Menu,
} from 'lucide-react';

interface BottomNavProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
  onToggleSidebar: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentPath = '/dashboard',
  onNavigate,
  onToggleSidebar,
}) => {
  const handleNavClick = (href: string) => {
    if (onNavigate) {
      onNavigate(href);
    } else {
      window.location.href = href;
    }
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return currentPath === '/' || currentPath === '/dashboard';
    }
    return currentPath.startsWith(href);
  };

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-slate-200/90 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.06)] lg:hidden"
    >
      {/* 1. Dashboard */}
      <button
        type="button"
        onClick={() => handleNavClick('/dashboard')}
        className={`flex flex-1 flex-col items-center justify-center py-1 transition-colors ${
          isActive('/dashboard')
            ? 'text-brand-500 font-bold'
            : 'text-slate-500 hover:text-navy-900 font-medium'
        }`}
      >
        <LayoutDashboard className="h-5 w-5" />
        <span className="mt-1 text-[10px] tracking-tight">Dashboard</span>
      </button>

      {/* 2. Products */}
      <button
        type="button"
        onClick={() => handleNavClick('/products')}
        className={`flex flex-1 flex-col items-center justify-center py-1 transition-colors ${
          isActive('/products')
            ? 'text-brand-500 font-bold'
            : 'text-slate-500 hover:text-navy-900 font-medium'
        }`}
      >
        <Package className="h-5 w-5" />
        <span className="mt-1 text-[10px] tracking-tight">Products</span>
      </button>

      {/* 3. Center Elevated Action: New Sale (POS) */}
      <button
        type="button"
        onClick={() => handleNavClick('/pos')}
        className="relative -top-4 flex flex-col items-center justify-center"
      >
        <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white shadow-lg shadow-brand-500/40 ring-4 ring-white active:scale-95 transition-all">
          <ShoppingCart className="h-6 w-6" />
        </div>
        <span className="mt-0.5 text-[10px] font-bold text-brand-600">POS Sale</span>
      </button>

      {/* 4. Invoices */}
      <button
        type="button"
        onClick={() => handleNavClick('/invoices')}
        className={`flex flex-1 flex-col items-center justify-center py-1 transition-colors ${
          isActive('/invoices')
            ? 'text-brand-500 font-bold'
            : 'text-slate-500 hover:text-navy-900 font-medium'
        }`}
      >
        <FileText className="h-5 w-5" />
        <span className="mt-1 text-[10px] tracking-tight">Invoices</span>
      </button>

      {/* 5. Full Hamburger Drawer Toggle */}
      <button
        type="button"
        onClick={onToggleSidebar}
        className="flex flex-1 flex-col items-center justify-center py-1 text-slate-500 hover:text-navy-900 transition-colors font-medium active:scale-95"
      >
        <Menu className="h-5 w-5" />
        <span className="mt-1 text-[10px] tracking-tight">Menu</span>
      </button>
    </nav>
  );
};
