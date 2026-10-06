import React from 'react';
import {
  X,
  Phone,
  Mail,
  MapPin,
  FileText,
  ShoppingBag,
  ExternalLink,
  MessageSquare,
  Edit2,
  Calendar,
  CreditCard,
  CheckCircle2,
  Clock,
  Truck,
} from 'lucide-react';
import { Customer, Order } from '@/types';

interface CustomerDetailModalProps {
  customer: Customer;
  orders: Order[];
  onClose: () => void;
  onEdit: (customer: Customer) => void;
  onViewOrder?: (order: Order) => void;
  onCreateOrder?: (customer: Customer) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  orders,
  onClose,
  onEdit,
  onViewOrder,
  onCreateOrder,
}) => {
  // Filter orders for this customer (by ID or matching phone)
  const customerOrders = orders.filter(
    (o) =>
      o.customerId === customer.id ||
      o.customerPhone.replace(/[\s-]/g, '') === customer.phone.replace(/[\s-]/g, '')
  );

  const totalSpent = customerOrders.reduce((sum, o) => sum + o.total, customer.totalSpent || 0);
  const totalOrdersCount = customerOrders.length || customer.totalOrders || 0;
  const avgOrderValue = totalOrdersCount > 0 ? totalSpent / totalOrdersCount : 0;

  // Clean phone for WhatsApp Link (+94...)
  const rawPhone = customer.phone.replace(/[^0-9]/g, '');
  const waNumber = rawPhone.startsWith('94')
    ? rawPhone
    : rawPhone.startsWith('0')
    ? `94${rawPhone.substring(1)}`
    : `94${rawPhone}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative my-6 w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-navy-900 px-6 py-5 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 font-extrabold text-white text-lg shadow-md">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">{customer.name}</h3>
                <span className="rounded-full bg-brand-500/20 px-2.5 py-0.5 text-[10px] font-bold text-brand-300 border border-brand-500/30">
                  Customer Profile
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Registered on{' '}
                {new Date(customer.createdAt).toLocaleDateString('en-LK', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(customer)}
              className="inline-flex items-center gap-1 rounded-xl bg-navy-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-navy-700 transition-colors"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span>Edit</span>
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
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Total Lifetime Spent
              </span>
              <p className="mt-1 text-xl font-black text-navy-900">
                Rs. {totalSpent.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Orders Completed
              </span>
              <p className="mt-1 text-xl font-black text-brand-600">
                {totalOrdersCount} Orders
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Average Order Value
              </span>
              <p className="mt-1 text-xl font-black text-emerald-600">
                Rs. {avgOrderValue.toLocaleString('en-LK', { minimumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          {/* Contact & Address Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
              Contact & Delivery Information
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="h-4 w-4 text-brand-500 shrink-0" />
                <span className="font-semibold">{customer.phone}</span>
                <a
                  href={`https://wa.me/${waNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"
                >
                  <MessageSquare className="h-3 w-3" />
                  WhatsApp
                </a>
              </div>

              {customer.email && (
                <div className="flex items-center gap-2 text-slate-700">
                  <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{customer.email}</span>
                </div>
              )}

              {customer.address && (
                <div className="flex items-start gap-2 text-slate-700 md:col-span-2">
                  <MapPin className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{customer.address}</span>
                </div>
              )}

              {customer.notes && (
                <div className="flex items-start gap-2 text-slate-700 md:col-span-2 bg-amber-50/70 p-3 rounded-xl border border-amber-200/60">
                  <FileText className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-amber-800 uppercase block">
                      Customer Delivery Remarks:
                    </span>
                    <span className="text-xs text-amber-900">{customer.notes}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Purchase History Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="h-4 w-4 text-brand-500" />
                Purchase & Order History ({customerOrders.length})
              </h4>

              {onCreateOrder && (
                <button
                  type="button"
                  onClick={() => {
                    onCreateOrder(customer);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-600 transition-colors shadow-sm"
                >
                  + New Order
                </button>
              )}
            </div>

            {customerOrders.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-400">
                No orders recorded yet for this customer profile.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 pl-4 pr-2">Order #</th>
                      <th className="px-2 py-2.5">Date</th>
                      <th className="px-2 py-2.5">Items</th>
                      <th className="px-2 py-2.5">Status</th>
                      <th className="px-2 py-2.5">Payment</th>
                      <th className="px-2 py-2.5 text-right">Total</th>
                      {onViewOrder && <th className="py-2.5 pl-2 pr-4 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {customerOrders.map((order) => {
                      return (
                        <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 pl-4 pr-2 font-mono font-bold text-navy-900">
                            {order.orderNumber}
                          </td>
                          <td className="px-2 py-2.5 text-slate-500">
                            {new Date(order.createdAt).toLocaleDateString('en-LK', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-2 py-2.5 max-w-[200px] truncate text-slate-600">
                            {order.items.map((i) => `${i.productName} (${i.quantity})`).join(', ')}
                          </td>
                          <td className="px-2 py-2.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                order.orderStatus === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : order.orderStatus === 'confirmed'
                                  ? 'bg-brand-100 text-brand-800'
                                  : order.orderStatus === 'cancelled'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {order.orderStatus}
                            </span>
                          </td>
                          <td className="px-2 py-2.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                                order.paymentStatus === 'paid'
                                  ? 'text-emerald-700 font-bold'
                                  : 'text-amber-700 font-bold'
                              }`}
                            >
                              {order.paymentStatus}
                            </span>
                          </td>
                          <td className="px-2 py-2.5 text-right font-bold text-navy-900">
                            Rs. {order.total.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                          </td>
                          {onViewOrder && (
                            <td className="py-2.5 pl-2 pr-4 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  onViewOrder(order);
                                  onClose();
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                              >
                                View
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3.5 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
