import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  CreditCard,
  ShoppingBag,
  Clock,
  Truck,
  AlertTriangle,
  Boxes,
  Users,
  Plus,
  RefreshCw,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import {
  fetchDashboardMetrics,
  fetchRecentOrders,
  fetchLowStockProducts,
  fetchActivityLogs,
  quickRestockProduct,
  DashboardMetrics,
} from '@/lib/dataService';
import { Order, Product, ActivityLog } from '@/types';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { userProfile, isAdmin } = useAuth();
  const { notifySuccess, notifyError } = useNotification();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [restockingId, setRestockingId] = useState<string | null>(null);

  const loadData = async (force: boolean = false) => {
    setIsLoading(true);
    try {
      const [m, o, ls, a] = await Promise.all([
        fetchDashboardMetrics(force),
        fetchRecentOrders(6, force),
        fetchLowStockProducts(6, force),
        fetchActivityLogs('all', 'all', 6, force),
      ]);
      setMetrics(m);
      setRecentOrders(o);
      setLowStockItems(ls);
      setActivityLogs(a);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const handleQuickRestock = async (product: Product, quantity: number = 10) => {
    if (!userProfile) return;
    setRestockingId(product.id);
    try {
      await quickRestockProduct(
        product.id,
        quantity,
        { uid: userProfile.uid, name: userProfile.name }
      );
      notifySuccess(`Restocked +${quantity} units to ${product.name}!`, 'Inventory Updated');
      await loadData(true);
    } catch (err) {
      console.error('Restock error:', err);
      notifyError('Failed to restock item', 'Error');
    } finally {
      setRestockingId(null);
    }
  };

  const getOrderStatusBadge = (status: Order['orderStatus']) => {
    switch (status) {
      case 'delivered':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'confirmed':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'shipped':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'pending':
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  const getPaymentStatusBadge = (status: Order['paymentStatus']) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-50 text-emerald-700 font-medium';
      case 'refunded':
        return 'bg-rose-50 text-rose-700 font-medium';
      case 'unpaid':
      default:
        return 'bg-amber-50 text-amber-700 font-medium';
    }
  };

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 22) return 'Good evening';
    return 'Good night';
  };

  const getUserGreetingName = () => {
    if (!userProfile?.name) return 'Administrator';
    if (userProfile.name.toLowerCase() === 'danixlkstore') return 'Danix Store';
    return userProfile.name;
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Banner / Greetings */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-brand-500/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/20 px-3 py-1 text-xs font-semibold text-brand-300 border border-brand-500/30">
                <Sparkles className="h-3.5 w-3.5" />
                Danix Command Center
              </span>
              <span className="text-xs text-slate-400">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {getTimeBasedGreeting()}, {getUserGreetingName()}!
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Here is your Danix POS operational summary. All systems online and ready for orders & dispatch.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-navy-700 bg-navy-800/80 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-navy-700 transition-colors shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/pos')}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-brand-500/30 hover:bg-brand-600 transition-colors"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>POS Terminal</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid - 2 columns on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Today's Sales */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Today's Sales
            </span>
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <p className="mt-2 sm:mt-4 text-lg sm:text-2xl font-extrabold text-slate-900 truncate">
            Rs. {metrics?.todaySales.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '0.00'}
          </p>
          <p className="mt-1 text-[10px] sm:text-xs text-emerald-600 font-medium flex items-center gap-1 truncate">
            <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
            <span className="truncate">Verified receipts</span>
          </p>
        </div>

        {/* Total Revenue */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Total Revenue
            </span>
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-800">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <p className="mt-2 sm:mt-4 text-lg sm:text-2xl font-extrabold text-navy-950 truncate">
            Rs. {metrics?.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '0.00'}
          </p>
          <p className="mt-1 text-[10px] sm:text-xs text-slate-500 truncate">
            {metrics?.totalOrdersCount ?? 0} transactions
          </p>
        </div>

        {/* Orders & Pending Status */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Pending Orders
            </span>
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <p className="mt-2 sm:mt-4 text-lg sm:text-2xl font-extrabold text-amber-600 truncate">
            {metrics?.pendingOrdersCount ?? 0}{' '}
            <span className="text-xs font-semibold text-slate-400">
              / {metrics?.totalOrdersCount ?? 0}
            </span>
          </p>
          <p className="mt-1 text-[10px] sm:text-xs text-amber-700 font-medium truncate">
            Packing / dispatch
          </p>
        </div>

        {/* Active Deliveries */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Deliveries
            </span>
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Truck className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <p className="mt-2 sm:mt-4 text-lg sm:text-2xl font-extrabold text-purple-700 truncate">
            {metrics?.activeDeliveriesCount ?? 0} Parcels
          </p>
          <p className="mt-1 text-[10px] sm:text-xs text-slate-500 truncate">
            In courier transit
          </p>
        </div>
      </div>

      {/* Secondary KPI Bar: Low stock, Products, Customers */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div
          onClick={() => onNavigate('/inventory/movements')}
          className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/60 p-4 shadow-sm cursor-pointer hover:bg-rose-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-rose-800 uppercase tracking-wider">
                Low Stock Warning
              </p>
              <p className="text-lg font-bold text-rose-900">
                {metrics?.lowStockCount ?? 0} Products at threshold
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-rose-400" />
        </div>

        <div
          onClick={() => onNavigate('/products')}
          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm cursor-pointer hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Catalog Size
              </p>
              <p className="text-lg font-bold text-slate-900">
                {metrics?.totalProductsCount ?? 0} Active Products
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </div>

        <div
          onClick={() => onNavigate('/customers')}
          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm cursor-pointer hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Customer Database
              </p>
              <p className="text-lg font-bold text-slate-900">
                {metrics?.totalCustomersCount ?? 0} Registered Clients
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </div>
      </div>

      {/* Quick Action Shortcuts Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-3">
          Quick Operational Shortcuts
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/pos')}
            className="flex items-center gap-2.5 p-3 rounded-xl border border-brand-200 bg-brand-50/50 hover:bg-brand-100 hover:border-brand-300 transition-all text-left text-brand-900 font-semibold text-xs group"
          >
            <div className="h-7 w-7 rounded-lg bg-brand-500 text-white flex items-center justify-center shadow-sm">
              <Plus className="h-4 w-4" />
            </div>
            <span>New Order (POS)</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/products')}
            className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all text-left text-slate-800 font-semibold text-xs group"
          >
            <div className="h-7 w-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-sm">
              <Boxes className="h-4 w-4" />
            </div>
            <span>Add Product</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/customers')}
            className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all text-left text-slate-800 font-semibold text-xs group"
          >
            <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Users className="h-4 w-4" />
            </div>
            <span>New Customer</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/invoices')}
            className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all text-left text-slate-800 font-semibold text-xs group"
          >
            <div className="h-7 w-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-sm">
              <CreditCard className="h-4 w-4" />
            </div>
            <span>New Invoice</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/inventory/movements')}
            className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all text-left text-slate-800 font-semibold text-xs group"
          >
            <div className="h-7 w-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-sm">
              <RefreshCw className="h-4 w-4" />
            </div>
            <span>Adjust Stock</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left = Recent Orders, Right = Low Stock & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Recent Orders */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-navy-950">Recent Orders</h2>
                <p className="text-xs text-slate-500">Latest dispatched & counter sales</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/orders')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
              >
                <span>View all orders</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {recentOrders.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No orders recorded yet. Open POS to make the first sale!
                </div>
              ) : (
                recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-mono text-xs font-bold text-slate-700">
                        #{order.orderNumber.slice(-4)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900">
                            {order.customerName}
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            {order.orderNumber}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {order.items.length} items • {order.customerPhone}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pl-12 sm:pl-0">
                      <div className="text-right">
                        <p className="font-bold text-sm text-navy-950">
                          Rs. {order.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded capitalize ${getPaymentStatusBadge(order.paymentStatus)}`}>
                          {order.paymentStatus}
                        </span>
                      </div>

                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize shrink-0 ${getOrderStatusBadge(
                          order.orderStatus
                        )}`}
                      >
                        {order.orderStatus}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Activity Log Audit Stream */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-navy-950">Recent System Activity</h2>
                <p className="text-xs text-slate-500">Audit trail of transactions, stock, and settings</p>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => onNavigate('/activity-logs')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                >
                  <span>Full Audit Trail</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="p-4 divide-y divide-slate-100">
              {activityLogs.length === 0 ? (
                <p className="p-4 text-center text-xs text-slate-400">No activity logged yet.</p>
              ) : (
                activityLogs.map((log) => (
                  <div key={log.id} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                    <div className="mt-1 flex h-2 w-2 rounded-full bg-brand-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {log.description}
                        </p>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {new Date(Number(log.createdAt)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="font-medium text-slate-700">{log.performedByName}</span>
                        <span>•</span>
                        <span className="capitalize text-slate-400">{log.action}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Low Stock Alerts & Quick Restock Widget */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-navy-950">Low Stock Alert</h3>
                  <p className="text-[11px] text-slate-500">Products requiring restock</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/inventory/movements')}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                Inventory
              </button>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-emerald-50/60 border border-emerald-100">
                <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-emerald-900">Inventory Health Good</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  All active items are above minimum stock levels.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockItems.map((prod) => (
                  <div
                    key={prod.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-900 truncate">{prod.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-slate-500">{prod.sku}</span>
                        <span className="text-[10px] font-semibold text-rose-600">
                          {prod.stockQuantity} left (Min: {prod.minimumStock})
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={restockingId === prod.id}
                      onClick={() => handleQuickRestock(prod, 10)}
                      className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-brand-500 hover:text-brand-600 transition-all disabled:opacity-50"
                    >
                      {restockingId === prod.id ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Plus className="h-3 w-3 text-brand-500" />
                      )}
                      <span>+10</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Danix Galle Branch Support Card */}
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-navy-950 p-6 text-white shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 font-extrabold text-white">
                D
              </div>
              <div>
                <h4 className="font-bold text-sm">Danix.lk POS Headquarters</h4>
                <p className="text-[11px] text-slate-400">Akmeemana, Galle, Sri Lanka</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800 space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Hotline:</span>
                <span className="font-medium text-white">076 252 4671</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="font-medium text-white">danixlkstore@gmail.com</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Default Currency:</span>
                <span className="font-medium text-brand-400">Rs. (Sri Lankan Rupee)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
