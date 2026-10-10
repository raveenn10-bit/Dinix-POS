import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Eye,
  FileCheck,
  Truck,
  CheckCircle2,
  Clock,
  RotateCcw,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  CreditCard,
  Banknote,
  DollarSign,
  Download,
  Trash2,
} from 'lucide-react';
import { Order, OrderStatus } from '@/types';
import { useOrders } from '@/lib/dataStore';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { CreateOrderPage } from './CreateOrderPage';
import { OrderDetailModal } from './OrderDetailModal';

interface OrdersPageProps {
  onNavigateToInvoice?: (order: Order) => void;
  onNavigateToDelivery?: (order: Order) => void;
}

export const OrdersPage: React.FC<OrdersPageProps> = ({
  onNavigateToInvoice,
  onNavigateToDelivery,
}) => {
  const { orders, loading, updateOrderStatus, refresh, deleteOrder, clearAllOrders } = useOrders();
  const { userProfile, isAdmin } = useAuth();
  const { notifySuccess, notifyError, notifyInfo } = useNotification();

  // Mode: List View or Create Order View
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');

  // Search & Status Tab State
  const [searchQuery, setSearchQuery] = useState('');
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState<boolean>(false);
  const [showClearAllModal, setShowClearAllModal] = useState<boolean>(false);
  const [isClearingAll, setIsClearingAll] = useState<boolean>(false);
  const [clearConfirmText, setClearConfirmText] = useState<string>('');
  const [activeStatusTab, setActiveStatusTab] = useState<string>('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'retail' | 'wholesale'>('all');

  // Selected Order for Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Status Tabs Definition
  const STATUS_TABS: { id: string; label: string }[] = [
    { id: 'all', label: 'All Orders' },
    { id: 'pending', label: 'Pending' },
    { id: 'confirmed', label: 'Confirmed' },
    { id: 'packed', label: 'Packed' },
    { id: 'shipped', label: 'Shipped' },
    { id: 'delivered', label: 'Delivered' },
    { id: 'cancelled', label: 'Cancelled' },
    { id: 'returned', label: 'Returned' },
  ];

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Tab check
      if (activeStatusTab !== 'all' && o.orderStatus !== activeStatusTab) {
        return false;
      }

      // Order Channel / Type check
      if (orderTypeFilter !== 'all') {
        const oType = o.orderType || 'retail';
        if (oType !== orderTypeFilter) return false;
      }

      // Search check: Order #, Customer Name, Phone
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNum = o.orderNumber.toLowerCase().includes(q);
        const matchesCust = o.customerName.toLowerCase().includes(q);
        const matchesPhone = o.customerPhone.replace(/[\s-]/g, '').includes(q.replace(/[\s-]/g, ''));
        return matchesNum || matchesCust || matchesPhone;
      }

      return true;
    });
  }, [orders, activeStatusTab, orderTypeFilter, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => o.orderStatus === 'pending').length;
    const confirmedOrders = orders.filter(
      (o) => o.orderStatus === 'confirmed' || o.orderStatus === 'packed'
    ).length;
    const deliveredOrders = orders.filter((o) => o.orderStatus === 'delivered').length;
    const totalRevenue = orders
      .filter((o) => o.orderStatus !== 'cancelled')
      .reduce((sum, o) => sum + o.total, 0);

    return {
      totalOrders,
      pendingOrders,
      confirmedOrders,
      deliveredOrders,
      totalRevenue,
    };
  }, [orders]);

  // Export CSV of Orders
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      notifyInfo('No orders to export');
      return;
    }

    const headers = [
      'Order Number',
      'Channel',
      'Date',
      'Customer',
      'Phone',
      'Subtotal',
      'Discount',
      'Delivery Fee',
      'Total',
      'Payment Method',
      'Payment Status',
      'Order Status',
    ];

    const rows = filteredOrders.map((o) => [
      `"${o.orderNumber}"`,
      `"${(o.orderType || 'retail').toUpperCase()}"`,
      `"${new Date(o.createdAt).toLocaleString('en-LK')}"`,
      `"${o.customerName}"`,
      `"${o.customerPhone}"`,
      o.subtotal,
      o.discount,
      o.deliveryFee,
      o.total,
      `"${o.paymentMethod}"`,
      `"${o.paymentStatus}"`,
      `"${o.orderStatus}"`,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `danix-orders-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notifySuccess('Orders exported to CSV');
  };

  // If in Create Mode, render the dedicated CreateOrderPage
  if (viewMode === 'create') {
    return (
      <CreateOrderPage
        onBack={() => setViewMode('list')}
        onOrderCreated={(created) => {
          setViewMode('list');
          setSelectedOrder(created);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-navy-900 tracking-tight">Orders Management</h1>
            <span className="rounded-full bg-navy-100 px-2.5 py-0.5 text-xs font-bold text-navy-800">
              {orders.length} Total Orders
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track multi-channel orders, fulfillment pipelines, and dispatch logistics
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={refresh}
            title="Refresh Orders"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setClearConfirmText('');
              setShowClearAllModal(true);
            }}
            title="Clear all test orders and invoices"
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/80 px-3.5 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors shadow-sm cursor-pointer"
          >
            <Trash2 className="h-4 w-4 text-rose-600" />
            <span>Clear Orders</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('create')}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-500/25 hover:bg-brand-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>+ Create Order</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Orders</span>
            <Package className="h-4 w-4 text-navy-700" />
          </div>
          <p className="mt-2 text-xl font-bold text-navy-900">{metrics.totalOrders}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">All time logged orders</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-700 uppercase">Pending Review</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-xl font-bold text-amber-700">{metrics.pendingOrders}</p>
          <p className="text-[10px] text-amber-600/80 mt-0.5">Awaiting customer confirmation</p>
        </div>

        <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-brand-700 uppercase">In Fulfillment</span>
            <Truck className="h-4 w-4 text-brand-600" />
          </div>
          <p className="mt-2 text-xl font-bold text-brand-700">{metrics.confirmedOrders}</p>
          <p className="text-[10px] text-brand-600/80 mt-0.5">Confirmed & packed for dispatch</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase">Total Revenue</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-lg font-bold text-navy-900 truncate">
            Rs. {metrics.totalRevenue.toLocaleString('en-LK')}
          </p>
          <p className="text-[10px] text-emerald-600 mt-0.5">
            {metrics.deliveredOrders} Delivered orders
          </p>
        </div>
      </div>

      {/* Status Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 pb-2">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.id === 'all'
              ? orders.length
              : orders.filter((o) => o.orderStatus === tab.id).length;

          const isActive = activeStatusTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveStatusTab(tab.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-navy-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Channel Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order # (e.g. ORD-2026), customer name, or phone number..."
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="shrink-0 w-full sm:w-auto">
          <select
            value={orderTypeFilter}
            onChange={(e) => setOrderTypeFilter(e.target.value as 'all' | 'retail' | 'wholesale')}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Channels (Retail & Wholesale)</option>
            <option value="retail">🛍️ Retail Orders</option>
            <option value="wholesale">📦 Wholesale Orders</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="text-xs text-slate-500 font-medium">Loading orders list...</p>
          </div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Package className="h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-navy-900">No orders found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {searchQuery || activeStatusTab !== 'all'
              ? 'Try adjusting your search criteria or switching status tabs.'
              : 'Create a new order to begin tracking fulfillment.'}
          </p>
          <button
            type="button"
            onClick={() => setViewMode('create')}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-brand-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create First Order</span>
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="py-3.5 pl-6 pr-3">Order # & Date</th>
                  <th className="px-3 py-3.5">Customer</th>
                  <th className="px-3 py-3.5">Items Summary</th>
                  <th className="px-3 py-3.5 text-right">Total (Rs.)</th>
                  <th className="px-3 py-3.5">Payment</th>
                  <th className="px-3 py-3.5">Order Status</th>
                  <th className="py-3.5 pl-3 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredOrders.map((o) => {
                  const totalItemsCount = o.items.reduce((s, i) => s + i.quantity, 0);

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Order Number & Date */}
                      <td className="py-3.5 pl-6 pr-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(o)}
                            className="font-mono font-bold text-brand-600 hover:text-brand-700 hover:underline block"
                          >
                            {o.orderNumber}
                          </button>
                          {o.orderType === 'wholesale' ? (
                            <span className="rounded bg-sky-100 text-sky-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border border-sky-200">
                              Wholesale
                            </span>
                          ) : (
                            <span className="rounded bg-slate-100 text-slate-600 px-1.5 py-0.5 text-[9px] font-medium uppercase">
                              Retail
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(o.createdAt).toLocaleDateString('en-LK', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </td>

                      {/* Customer Name & Phone */}
                      <td className="px-3 py-3.5">
                        <span className="font-bold text-navy-900 block">{o.customerName}</span>
                        <span className="font-mono text-[11px] text-slate-500 font-medium">
                          {o.customerPhone}
                        </span>
                      </td>

                      {/* Items */}
                      <td className="px-3 py-3.5 max-w-xs">
                        <span className="font-semibold text-slate-800">
                          {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}
                        </span>
                        <p className="text-[11px] text-slate-400 truncate">
                          {o.items.map((i) => i.productName).join(', ')}
                        </p>
                      </td>

                      {/* Total */}
                      <td className="px-3 py-3.5 text-right font-black text-navy-900 text-sm">
                        Rs. {o.total.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Payment */}
                      <td className="px-3 py-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            o.paymentStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {o.paymentStatus}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5 uppercase">
                          {o.paymentMethod.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Order Status */}
                      <td className="px-3 py-3.5">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            o.orderStatus === 'delivered'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : o.orderStatus === 'confirmed' || o.orderStatus === 'packed'
                              ? 'bg-brand-50 text-brand-700 border border-brand-200'
                              : o.orderStatus === 'shipped'
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : o.orderStatus === 'cancelled'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {o.orderStatus}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pl-3 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Order Detail */}
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(o)}
                            title="View Order Details"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-navy-900 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* Quick Invoice Trigger */}
                          <button
                            type="button"
                            onClick={() => {
                              if (onNavigateToInvoice) onNavigateToInvoice(o);
                              else {
                                setSelectedOrder(o);
                                notifyInfo(`Opening invoice view for order #${o.orderNumber}`);
                              }
                            }}
                            title="Generate / View Invoice"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                          >
                            <FileCheck className="h-3.5 w-3.5" />
                          </button>

                          {/* Quick Dispatch Trigger */}
                          <button
                            type="button"
                            onClick={() => {
                              if (onNavigateToDelivery) onNavigateToDelivery(o);
                              else {
                                setSelectedOrder(o);
                                notifyInfo(`Dispatching delivery for order #${o.orderNumber}`);
                              }
                            }}
                            title="Dispatch Delivery"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-navy-50 hover:text-navy-900 transition-colors"
                          >
                            <Truck className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete Order Action */}
                          <button
                            type="button"
                            onClick={() => setOrderToDelete(o)}
                            title="Delete Order"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={async (orderId, newStatus) => {
            await updateOrderStatus(orderId, newStatus, {
              uid: userProfile?.uid || 'user',
              name: userProfile?.name || 'Danix User',
            });
            await refresh();
          }}
          onDeleteOrder={async (orderId) => {
            await deleteOrder(orderId, {
              uid: userProfile?.uid || 'user',
              name: userProfile?.name || 'Danix User',
            });
            setSelectedOrder(null);
            await refresh();
          }}
          onGenerateInvoice={onNavigateToInvoice}
          onDispatchDelivery={onNavigateToDelivery}
        />
      )}

      {/* Delete Single Order Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-3">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-navy-900">
              Delete Order #{orderToDelete.orderNumber}?
            </h3>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Are you sure you want to permanently delete order <strong>#{orderToDelete.orderNumber}</strong> for {orderToDelete.customerName}?
              This will remove the order and its linked invoices from local storage and cloud database.
              This action cannot be undone.
            </p>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                disabled={isDeletingOrder}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsDeletingOrder(true);
                  try {
                    await deleteOrder(orderToDelete.id, {
                      uid: userProfile?.uid || 'user',
                      name: userProfile?.name || 'Danix User',
                    });
                    notifySuccess(`Order #${orderToDelete.orderNumber} deleted successfully.`);
                    setOrderToDelete(null);
                    await refresh();
                  } catch (err) {
                    notifyError((err as Error).message || 'Failed to delete order');
                  } finally {
                    setIsDeletingOrder(false);
                  }
                }}
                disabled={isDeletingOrder}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-md shadow-rose-600/30 disabled:opacity-50"
              >
                {isDeletingOrder ? 'Deleting...' : 'Yes, Delete Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Orders Confirmation Modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-3">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-rose-950">
              Clear All Orders & Invoices?
            </h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              This will permanently wipe all <strong>{orders.length}</strong> logged orders, linked invoices, and deliveries from local storage and cloud database to reset test transactions.
            </p>
            <div className="mt-4 text-left">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Type <span className="font-mono font-bold text-rose-600">CLEAR</span> to confirm:
              </label>
              <input
                type="text"
                value={clearConfirmText}
                onChange={(e) => setClearConfirmText(e.target.value)}
                placeholder="CLEAR"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-mono uppercase tracking-widest text-slate-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowClearAllModal(false);
                  setClearConfirmText('');
                }}
                disabled={isClearingAll}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (clearConfirmText.trim().toUpperCase() !== 'CLEAR') {
                    notifyError('Please type CLEAR in capital letters to confirm.');
                    return;
                  }
                  setIsClearingAll(true);
                  try {
                    await clearAllOrders({
                      uid: userProfile?.uid || 'user',
                      name: userProfile?.name || 'Danix Admin',
                    });
                    notifySuccess('All test orders and invoices cleared successfully.');
                    setShowClearAllModal(false);
                    setClearConfirmText('');
                    await refresh();
                  } catch (err) {
                    notifyError((err as Error).message || 'Failed to clear orders');
                  } finally {
                    setIsClearingAll(false);
                  }
                }}
                disabled={clearConfirmText.trim().toUpperCase() !== 'CLEAR' || isClearingAll}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-md shadow-rose-600/30 disabled:opacity-40"
              >
                {isClearingAll ? 'Clearing...' : 'Wipe All Orders'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
