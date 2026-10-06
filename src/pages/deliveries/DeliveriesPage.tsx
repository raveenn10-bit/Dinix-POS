import React, { useState, useMemo } from 'react';
import {
  Truck,
  Search,
  Plus,
  Printer,
  Edit2,
  CheckCircle2,
  Clock,
  Send,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  MapPin,
  Phone,
  DollarSign,
  X,
  Eye,
} from 'lucide-react';
import { useDeliveries } from '@/lib/dataStore';
import { Delivery, DeliveryStatus } from '@/types';
import { DeliveryModal } from './DeliveryModal';
import { DeliveryLabelModal } from './DeliveryLabelModal';
import { useNotification } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';

const STATUS_TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'ready', label: 'Ready' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'failed', label: 'Failed' },
  { key: 'returned', label: 'Returned' },
];

const COURIER_OPTIONS = [
  'All Couriers',
  'Domex',
  'Koombiyo',
  'Prompt Xpress',
  'Fardar',
  'Certis Lanka',
  'In-House',
];

export const DeliveriesPage: React.FC = () => {
  const { deliveries, loading, refresh, saveDelivery, updateDeliveryStatus } = useDeliveries();
  const { userProfile } = useAuth();
  const { notifySuccess, notifyInfo } = useNotification();

  // Search & Filters state
  const [activeTab, setActiveTab] = useState<string>('all');
  const [courierFilter, setCourierFilter] = useState<string>('All Couriers');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Selection state for batch label printing
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals state
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState<boolean>(false);
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);

  const [isLabelModalOpen, setIsLabelModalOpen] = useState<boolean>(false);
  const [labelModalDeliveries, setLabelModalDeliveries] = useState<Delivery[]>([]);
  const [labelInitialIndex, setLabelInitialIndex] = useState<number>(0);

  // Status counts for tabs
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: deliveries.length };
    deliveries.forEach((d) => {
      counts[d.status] = (counts[d.status] || 0) + 1;
    });
    return counts;
  }, [deliveries]);

  // KPI Statistics
  const stats = useMemo(() => {
    let pendingCodTotal = 0;
    let deliveredCount = 0;
    let inTransitCount = 0;
    let dispatchedCount = 0;

    deliveries.forEach((d) => {
      if (d.status === 'delivered') deliveredCount++;
      if (d.status === 'in_transit') inTransitCount++;
      if (d.status === 'dispatched') dispatchedCount++;

      // Pending COD is uncollected COD amount on orders not yet delivered
      if (d.status !== 'delivered' && d.status !== 'returned' && d.codAmount && d.codAmount > 0) {
        pendingCodTotal += d.codAmount;
      }
    });

    return {
      total: deliveries.length,
      deliveredCount,
      activeShipments: inTransitCount + dispatchedCount,
      pendingCodTotal,
    };
  }, [deliveries]);

  // Filtered deliveries list
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      // 1. Tab Status Filter
      if (activeTab !== 'all' && d.status !== activeTab) {
        return false;
      }

      // 2. Courier Filter
      if (courierFilter !== 'All Couriers' && d.courier.toLowerCase() !== courierFilter.toLowerCase()) {
        return false;
      }

      // 3. Search query (Tracking #, Customer Name, Phone, Order Number, City)
      const term = searchTerm.toLowerCase().trim();
      if (term) {
        const matchesTracking = (d.trackingNumber || '').toLowerCase().includes(term);
        const matchesCustomer = d.customerName.toLowerCase().includes(term);
        const matchesPhone = d.phone.includes(term);
        const matchesOrder = (d.orderNumber || d.orderId || '').toLowerCase().includes(term);
        const matchesCity = (d.city || '').toLowerCase().includes(term);
        if (!matchesTracking && !matchesCustomer && !matchesPhone && !matchesOrder && !matchesCity) {
          return false;
        }
      }

      return true;
    });
  }, [deliveries, activeTab, courierFilter, searchTerm]);

  // Select all or toggle
  const isAllSelected =
    filteredDeliveries.length > 0 &&
    filteredDeliveries.every((d) => selectedIds.includes(d.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDeliveries.map((d) => d.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Open Label Print Modal for single item
  const handlePrintSingleLabel = (deliveryItem: Delivery) => {
    setLabelModalDeliveries([deliveryItem]);
    setLabelInitialIndex(0);
    setIsLabelModalOpen(true);
  };

  // Open Label Print Modal for batch selected items
  const handlePrintBatchLabels = () => {
    const selectedItems = deliveries.filter((d) => selectedIds.includes(d.id));
    if (selectedItems.length === 0) return;
    setLabelModalDeliveries(selectedItems);
    setLabelInitialIndex(0);
    setIsLabelModalOpen(true);
  };

  // Quick Status Transition
  const handleQuickStatusChange = async (
    deliveryItem: Delivery,
    newStatus: DeliveryStatus
  ) => {
    try {
      await updateDeliveryStatus(deliveryItem.id, newStatus, {
        uid: userProfile?.uid || 'staff',
        name: userProfile?.name || 'Danix Staff',
      });
      notifySuccess(
        `Updated Order #${deliveryItem.orderNumber || deliveryItem.id} status to ${newStatus.replace('_', ' ').toUpperCase()}`,
        'Status Updated'
      );
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
            <Clock className="h-3 w-3" />
            Ready
          </span>
        );
      case 'dispatched':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
            <Send className="h-3 w-3" />
            Dispatched
          </span>
        );
      case 'in_transit':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
            <Truck className="h-3 w-3" />
            In Transit
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" />
            Delivered
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
            <AlertTriangle className="h-3 w-3" />
            Failed
          </span>
        );
      case 'returned':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200">
            <RotateCcw className="h-3 w-3" />
            Returned
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl flex items-center gap-2.5">
            <Truck className="h-7 w-7 text-brand-500" />
            Deliveries & Courier Dispatch
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track multi-courier shipments, manage COD collections, and print thermal shipping labels.
          </p>
        </div>

        {/* Top Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh button */}
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Batch Print Button if selected */}
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handlePrintBatchLabels}
              className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-navy-800 transition-colors animate-in fade-in"
            >
              <Printer className="h-4 w-4 text-brand-400" />
              <span>Print Selected Labels ({selectedIds.length})</span>
            </button>
          )}

          {/* Add New Delivery */}
          <button
            type="button"
            onClick={() => {
              setEditingDelivery(null);
              setIsDeliveryModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-brand-500/20 hover:bg-brand-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Delivery</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Shipments */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Shipments
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-50 text-navy-900">
              <Truck className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-navy-900 font-mono">
            {stats.total} Parcels
          </p>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Domex, Koombiyo, Prompt Xpress, Fardar
          </p>
        </div>

        {/* Out / In Transit */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Active In Transit
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Send className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-amber-600 font-mono">
            {stats.activeShipments} Shipments
          </p>
          <p className="mt-1 text-xs text-amber-700 font-medium">
            Dispatched & moving through hubs
          </p>
        </div>

        {/* Delivered Success */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Completed Deliveries
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-600 font-mono">
            {stats.deliveredCount} Delivered
          </p>
          <p className="mt-1 text-xs text-emerald-700 font-medium">
            Successfully handed over to buyers
          </p>
        </div>

        {/* Pending COD Collection */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Pending COD to Collect
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-brand-600 font-mono">
            Rs. {stats.pendingCodTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-brand-700 font-medium">
            In courier rider custody
          </p>
        </div>
      </div>

      {/* Status Tabs Navigation */}
      <div className="border-b border-slate-200 bg-white rounded-2xl shadow-sm p-1.5 flex flex-wrap gap-1">
        {STATUS_TABS.map((tab) => {
          const count = statusCounts[tab.key] || 0;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                isActive
                  ? 'bg-navy-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600 font-bold'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
          {/* Search Input */}
          <div className="relative sm:col-span-2 lg:col-span-6">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Tracking #, Customer, Phone, City, or Order #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Courier Partner Filter */}
          <div className="lg:col-span-4">
            <select
              value={courierFilter}
              onChange={(e) => setCourierFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {COURIER_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {(searchTerm || courierFilter !== 'All Couriers' || activeTab !== 'all') && (
            <div className="flex items-center lg:col-span-2">
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCourierFilter('All Couriers');
                  setActiveTab('all');
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Deliveries Table Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
              <p className="text-xs text-slate-500">Loading Deliveries...</p>
            </div>
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
              <Truck className="h-7 w-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Shipments Found</h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              No delivery records match the current status or search filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                      aria-label="Select all deliveries"
                    />
                  </th>
                  <th className="py-3.5 px-4">Order #</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Destination City / Address</th>
                  <th className="py-3.5 px-4">Courier</th>
                  <th className="py-3.5 px-4">Tracking #</th>
                  <th className="py-3.5 px-4 text-right">Fee (Rs.)</th>
                  <th className="py-3.5 px-4 text-right">COD Amount</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDeliveries.map((d) => {
                  const isSelected = selectedIds.includes(d.id);
                  const isCod = Boolean(d.codAmount && d.codAmount > 0);

                  return (
                    <tr
                      key={d.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-brand-50/40' : ''
                      }`}
                    >
                      {/* Checkbox for batch printing */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(d.id)}
                          className="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                          aria-label={`Select delivery for ${d.customerName}`}
                        />
                      </td>

                      {/* Order Number */}
                      <td className="py-3 px-4 font-mono font-bold text-navy-900">
                        {d.orderNumber || d.orderId}
                      </td>

                      {/* Customer Name & Phone */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{d.customerName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{d.phone}</div>
                      </td>

                      {/* Destination City & Address */}
                      <td className="py-3 px-4 max-w-[220px]">
                        <div className="font-semibold text-slate-800 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-brand-500 shrink-0" />
                          <span className="truncate">{d.city || 'Standard City'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate" title={d.address}>
                          {d.address}
                        </div>
                      </td>

                      {/* Courier Partner */}
                      <td className="py-3 px-4">
                        <span className="inline-block rounded-lg bg-navy-900/10 text-navy-900 font-bold px-2 py-0.5 text-[11px] uppercase tracking-wide">
                          {d.courier}
                        </span>
                      </td>

                      {/* Tracking Number */}
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {d.trackingNumber ? (
                          <span className="bg-slate-100 px-2 py-0.5 rounded font-semibold text-xs text-slate-800">
                            {d.trackingNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Delivery Fee */}
                      <td className="py-3 px-4 text-right font-mono text-slate-700 font-medium">
                        {d.deliveryFee > 0 ? d.deliveryFee.toLocaleString() : 'FREE'}
                      </td>

                      {/* COD Amount */}
                      <td className="py-3 px-4 text-right">
                        {isCod ? (
                          <div className="font-mono font-bold text-navy-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded inline-block text-right">
                            Rs. {d.codAmount?.toLocaleString()}
                          </div>
                        ) : (
                          <span className="inline-block rounded bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                            PREPAID
                          </span>
                        )}
                      </td>

                      {/* Status badge with quick inline selector */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {getStatusBadge(d.status)}
                          <select
                            value={d.status}
                            onChange={(e) =>
                              handleQuickStatusChange(d, e.target.value as DeliveryStatus)
                            }
                            className="rounded border border-slate-200 bg-white text-[11px] py-0.5 px-1 text-slate-700 focus:outline-none focus:border-brand-500"
                            title="Update Status"
                          >
                            <option value="pending">Pending</option>
                            <option value="ready">Ready</option>
                            <option value="dispatched">Dispatched</option>
                            <option value="in_transit">In Transit</option>
                            <option value="delivered">Delivered</option>
                            <option value="failed">Failed</option>
                            <option value="returned">Returned</option>
                          </select>
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Print Label Button */}
                          <button
                            type="button"
                            onClick={() => handlePrintSingleLabel(d)}
                            className="inline-flex items-center gap-1 rounded-lg bg-navy-900 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-navy-800 transition-colors"
                            title="Print Courier Shipping Label"
                          >
                            <Printer className="h-3 w-3 text-brand-400" />
                            <span>Label</span>
                          </button>

                          {/* Edit Details */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDelivery(d);
                              setIsDeliveryModalOpen(true);
                            }}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            title="Edit / View Details"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit / Create Delivery Modal */}
      {isDeliveryModalOpen && (
        <DeliveryModal
          delivery={editingDelivery}
          isOpen={isDeliveryModalOpen}
          onClose={() => {
            setIsDeliveryModalOpen(false);
            setEditingDelivery(null);
          }}
          onSave={async (deliveryData) => {
            await saveDelivery(
              {
                ...(editingDelivery || {}),
                ...deliveryData,
              } as Delivery,
              {
                uid: userProfile?.uid || 'staff',
                name: userProfile?.name || 'Danix Staff',
              }
            );
          }}
        />
      )}

      {/* Printable Label Preview Modal */}
      {isLabelModalOpen && (
        <DeliveryLabelModal
          deliveries={labelModalDeliveries}
          isOpen={isLabelModalOpen}
          initialIndex={labelInitialIndex}
          onClose={() => {
            setIsLabelModalOpen(false);
            setLabelModalDeliveries([]);
          }}
        />
      )}
    </div>
  );
};
