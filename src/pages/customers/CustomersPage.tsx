import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  ExternalLink,
  MessageSquare,
  Edit2,
  Eye,
  RefreshCw,
  UserCheck,
  TrendingUp,
  Award,
} from 'lucide-react';
import { Customer, Order } from '@/types';
import { useCustomers, useOrders } from '@/lib/dataStore';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { CustomerModal } from './CustomerModal';
import { CustomerDetailModal } from './CustomerDetailModal';

export const CustomersPage: React.FC<{
  onNavigateToCreateOrder?: (customer: Customer) => void;
  onViewOrderDetails?: (order: Order) => void;
}> = ({ onNavigateToCreateOrder, onViewOrderDetails }) => {
  const { customers, loading, saveCustomer, refresh: refreshCustomers } = useCustomers();
  const { orders, refresh: refreshOrders } = useOrders();
  const { userProfile } = useAuth();
  const { notifySuccess } = useNotification();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<'all' | 'vip' | 'repeat' | 'new'>('all');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.replace(/[\s-]/g, '').includes(q.replace(/[\s-]/g, '')) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      const spent = c.totalSpent || 0;
      const orderCount = c.totalOrders || 0;

      if (filterTier === 'vip') return spent >= 20000;
      if (filterTier === 'repeat') return orderCount >= 2;
      if (filterTier === 'new') return orderCount <= 1;

      return true;
    });
  }, [customers, searchQuery, filterTier]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalCustomers = customers.length;
    const activeBuyers = customers.filter((c) => (c.totalOrders || 0) > 0).length;
    const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    const vipCount = customers.filter((c) => (c.totalSpent || 0) >= 20000).length;

    return {
      totalCustomers,
      activeBuyers,
      totalRevenue,
      vipCount,
    };
  }, [customers]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-navy-900 tracking-tight">
              Customer Directory
            </h1>
            <span className="rounded-full bg-navy-100 px-2.5 py-0.5 text-xs font-bold text-navy-800">
              {customers.length} Registered
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            CRM database, order history records, and direct WhatsApp contact
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              refreshCustomers();
              refreshOrders();
            }}
            title="Refresh Customers"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-500/25 hover:bg-brand-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Customer</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Customers</span>
            <Users className="h-4 w-4 text-navy-700" />
          </div>
          <p className="mt-2 text-xl font-bold text-navy-900">{metrics.totalCustomers}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Total profiles registered</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-brand-600 uppercase">Active Buyers</span>
            <UserCheck className="h-4 w-4 text-brand-500" />
          </div>
          <p className="mt-2 text-xl font-bold text-brand-600">{metrics.activeBuyers}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Placed at least 1 order</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase">Total Revenue</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-lg font-bold text-navy-900 truncate">
            Rs. {metrics.totalRevenue.toLocaleString('en-LK')}
          </p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Lifetime customer sales</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-purple-700 uppercase">VIP Patrons</span>
            <Award className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-2 text-xl font-bold text-purple-700">{metrics.vipCount}</p>
          <p className="text-[10px] text-purple-600/80 mt-0.5">Spent over Rs. 20,000</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, phone number, email, or street address..."
              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Tier buttons */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
            {[
              { id: 'all', label: 'All Customers' },
              { id: 'vip', label: 'VIP (Rs. 20K+)' },
              { id: 'repeat', label: 'Repeat Buyers' },
              { id: 'new', label: 'New Customers' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilterTier(t.id as 'all' | 'vip' | 'repeat' | 'new')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filterTier === t.id
                    ? 'bg-white font-bold text-navy-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Customers Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="text-xs text-slate-500 font-medium">Loading customer directory...</p>
          </div>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Users className="h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-navy-900">No customers found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {searchQuery
              ? 'No customer matched your search terms.'
              : 'Add your first customer to begin recording orders.'}
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-brand-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Customer</span>
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="py-3.5 pl-6 pr-3">Customer</th>
                  <th className="px-3 py-3.5">Contact Details</th>
                  <th className="px-3 py-3.5">Delivery Address</th>
                  <th className="px-3 py-3.5 text-center">Orders</th>
                  <th className="px-3 py-3.5 text-right">Total Spent</th>
                  <th className="py-3.5 pl-3 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCustomers.map((c) => {
                  const rawPhone = c.phone.replace(/[^0-9]/g, '');
                  const waNumber = rawPhone.startsWith('94')
                    ? rawPhone
                    : rawPhone.startsWith('0')
                    ? `94${rawPhone.substring(1)}`
                    : `94${rawPhone}`;

                  const isVip = (c.totalSpent || 0) >= 20000;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3.5 pl-6 pr-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-900 font-bold text-white text-xs">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-navy-900 text-sm">{c.name}</span>
                              {isVip && (
                                <span className="inline-block rounded bg-purple-100 px-1.5 py-0.2 text-[9px] font-black uppercase text-purple-700">
                                  VIP
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              Joined {new Date(c.createdAt).toLocaleDateString('en-LK', { month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Phone & Email */}
                      <td className="px-3 py-3.5">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 font-mono font-semibold text-slate-900">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{c.phone}</span>
                            <a
                              href={`https://wa.me/${waNumber}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Chat on WhatsApp"
                              className="text-emerald-600 hover:text-emerald-700"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </a>
                          </div>
                          {c.email && (
                            <span className="text-[11px] text-slate-400 truncate max-w-xs">
                              {c.email}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Address */}
                      <td className="px-3 py-3.5 max-w-xs">
                        {c.address ? (
                          <div className="flex items-start gap-1 text-slate-600">
                            <MapPin className="h-3 w-3 text-rose-500 shrink-0 mt-0.5" />
                            <span className="truncate">{c.address}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No address specified</span>
                        )}
                      </td>

                      {/* Orders */}
                      <td className="px-3 py-3.5 text-center">
                        <span className="inline-block font-bold rounded-lg bg-slate-100 px-2 py-0.5 text-xs text-navy-900">
                          {c.totalOrders || 0}
                        </span>
                      </td>

                      {/* Total Spent */}
                      <td className="px-3 py-3.5 text-right font-extrabold text-navy-900">
                        Rs. {(c.totalSpent || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pl-3 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingCustomer(c)}
                            title="View Purchase History & Profile"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-navy-900 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            title="Edit Customer"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-brand-50 hover:text-brand-600 transition-colors"
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
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <CustomerModal
          customer={editingCustomer}
          existingCustomers={customers}
          onClose={() => setIsModalOpen(false)}
          onSave={async (custData) => {
            await saveCustomer(custData, {
              uid: userProfile?.uid || 'user',
              name: userProfile?.name || 'Danix User',
            });
          }}
        />
      )}

      {/* Customer Details & History Modal */}
      {viewingCustomer && (
        <CustomerDetailModal
          customer={viewingCustomer}
          orders={orders}
          onClose={() => setViewingCustomer(null)}
          onEdit={(cust) => {
            setViewingCustomer(null);
            handleOpenEdit(cust);
          }}
          onViewOrder={onViewOrderDetails}
          onCreateOrder={onNavigateToCreateOrder}
        />
      )}
    </div>
  );
};
