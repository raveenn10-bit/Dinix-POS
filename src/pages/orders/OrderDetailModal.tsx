import React, { useState } from 'react';
import {
  X,
  Package,
  Calendar,
  User,
  Phone,
  MapPin,
  FileText,
  Printer,
  FileCheck,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  CreditCard,
  Banknote,
  DollarSign,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Order, OrderStatus, PaymentStatus } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { generateNextInvoiceNumber } from '@/lib/firebase/firestore';

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onGenerateInvoice?: (order: Order) => void;
  onDispatchDelivery?: (order: Order) => void;
}

const ORDER_STATUS_STEPS: OrderStatus[] = [
  'pending',
  'confirmed',
  'packed',
  'shipped',
  'delivered',
];

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  onClose,
  onUpdateStatus,
  onGenerateInvoice,
  onDispatchDelivery,
}) => {
  const { userProfile } = useAuth();
  const { notifySuccess, notifyError, notifyInfo } = useNotification();

  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(order.orderStatus);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [showCancelPrompt, setShowCancelPrompt] = useState<boolean>(false);

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (newStatus === order.orderStatus) return;

    if (newStatus === 'cancelled') {
      setShowCancelPrompt(true);
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdateStatus(order.id, newStatus);
      setSelectedStatus(newStatus);
      notifySuccess(`Order #${order.orderNumber} updated to ${newStatus.toUpperCase()}`);
    } catch (err) {
      notifyError((err as Error).message || 'Failed to update order status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmCancel = async () => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(order.id, 'cancelled');
      setSelectedStatus('cancelled');
      setShowCancelPrompt(false);
      notifySuccess(`Order #${order.orderNumber} cancelled. Inventory stock has been restored!`);
    } catch (err) {
      notifyError((err as Error).message || 'Failed to cancel order');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrintSlip = () => {
    const printWindow = window.open('', '_blank', 'width=700,height=800');
    if (!printWindow) {
      notifyError('Popup blocked! Please allow popups to print order invoice.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order Receipt - ${order.orderNumber}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              padding: 24px;
              color: #0b2545;
              max-width: 600px;
              margin: 0 auto;
            }
            .header { text-align: center; border-bottom: 2px dashed #ccc; padding-bottom: 16px; margin-bottom: 16px; }
            .brand { font-size: 20px; font-weight: 800; color: #f36f21; }
            .sub { font-size: 11px; color: #666; }
            .info-grid { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
            th { text-align: left; border-bottom: 1px solid #0b2545; padding: 6px 4px; }
            td { padding: 6px 4px; border-bottom: 1px solid #eee; }
            .text-right { text-align: right; }
            .totals { width: 100%; font-size: 12px; margin-top: 8px; }
            .totals td { padding: 3px 0; border: none; }
            .grand-total { font-size: 15px; font-weight: 800; border-top: 2px solid #0b2545 !important; padding-top: 6px !important; }
            .footer { text-align: center; font-size: 11px; color: #888; margin-top: 24px; border-top: 1px dashed #ccc; padding-top: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">DANIX ONLINE SHOPPING & POS</div>
            <div class="sub">Trusted Online Shopping Management System • Sri Lanka</div>
            <div class="sub">Hotline: +94 77 123 4567 | info@danix.lk</div>
          </div>

          <div class="info-grid">
            <div>
              <strong>ORDER #:</strong> ${order.orderNumber}<br>
              <strong>Date:</strong> ${new Date(order.createdAt).toLocaleString('en-LK')}<br>
              <strong>Status:</strong> ${order.orderStatus.toUpperCase()}<br>
              <strong>Payment:</strong> ${order.paymentStatus.toUpperCase()} (${order.paymentMethod})
            </div>
            <div style="text-align: right;">
              <strong>CUSTOMER:</strong><br>
              ${order.customerName}<br>
              ${order.customerPhone}<br>
              ${order.customerAddress || 'Colombo, Sri Lanka'}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>SKU</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items
                .map(
                  (item) => `
                <tr>
                  <td>${item.productName}</td>
                  <td>${item.sku}</td>
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">Rs. ${item.unitPrice.toFixed(2)}</td>
                  <td class="text-right">Rs. ${item.lineTotal.toFixed(2)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <table class="totals">
            <tr>
              <td class="text-right">Subtotal:</td>
              <td class="text-right" style="width: 120px;">Rs. ${order.subtotal.toFixed(2)}</td>
            </tr>
            ${
              order.discount > 0
                ? `<tr><td class="text-right">Discount:</td><td class="text-right">- Rs. ${order.discount.toFixed(2)}</td></tr>`
                : ''
            }
            <tr>
              <td class="text-right">Delivery Fee:</td>
              <td class="text-right">Rs. ${order.deliveryFee.toFixed(2)}</td>
            </tr>
            <tr class="grand-total">
              <td class="text-right"><strong>GRAND TOTAL:</strong></td>
              <td class="text-right"><strong>Rs. ${order.total.toFixed(2)}</strong></td>
            </tr>
          </table>

          ${
            order.notes
              ? `<p style="font-size: 11px; margin-top: 12px; background: #f9f9f9; padding: 8px;"><strong>Delivery Notes:</strong> ${order.notes}</p>`
              : ''
          }

          <div class="footer">
            Thank you for shopping with DANIX! Questions? Call +94 77 123 4567<br>
            Goods once sold can be returned within 7 days in original condition.
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusStepIndex = (status: OrderStatus): number => {
    return ORDER_STATUS_STEPS.indexOf(status);
  };

  const currentStepIdx = getStatusStepIndex(order.orderStatus);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative my-6 w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-navy-900 px-6 py-4 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 font-extrabold text-white shadow-md">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">{order.orderNumber}</h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    order.orderStatus === 'delivered'
                      ? 'bg-emerald-500 text-white'
                      : order.orderStatus === 'cancelled'
                      ? 'bg-rose-500 text-white'
                      : 'bg-brand-500 text-white'
                  }`}
                >
                  {order.orderStatus}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Created on{' '}
                {new Date(order.createdAt).toLocaleString('en-LK', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintSlip}
              className="inline-flex items-center gap-1.5 rounded-xl bg-navy-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-navy-700 transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-300 hover:bg-navy-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Order Status Visual Pipeline Tracker */}
          {order.orderStatus !== 'cancelled' && order.orderStatus !== 'returned' ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-3">
                Fulfillment Pipeline Tracker
              </span>

              <div className="relative flex items-center justify-between">
                {/* Horizontal progress background line */}
                <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-200 -z-0" />
                <div
                  className="absolute left-6 top-1/2 -translate-y-1/2 h-1 bg-brand-500 transition-all duration-300 -z-0"
                  style={{
                    width: `${(Math.max(0, currentStepIdx) / (ORDER_STATUS_STEPS.length - 1)) * 90}%`,
                  }}
                />

                {ORDER_STATUS_STEPS.map((step, idx) => {
                  const isDone = idx <= currentStepIdx;
                  const isCurrent = idx === currentStepIdx;

                  return (
                    <button
                      key={step}
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleStatusChange(step)}
                      className="group relative z-10 flex flex-col items-center focus:outline-none"
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all shadow-sm ${
                          isCurrent
                            ? 'bg-brand-500 text-white ring-4 ring-brand-100 scale-110'
                            : isDone
                            ? 'bg-navy-900 text-white'
                            : 'bg-white text-slate-400 border border-slate-300 hover:border-brand-400'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <span>{idx + 1}</span>
                        )}
                      </div>
                      <span
                        className={`mt-1.5 text-[11px] font-semibold capitalize ${
                          isCurrent
                            ? 'text-brand-600 font-bold'
                            : isDone
                            ? 'text-navy-900'
                            : 'text-slate-400'
                        }`}
                      >
                        {step}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-xs font-semibold text-rose-800 border border-rose-200">
              <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
              <span>
                This order has been marked as <strong>{order.orderStatus.toUpperCase()}</strong>.
                All inventory quantities have been automatically credited back to available stock.
              </span>
            </div>
          )}

          {/* Customer & Delivery Snapshot Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Details */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-2 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Customer Information
              </span>
              <div className="flex items-center gap-2 text-navy-900 font-bold text-sm">
                <User className="h-4 w-4 text-brand-500" />
                <span>{order.customerName}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="h-4 w-4 text-slate-400" />
                <span className="font-mono font-semibold">{order.customerPhone}</span>
              </div>
              {order.customerAddress && (
                <div className="flex items-start gap-2 text-slate-600">
                  <MapPin className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <span className="leading-snug">{order.customerAddress}</span>
                </div>
              )}
            </div>

            {/* Payment & Delivery Status */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-2 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Payment & Fulfillment
              </span>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-bold uppercase text-navy-900">
                  {order.paymentMethod.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Payment Status:</span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    order.paymentStatus === 'paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {order.paymentStatus}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Delivery Status:</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {order.deliveryStatus.replace('_', ' ')}
                </span>
              </div>
              {order.notes && (
                <div className="pt-1 text-[11px] text-slate-500 border-t border-slate-100">
                  <strong>Notes:</strong> {order.notes}
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
              Ordered Items ({order.items.length})
            </h4>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 pl-4 pr-2">Item</th>
                    <th className="px-2 py-3">SKU</th>
                    <th className="px-2 py-3 text-right">Unit Price</th>
                    <th className="px-2 py-3 text-center">Qty</th>
                    <th className="px-2 py-3 text-right">Discount</th>
                    <th className="py-3 pl-2 pr-4 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {order.items.map((item, index) => (
                    <tr key={`${item.productId}-${index}`} className="hover:bg-slate-50/50">
                      <td className="py-2.5 pl-4 pr-2">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.productName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          <span className="font-bold text-navy-900">{item.productName}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 font-mono text-slate-500">{item.sku}</td>
                      <td className="px-2 py-2.5 text-right font-medium">
                        Rs. {item.unitPrice.toFixed(2)}
                      </td>
                      <td className="px-2 py-2.5 text-center font-bold text-navy-900">
                        {item.quantity}
                      </td>
                      <td className="px-2 py-2.5 text-right text-rose-600">
                        {item.discount > 0 ? `- Rs. ${item.discount.toFixed(2)}` : 'Rs. 0.00'}
                      </td>
                      <td className="py-2.5 pl-2 pr-4 text-right font-bold text-navy-900">
                        Rs. {item.lineTotal.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Order Totals Box */}
              <div className="border-t border-slate-200 bg-slate-50/60 p-4">
                <div className="max-w-xs ml-auto space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-900">
                      Rs. {order.subtotal.toFixed(2)}
                    </span>
                  </div>

                  {order.discount > 0 && (
                    <div className="flex justify-between text-rose-600 font-semibold">
                      <span>Order Discount:</span>
                      <span>- Rs. {order.discount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Fee:</span>
                    <span className="font-semibold text-slate-900">
                      Rs. {order.deliveryFee.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm font-black text-navy-900 border-t border-slate-300 pt-2">
                    <span>Grand Total:</span>
                    <span className="text-brand-600">
                      Rs. {order.total.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              {order.orderStatus !== 'cancelled' && (
                <button
                  type="button"
                  onClick={() => setShowCancelPrompt(true)}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                >
                  Cancel Order & Restore Stock
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {onGenerateInvoice && (
                <button
                  type="button"
                  onClick={() => {
                    onGenerateInvoice(order);
                    notifySuccess(`Invoice generated for order #${order.orderNumber}`);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-navy-700 bg-navy-900 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-800 transition-colors shadow-sm"
                >
                  <FileCheck className="h-4 w-4 text-brand-400" />
                  <span>Generate Invoice</span>
                </button>
              )}

              {onDispatchDelivery && (
                <button
                  type="button"
                  onClick={() => {
                    onDispatchDelivery(order);
                    notifySuccess(`Delivery dispatch initiated for order #${order.orderNumber}`);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-brand-500/25 hover:bg-brand-600 transition-colors"
                >
                  <Truck className="h-4 w-4" />
                  <span>Dispatch / Delivery</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Cancel Order Confirmation Modal */}
        {showCancelPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-3">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-navy-900">Confirm Order Cancellation</h3>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                Cancelling order <strong>#{order.orderNumber}</strong> will automatically restore
                all {order.items.reduce((s, i) => s + i.quantity, 0)} reserved units back to inventory
                as a stock adjustment ledger entry.
              </p>

              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowCancelPrompt(false)}
                  disabled={isUpdating}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={isUpdating}
                  className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-md shadow-rose-600/30"
                >
                  {isUpdating ? 'Restoring...' : 'Yes, Cancel Order'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
