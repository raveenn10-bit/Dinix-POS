import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  Calendar,
  Printer,
  Download,
  CreditCard,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Plus,
  ArrowUpRight,
  ChevronDown,
  X,
  ExternalLink,
} from 'lucide-react';
import { useInvoices } from '@/lib/dataStore';
import { Invoice, PaymentStatus, PaymentMethod } from '@/types';
import { InvoiceViewModal } from './InvoiceViewModal';
import { useNotification } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';

export const InvoicesPage: React.FC = () => {
  const { invoices, loading, recordPayment, saveInvoice } = useInvoices();
  const { userProfile } = useAuth();
  const { notifySuccess, notifyError } = useNotification();

  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [customDate, setCustomDate] = useState<string>('');

  // Modals state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false);

  // Quick stats calculations
  const stats = useMemo(() => {
    let totalInvoiced = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    let partialCount = 0;

    invoices.forEach((inv) => {
      totalInvoiced += inv.total;
      const paid = inv.paidAmount || (inv.paymentStatus === 'paid' ? inv.total : 0);
      totalCollected += paid;
      totalOutstanding += Math.max(0, inv.total - paid);

      if (inv.paymentStatus === 'paid') paidCount++;
      else if (inv.paymentStatus === 'unpaid') unpaidCount++;
      else if (inv.paymentStatus === 'partial') partialCount++;
    });

    return {
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      totalCount: invoices.length,
      paidCount,
      unpaidCount,
      partialCount,
    };
  }, [invoices]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // 1. Search term match (Invoice #, Order #, Customer Name, Phone)
      const term = searchTerm.toLowerCase().trim();
      if (term) {
        const matchesInvoiceNum = inv.invoiceNumber.toLowerCase().includes(term);
        const matchesOrderNum = (inv.orderNumber || inv.orderId || '').toLowerCase().includes(term);
        const matchesCustomer = inv.customerSnapshot.name.toLowerCase().includes(term);
        const matchesPhone = inv.customerSnapshot.phone.toLowerCase().includes(term);
        if (!matchesInvoiceNum && !matchesOrderNum && !matchesCustomer && !matchesPhone) {
          return false;
        }
      }

      // 2. Status filter
      if (statusFilter !== 'all' && inv.paymentStatus !== statusFilter) {
        return false;
      }

      // 3. Invoice Format / Type filter (Retail vs Wholesale)
      if (typeFilter !== 'all') {
        const invType = inv.invoiceType || 'retail';
        if (invType !== typeFilter) return false;
      }

      // 4. Date filter
      const now = Date.now();
      const invDate = new Date(inv.createdAt);
      if (dateFilter === 'today') {
        const todayStart = new Date().setHours(0, 0, 0, 0);
        if (invDate.getTime() < todayStart) return false;
      } else if (dateFilter === 'this_week') {
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
        if (invDate.getTime() < sevenDaysAgo) return false;
      } else if (dateFilter === 'this_month') {
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
        if (invDate.getTime() < thirtyDaysAgo) return false;
      } else if (dateFilter === 'custom' && customDate) {
        const invDateStr = invDate.toISOString().split('T')[0];
        if (invDateStr !== customDate) return false;
      }

      return true;
    });
  }, [invoices, searchTerm, statusFilter, typeFilter, dateFilter, customDate]);

  // Handle open Record Payment modal
  const handleOpenPaymentModal = (invoice: Invoice) => {
    const paid = invoice.paidAmount || (invoice.paymentStatus === 'paid' ? invoice.total : 0);
    const balance = Math.max(0, invoice.total - paid);
    setPaymentModalInvoice(invoice);
    setPaymentAmount(balance > 0 ? balance : invoice.total);
    setPaymentMethod(invoice.paymentMethod || 'cash');
    setPaymentNotes('');
  };

  // Submit recorded payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalInvoice || paymentAmount <= 0) return;

    try {
      setIsSubmittingPayment(true);
      await recordPayment(
        paymentModalInvoice.id,
        paymentAmount,
        paymentMethod,
        paymentNotes || undefined,
        {
          uid: userProfile?.uid || 'staff',
          name: userProfile?.name || 'Danix Staff',
        }
      );

      notifySuccess(
        `Recorded Rs. ${paymentAmount.toLocaleString()} for Invoice ${paymentModalInvoice.invoiceNumber}`,
        'Payment Recorded'
      );
      setPaymentModalInvoice(null);
    } catch (err) {
      notifyError('Failed to record payment. Please try again.', 'Error');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" />
            Paid
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3" />
            Partial
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
            <RotateCcw className="h-3 w-3" />
            Refunded
          </span>
        );
      case 'unpaid':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 border border-rose-200">
            <AlertCircle className="h-3 w-3" />
            Unpaid
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
            <FileText className="h-7 w-7 text-brand-500" />
            Invoices Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Generate, review, and print official A4 tax invoices and track receivables.
          </p>
        </div>

        {/* Header summary or quick export */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (invoices.length > 0) {
                setSelectedInvoice(invoices[0]);
                setIsViewModalOpen(true);
              }
            }}
            disabled={invoices.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            <span>Latest Invoice</span>
          </button>
        </div>
      </div>

      {/* KPI Cards - 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Total Invoiced */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Total Invoiced
            </span>
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-800">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <p className="mt-2 sm:mt-3 text-lg sm:text-2xl font-black text-navy-900 font-mono truncate">
            Rs. {stats.totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-[10px] sm:text-xs text-slate-500 font-medium truncate">
            {stats.totalCount} invoices
          </p>
        </div>

        {/* Collected / Paid */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Collected
            </span>
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <p className="mt-2 sm:mt-3 text-lg sm:text-2xl font-black text-emerald-600 font-mono truncate">
            Rs. {stats.totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[10px] sm:text-xs text-emerald-700 font-medium truncate">
            <span>{stats.paidCount} Settled</span>
          </div>
        </div>

        {/* Outstanding / Unpaid */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Outstanding
            </span>
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <p className="mt-2 sm:mt-3 text-lg sm:text-2xl font-black text-rose-600 font-mono truncate">
            Rs. {stats.totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-[10px] sm:text-xs text-rose-700 font-medium truncate">
            {stats.unpaidCount} due • {stats.partialCount} part
          </p>
        </div>

        {/* Collection Efficiency */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Collection Rate
            </span>
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <p className="mt-2 sm:mt-3 text-lg sm:text-2xl font-black text-brand-600 font-mono truncate">
            {stats.totalInvoiced > 0
              ? `${Math.round((stats.totalCollected / stats.totalInvoiced) * 100)}%`
              : '0%'}
          </p>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-brand-500 h-1.5 rounded-full"
              style={{
                width: `${
                  stats.totalInvoiced > 0
                    ? Math.min(100, (stats.totalCollected / stats.totalInvoiced) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Search & Filters Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
          {/* Search Input */}
          <div className="relative sm:col-span-2 lg:col-span-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Invoice #, Order #, or Customer Name..."
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

          {/* Invoice Type (Retail vs Wholesale) Filter */}
          <div className="lg:col-span-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-800 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors font-medium"
            >
              <option value="all">All Types (Retail & Wholesale)</option>
              <option value="retail">🏷️ Retail Invoices</option>
              <option value="wholesale">📦 Wholesale Invoices</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="lg:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-800 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors font-medium"
            >
              <option value="all">All Payment Statuses</option>
              <option value="paid">Paid in Full</option>
              <option value="unpaid">Unpaid / Due</option>
              <option value="partial">Partially Paid</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="lg:col-span-3">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-800 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors font-medium"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="this_week">Past 7 Days</option>
              <option value="this_month">Past 30 Days</option>
              <option value="custom">Custom Date</option>
            </select>
          </div>

          {/* Custom Date Input (if selected) */}
          {dateFilter === 'custom' && (
            <div className="lg:col-span-12">
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          )}

          {/* Clear Filters (if active) */}
          {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || dateFilter !== 'all') && (
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setDateFilter('all');
                  setCustomDate('');
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Invoices Table Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
              <p className="text-xs text-slate-500">Loading Invoices...</p>
            </div>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
              <FileText className="h-7 w-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Invoices Found</h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                ? 'Try adjusting your search criteria or resetting the applied filters.'
                : 'No invoices have been generated in the system yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Order Ref</th>
                  <th className="py-3.5 px-4 text-right">Total (Rs.)</th>
                  <th className="py-3.5 px-4 text-right">Paid (Rs.)</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => {
                  const paid = inv.paidAmount || (inv.paymentStatus === 'paid' ? inv.total : 0);
                  const balance = Math.max(0, inv.total - paid);

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Invoice Number */}
                      <td className="py-3 px-4 font-mono font-bold text-navy-900">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{inv.invoiceNumber}</span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                              inv.invoiceType === 'wholesale'
                                ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {inv.invoiceType === 'wholesale' ? 'Wholesale' : 'Retail'}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(inv.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Customer Info */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {inv.customerSnapshot.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {inv.customerSnapshot.phone}
                          {inv.customerSnapshot.city && ` • ${inv.customerSnapshot.city}`}
                        </div>
                      </td>

                      {/* Order Reference */}
                      <td className="py-3 px-4">
                        {inv.orderNumber ? (
                          <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {inv.orderNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Direct Sale</span>
                        )}
                      </td>

                      {/* Grand Total */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-navy-900">
                        {inv.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Paid Amount */}
                      <td className="py-3 px-4 text-right font-mono">
                        <span className="font-semibold text-emerald-700">
                          {paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        {balance > 0 && (
                          <div className="text-[10px] text-rose-600 font-medium">
                            Due: {balance.toLocaleString()}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(inv.paymentStatus)}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Record Payment Button */}
                          {inv.paymentStatus !== 'paid' && inv.paymentStatus !== 'refunded' && (
                            <button
                              type="button"
                              onClick={() => handleOpenPaymentModal(inv)}
                              className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                              title="Record Payment"
                            >
                              <CreditCard className="h-4 w-4" />
                            </button>
                          )}

                          {/* View & Print Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setIsViewModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-navy-900 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-navy-800 transition-colors"
                            title="View / Print Tax Invoice"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span>View / Print</span>
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

      {/* Invoice View Modal */}
      {selectedInvoice && (
        <InvoiceViewModal
          invoice={selectedInvoice}
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedInvoice(null);
          }}
          onRecordPayment={(inv) => {
            setIsViewModalOpen(false);
            handleOpenPaymentModal(inv);
          }}
        />
      )}

      {/* Record Payment Modal */}
      {paymentModalInvoice && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 backdrop-blur-sm p-4 animate-in fade-in"
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-navy-900">Record Payment</h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {paymentModalInvoice.invoiceNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalInvoice(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitPayment} className="p-5 space-y-4">
              {/* Invoice Summary */}
              <div className="rounded-xl bg-slate-50 p-3 text-xs border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-semibold text-slate-900">
                    {paymentModalInvoice.customerSnapshot.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice Total:</span>
                  <span className="font-mono font-bold text-slate-900">
                    Rs. {paymentModalInvoice.total.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Already Paid:</span>
                  <span className="font-mono text-emerald-700 font-semibold">
                    Rs.{' '}
                    {(
                      paymentModalInvoice.paidAmount ||
                      (paymentModalInvoice.paymentStatus === 'paid' ? paymentModalInvoice.total : 0)
                    ).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1 text-xs">
                  <span className="font-bold text-slate-800">Remaining Balance:</span>
                  <span className="font-mono font-bold text-rose-600">
                    Rs.{' '}
                    {Math.max(
                      0,
                      paymentModalInvoice.total -
                        (paymentModalInvoice.paidAmount ||
                          (paymentModalInvoice.paymentStatus === 'paid' ? paymentModalInvoice.total : 0))
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Amount to Record */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Amount (Rs.) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={paymentAmount || ''}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 py-2 text-sm font-mono font-bold text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Wire Transfer</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="cod">Cash on Delivery (COD)</option>
                </select>
              </div>

              {/* Payment Reference / Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notes / Reference Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Commercial Bank Slip #8912, or Cash collected by rider"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentModalInvoice(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment || paymentAmount <= 0}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isSubmittingPayment ? 'Saving...' : 'Confirm Payment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
