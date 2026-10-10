import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileText,
  User,
  Phone,
  MapPin,
  Plus,
  Trash2,
  DollarSign,
  Package,
  Calendar,
  CreditCard,
  Building,
  ShoppingBag,
  Check,
} from 'lucide-react';
import { Invoice, OrderItem, PaymentMethod, PaymentStatus, Product, Customer } from '@/types';
import { useProducts, useCustomers } from '@/lib/dataStore';
import { useNotification } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';

interface InvoiceFormModalProps {
  invoice?: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoiceData: Omit<Invoice, 'id' | 'createdAt'> & { id?: string; createdAt?: string | number }) => Promise<void>;
}

export const InvoiceFormModal: React.FC<InvoiceFormModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onSave,
}) => {
  const isEditMode = Boolean(invoice);
  const { products } = useProducts();
  const { customers } = useCustomers();
  const { userProfile } = useAuth();
  const { notifyWarning, notifyError } = useNotification();

  // Invoice Format / Type
  const [invoiceType, setInvoiceType] = useState<'retail' | 'wholesale'>('retail');

  // Customer Information
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [customerCity, setCustomerCity] = useState<string>('');

  // Order reference (optional)
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');

  // Line items
  const [items, setItems] = useState<OrderItem[]>([]);

  // Product Picker state
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [customItemName, setCustomItemName] = useState<string>('');
  const [customItemSku, setCustomItemSku] = useState<string>('');
  const [customItemPrice, setCustomItemPrice] = useState<number>(0);
  const [customItemQty, setCustomItemQty] = useState<number>(1);
  const [showCustomItemRow, setShowCustomItemRow] = useState<boolean>(false);

  // Financials
  const [discount, setDiscount] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('unpaid');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [saving, setSaving] = useState<boolean>(false);

  // Initialize or reset form when invoice or isOpen changes
  useEffect(() => {
    if (!isOpen) return;

    if (invoice) {
      setInvoiceType(invoice.invoiceType || 'retail');
      setSelectedCustomerId(invoice.customerId || '');
      setCustomerName(invoice.customerSnapshot?.name || '');
      setCustomerPhone(invoice.customerSnapshot?.phone || '');
      setCustomerAddress(invoice.customerSnapshot?.address || '');
      setCustomerCity(invoice.customerSnapshot?.city || '');
      setOrderNumber(invoice.orderNumber || '');
      setOrderId(invoice.orderId || '');
      setItems(invoice.items ? JSON.parse(JSON.stringify(invoice.items)) : []);
      setDiscount(invoice.discount || 0);
      setDeliveryFee(invoice.deliveryFee || 0);
      setPaidAmount(invoice.paidAmount ?? (invoice.paymentStatus === 'paid' ? invoice.total : 0));
      setPaymentStatus(invoice.paymentStatus || 'unpaid');
      setPaymentMethod(invoice.paymentMethod || 'cash');
      setDueDate(invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '');
      setNotes(invoice.notes || '');
    } else {
      // Create mode defaults
      setInvoiceType('retail');
      setSelectedCustomerId('');
      setCustomerSearch('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setCustomerCity('');
      setOrderNumber('');
      setOrderId('');
      setItems([]);
      setDiscount(0);
      setDeliveryFee(0);
      setPaidAmount(0);
      setPaymentStatus('unpaid');
      setPaymentMethod('cash');
      setDueDate('');
      setNotes('');
    }
  }, [isOpen, invoice]);

  // Handle customer selection from dropdown
  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setCustomerAddress(c.address || '');
    setCustomerSearch('');
  };

  // Filtered customer list for quick matching
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return [];
    const q = customerSearch.toLowerCase().trim();
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.address && c.address.toLowerCase().includes(q))
      )
      .slice(0, 5);
  }, [customers, customerSearch]);

  // Line items math
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
  }, [items]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - discount + deliveryFee);
  }, [subtotal, discount, deliveryFee]);

  // Adjust paid amount automatically if status is changed to paid/unpaid
  const handlePaymentStatusChange = (status: PaymentStatus) => {
    setPaymentStatus(status);
    if (status === 'paid') {
      setPaidAmount(grandTotal);
    } else if (status === 'unpaid') {
      setPaidAmount(0);
    }
  };

  // Add product from catalog
  const handleAddProductItem = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    // Use wholesale price if wholesale mode and price configured
    const effectivePrice =
      invoiceType === 'wholesale' && prod.wholesalePrice && prod.wholesalePrice > 0
        ? prod.wholesalePrice
        : prod.sellingPrice;

    const existingIdx = items.findIndex((i) => i.productId === prod.id);
    if (existingIdx !== -1) {
      // Increment existing item
      const updated = [...items];
      const target = updated[existingIdx];
      const newQty = target.quantity + 1;
      target.quantity = newQty;
      target.lineTotal = Math.max(0, newQty * target.unitPrice - (target.discount || 0));
      setItems(updated);
    } else {
      const newItem: OrderItem = {
        productId: prod.id,
        sku: prod.sku,
        productName: prod.name,
        quantity: 1,
        unitPrice: effectivePrice,
        discount: 0,
        lineTotal: effectivePrice,
        imageUrl: prod.imageUrl,
      };
      setItems([...items, newItem]);
    }

    setSelectedProductId('');
  };

  // Add custom line item
  const handleAddCustomItem = () => {
    if (!customItemName.trim()) {
      notifyWarning('Please provide an item description');
      return;
    }
    if (customItemPrice <= 0) {
      notifyWarning('Price must be greater than 0');
      return;
    }

    const newItem: OrderItem = {
      productId: `custom-${Date.now()}`,
      sku: customItemSku.trim() || 'CUSTOM',
      productName: customItemName.trim(),
      quantity: Math.max(1, customItemQty),
      unitPrice: customItemPrice,
      discount: 0,
      lineTotal: Math.max(1, customItemQty) * customItemPrice,
    };

    setItems([...items, newItem]);
    setCustomItemName('');
    setCustomItemSku('');
    setCustomItemPrice(0);
    setCustomItemQty(1);
    setShowCustomItemRow(false);
  };

  // Update item field
  const handleUpdateItem = (index: number, field: 'quantity' | 'unitPrice' | 'discount', value: number) => {
    const updated = [...items];
    const target = { ...updated[index] };

    if (field === 'quantity') {
      target.quantity = Math.max(1, value);
    } else if (field === 'unitPrice') {
      target.unitPrice = Math.max(0, value);
    } else if (field === 'discount') {
      target.discount = Math.max(0, value);
    }

    target.lineTotal = Math.max(0, target.quantity * target.unitPrice - (target.discount || 0));
    updated[index] = target;
    setItems(updated);
  };

  // Remove line item
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  // Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !customerPhone.trim()) {
      notifyWarning('Customer name and phone number are required');
      return;
    }

    if (items.length === 0) {
      notifyWarning('Please add at least one line item to the invoice');
      return;
    }

    try {
      setSaving(true);

      const invoiceData: Omit<Invoice, 'id' | 'createdAt'> & { id?: string; createdAt?: string | number } = {
        ...(invoice?.id ? { id: invoice.id } : {}),
        ...(invoice?.invoiceNumber ? { invoiceNumber: invoice.invoiceNumber } : {} as any),
        orderId: orderId || invoice?.orderId || '',
        ...(orderNumber ? { orderNumber } : invoice?.orderNumber ? { orderNumber: invoice.orderNumber } : {}),
        ...(selectedCustomerId ? { customerId: selectedCustomerId } : {}),
        customerSnapshot: {
          name: customerName.trim(),
          phone: customerPhone.trim(),
          ...(customerAddress.trim() ? { address: customerAddress.trim() } : {}),
          ...(customerCity.trim() ? { city: customerCity.trim() } : {}),
        },
        items,
        subtotal,
        discount,
        deliveryFee,
        total: grandTotal,
        paidAmount: paymentStatus === 'paid' ? grandTotal : paidAmount,
        paymentStatus,
        paymentMethod,
        invoiceType,
        ...(dueDate ? { dueDate } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        createdBy: invoice?.createdBy || userProfile?.name || 'Danix Staff',
        ...(invoice?.createdAt ? { createdAt: invoice.createdAt } : {}),
      };

      await onSave(invoiceData);
      onClose();
    } catch (err) {
      console.error('Invoice save failed:', err);
      notifyError((err as Error).message || 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/75 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in overflow-y-auto"
    >
      <div className="relative my-6 w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-navy-900 px-6 py-4 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 font-extrabold text-white shadow-md">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                {isEditMode ? `Edit Invoice #${invoice?.invoiceNumber}` : 'Create New Tax Invoice'}
              </h3>
              <p className="text-xs text-slate-300">
                {isEditMode
                  ? 'Update line items, pricing, or payment details'
                  : 'Generate a new official retail or wholesale invoice'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Format Type Selector (Retail vs Wholesale) */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider pl-1">
              Invoice Format:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setInvoiceType('retail')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${
                  invoiceType === 'retail'
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>Retail Tax Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => setInvoiceType('wholesale')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${
                  invoiceType === 'wholesale'
                    ? 'bg-navy-900 text-white shadow-md shadow-navy-900/25'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Building className="h-3.5 w-3.5" />
                <span>Commercial Wholesale</span>
              </button>
            </div>
          </div>

          {/* Customer Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-2">
                <User className="h-4 w-4 text-brand-500" />
                Customer & Billing Details
              </h4>
              <span className="text-[11px] text-slate-400">
                Required for official tax documentation
              </span>
            </div>

            {/* Quick Customer Picker */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lookup Existing Customer (Optional)
              </label>
              <input
                type="text"
                placeholder="Type customer name, phone, or address..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {filteredCustomers.length > 0 && (
                <div className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCustomer(c)}
                      className="w-full px-4 py-2 text-left text-xs hover:bg-slate-50 flex items-center justify-between border-b border-slate-100 last:border-none"
                    >
                      <div>
                        <div className="font-bold text-navy-900">{c.name}</div>
                        <div className="text-[11px] text-slate-500">{c.phone} {c.address && `• ${c.address}`}</div>
                      </div>
                      <span className="text-[10px] font-bold text-brand-600">Select</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Inputs Grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kasun Perera"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Phone <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 077 123 4567"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Delivery / Billing Address
                </label>
                <input
                  type="text"
                  placeholder="Street / Unit / House #"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  City / Town
                </label>
                <input
                  type="text"
                  placeholder="e.g. Galle, Colombo, Kandy"
                  value={customerCity}
                  onChange={(e) => setCustomerCity(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Line Items Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
              <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-2">
                <Package className="h-4 w-4 text-brand-500" />
                Line Items ({items.length})
              </h4>

              {/* Add item actions */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedProductId}
                  onChange={(e) => handleAddProductItem(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">+ Add From Catalog...</option>
                  {products
                    .filter((p) => p.active)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) - Rs. {invoiceType === 'wholesale' && p.wholesalePrice ? p.wholesalePrice : p.sellingPrice}
                      </option>
                    ))}
                </select>

                <button
                  type="button"
                  onClick={() => setShowCustomItemRow(!showCustomItemRow)}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Custom Item</span>
                </button>
              </div>
            </div>

            {/* Custom Item Quick Form (if open) */}
            {showCustomItemRow && (
              <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-3 space-y-2">
                <div className="text-[11px] font-bold text-brand-900 uppercase tracking-wider">
                  Add Custom Line Item
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      placeholder="Item Description *"
                      value={customItemName}
                      onChange={(e) => setCustomItemName(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="SKU"
                      value={customItemSku}
                      onChange={(e) => setCustomItemSku(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono text-slate-900"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      placeholder="Price (Rs.)"
                      min={0}
                      step="any"
                      value={customItemPrice || ''}
                      onChange={(e) => setCustomItemPrice(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono text-slate-900"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <input
                      type="number"
                      placeholder="Qty"
                      min={1}
                      value={customItemQty}
                      onChange={(e) => setCustomItemQty(parseInt(e.target.value, 10) || 1)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-center font-bold text-slate-900"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleAddCustomItem}
                      className="w-full rounded-lg bg-brand-500 py-1.5 px-3 text-xs font-bold text-white hover:bg-brand-600"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomItemRow(false)}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Line Items Table */}
            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                <Package className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">No items added yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Select a product from the catalog above or create a custom line item
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 pl-3 pr-2">Item Description</th>
                      <th className="px-2 py-2.5">SKU</th>
                      <th className="px-2 py-2.5 text-right w-24">Unit Price (Rs.)</th>
                      <th className="px-2 py-2.5 text-center w-20">Qty</th>
                      <th className="px-2 py-2.5 text-right w-24">Discount (Rs.)</th>
                      <th className="px-2 py-2.5 text-right w-28">Line Total</th>
                      <th className="py-2.5 pr-3 pl-1 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => (
                      <tr key={`${item.productId}-${idx}`} className="hover:bg-slate-50/50">
                        <td className="py-2 pl-3 pr-2 font-medium text-navy-900">
                          {item.productName}
                        </td>
                        <td className="px-2 py-2 font-mono text-slate-500 text-[11px]">
                          {item.sku}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleUpdateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)
                            }
                            className="w-20 rounded border border-slate-200 px-1.5 py-1 text-xs text-right font-mono"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateItem(idx, 'quantity', parseInt(e.target.value, 10) || 1)
                            }
                            className="w-16 rounded border border-slate-200 px-1.5 py-1 text-xs text-center font-bold"
                          />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={item.discount || ''}
                            onChange={(e) =>
                              handleUpdateItem(idx, 'discount', parseFloat(e.target.value) || 0)
                            }
                            placeholder="0"
                            className="w-20 rounded border border-slate-200 px-1.5 py-1 text-xs text-right font-mono text-rose-600"
                          />
                        </td>
                        <td className="px-2 py-2 text-right font-mono font-bold text-navy-900">
                          Rs. {item.lineTotal.toFixed(2)}
                        </td>
                        <td className="py-2 pr-3 pl-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="rounded p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Remove Item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payment & Logistics Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Payment & Status Section */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3.5">
              <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <CreditCard className="h-4 w-4 text-brand-500" />
                Payment & Terms
              </h4>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Status
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['paid', 'unpaid', 'partial'] as PaymentStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handlePaymentStatusChange(status)}
                      className={`rounded-xl py-2 px-2 text-xs font-bold uppercase tracking-wider border text-center transition-all ${
                        paymentStatus === status
                          ? status === 'paid'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : status === 'partial'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {paymentStatus === 'partial' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount Paid (Rs.)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={grandTotal}
                    step="any"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono text-emerald-700 font-bold"
                  />
                  <div className="mt-1 text-[11px] text-slate-500">
                    Remaining Balance: Rs. {Math.max(0, grandTotal - paidAmount).toFixed(2)}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 font-medium"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card / POS</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cod">Cash On Delivery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Order Reference # (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ORD-2026-12345"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-800"
                />
              </div>
            </div>

            {/* Totals Summary */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider border-b border-slate-200 pb-2">
                  Invoice Financial Summary
                </h4>

                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} units):</span>
                    <span className="font-mono font-bold text-navy-900">Rs. {subtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Overall Discount (Rs.):</span>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={discount || ''}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-right font-mono text-rose-600 font-bold"
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Delivery / Shipping Fee (Rs.):</span>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={deliveryFee || ''}
                      onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-right font-mono font-bold"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-300 text-sm font-black text-navy-900">
                    <span>Grand Total:</span>
                    <span className="text-brand-600 font-mono text-base">
                      Rs. {grandTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Invoice Notes & Terms
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. 7-day payment warranty, payment terms, or special instructions..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || items.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-2.5 text-xs font-extrabold text-white shadow-md shadow-brand-500/25 hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Saving Invoice...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>{isEditMode ? 'Update Invoice' : 'Create & Issue Invoice'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
