import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { NotificationProvider, useNotification } from '@/context/NotificationContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { ProductsPage } from '@/pages/products/ProductsPage';
import { InventoryPage } from '@/pages/inventory/InventoryPage';
import { CustomersPage } from '@/pages/customers/CustomersPage';
import { OrdersPage } from '@/pages/orders/OrdersPage';
import { CreateOrderPage } from '@/pages/orders/CreateOrderPage';
import { InvoicesPage } from '@/pages/invoices/InvoicesPage';
import { DeliveriesPage } from '@/pages/deliveries/DeliveriesPage';
import { ExpensesPage } from '@/pages/expenses/ExpensesPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { UsersPage } from '@/pages/users/UsersPage';
import { ActivityLogsPage } from '@/pages/activity/ActivityLogsPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { LogoAnimationPreview } from '@/pages/preview/LogoAnimationPreview';
import { DanixSplashScreen } from '@/components/brand/DanixSplashScreen';
import { Customer } from '@/types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const AdminRouteGuard: React.FC<{ children: React.ReactNode; onBack: () => void }> = ({
  children,
  onBack,
}) => {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center animate-in fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 mb-4 shadow-sm">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-navy-950">Administrator Access Restricted</h2>
        <p className="mt-2 max-w-md text-sm text-slate-500 leading-relaxed">
          This area is restricted to administrative managers. Your staff account has access to Products, Customers, Orders, Invoices, and Deliveries.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-navy-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Dashboard</span>
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

const MainApp: React.FC = () => {
  const { userProfile, loading } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<string>('/dashboard');
  const [selectedCustomerForOrder, setSelectedCustomerForOrder] = useState<Customer | null>(null);
  const [splashDismissed, setSplashDismissed] = useState<boolean>(false);

  // Sync with browser url if available
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname || '/dashboard');
    };
    window.addEventListener('popstate', handlePopState);
    if (window.location.pathname && window.location.pathname !== '/') {
      setCurrentRoute(window.location.pathname);
    }
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    setCurrentRoute(path);
    window.history.pushState({}, '', path);
  };

  // Standalone Logo Assembly Preview Studio (does not modify existing POS app)
  if (currentRoute === '/logo-preview' || currentRoute === '/preview/logo') {
    return <LogoAnimationPreview />;
  }

  // Option 2: Cinematic Splash Screen on App Open / Initial Loading
  if (!splashDismissed) {
    return (
      <DanixSplashScreen
        onFinish={() => setSplashDismissed(true)}
        isLoadingData={loading}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="text-xs font-semibold text-slate-300">Connecting to Danix POS...</p>
        </div>
      </div>
    );
  }

  // Auth pages routing
  if (currentRoute === '/forgot-password') {
    return <ForgotPasswordPage onNavigate={navigateTo} />;
  }

  if (!userProfile) {
    return <LoginPage onNavigate={navigateTo} />;
  }

  const renderContent = () => {
    if (currentRoute === '/products') {
      return <ProductsPage />;
    }
    if (currentRoute === '/inventory' || currentRoute === '/inventory/movements') {
      return <InventoryPage />;
    }
    if (currentRoute === '/customers') {
      return (
        <CustomersPage
          onNavigateToCreateOrder={(cust) => {
            setSelectedCustomerForOrder(cust);
            navigateTo('/orders/create');
          }}
        />
      );
    }
    if (currentRoute === '/orders/create' || currentRoute === '/pos') {
      return (
        <CreateOrderPage
          initialCustomer={selectedCustomerForOrder}
          onBack={() => {
            setSelectedCustomerForOrder(null);
            navigateTo('/orders');
          }}
          onOrderCreated={() => {
            setSelectedCustomerForOrder(null);
            navigateTo('/orders');
          }}
        />
      );
    }
    if (currentRoute.startsWith('/orders')) {
      return <OrdersPage />;
    }
    if (currentRoute === '/invoices') {
      return <InvoicesPage />;
    }
    if (currentRoute === '/deliveries') {
      return <DeliveriesPage />;
    }

    // Admin protected routes
    if (currentRoute === '/expenses') {
      return (
        <AdminRouteGuard onBack={() => navigateTo('/dashboard')}>
          <ExpensesPage />
        </AdminRouteGuard>
      );
    }
    if (currentRoute === '/reports') {
      return (
        <AdminRouteGuard onBack={() => navigateTo('/dashboard')}>
          <ReportsPage />
        </AdminRouteGuard>
      );
    }
    if (currentRoute === '/users') {
      return (
        <AdminRouteGuard onBack={() => navigateTo('/dashboard')}>
          <UsersPage />
        </AdminRouteGuard>
      );
    }
    if (currentRoute === '/activity-logs') {
      return (
        <AdminRouteGuard onBack={() => navigateTo('/dashboard')}>
          <ActivityLogsPage />
        </AdminRouteGuard>
      );
    }
    if (currentRoute === '/settings') {
      return (
        <AdminRouteGuard onBack={() => navigateTo('/dashboard')}>
          <SettingsPage />
        </AdminRouteGuard>
      );
    }

    // Default to Dashboard Overview
    return <DashboardPage onNavigate={navigateTo} />;
  };

  return (
    <AppLayout currentPath={currentRoute} onNavigate={navigateTo}>
      {renderContent()}
    </AppLayout>
  );
};

export function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <MainApp />
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
