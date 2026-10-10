import React, { useState, useMemo, useRef } from 'react';
import {
  Package,
  Plus,
  Trash2,
  Search,
  QrCode,
  User,
  Phone,
  MapPin,
  FileText,
  Truck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  DollarSign,
  CreditCard,
  Banknote,
  Boxes,
  Minus,
  Printer,
  RotateCcw,
} from 'lucide-react';
import { Product, Customer, OrderItem, Order, Invoice, PaymentMethod, PaymentStatus, OrderStatus } from '@/types';
import { useProducts, useCustomers, useOrders } from '@/lib/dataStore';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { CustomerModal } from '@/pages/customers/CustomerModal';
import { printOrderReceipt, printA4InvoiceDocument } from '@/lib/printUtils';

interface CreateOrderPageProps {
  onBack: () => void;
  onOrderCreated?: (order: Order) => void;
  initialCustomer?: Customer | null;
}

export const CreateOrderPage: React.FC<CreateOrderPageProps> = ({
  onBack,
  onOrderCreated,
  initialCustomer,
}) => {
  const { products } = useProducts();
  const { customers, saveCustomer } = useCustomers();
  const { saveOrder } = useOrders();
  const { userProfile } = useAuth();
  const { notifySuccess, notifyWarning, notifyError, notifyInfo } = useNotification();

  // Mode State (Retail vs Wholesale)
  const [orderType, setOrderType] = useState<'retail' | 'wholesale'>('retail');
  const isWholesale = orderType === 'wholesale';

  // Customer State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialCustomer?.id || ''
  );
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerName, setCustomerName] = useState(initialCustomer?.name || '');
  const [customerPhone, setCustomerPhone] = useState(initialCustomer?.phone || '');
  const [customerAddress, setCustomerAddress] = useState(initialCustomer?.address || '');
  const [isQuickCustomerModalOpen, setIsQuickCustomerModalOpen] = useState(false);

  // Product Search & Barcode
  const [productSearch, setProductSearch] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  // Line Items
  const [items, setItems] = useState<OrderItem[]>([]);

  // Order Totals
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(350); // Default Rs. 350 Sri Lankan delivery fee
  const [isFreeDelivery, setIsFreeDelivery] = useState<boolean>(false);
  const [orderNotes, setOrderNotes] = useState<string>('');

  // Payment & Status
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('unpaid');
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('confirmed');

  const [saving, setSaving] = useState<boolean>(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // Filtered customers for search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 5);
    const q = customerSearch.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.address && c.address.toLowerCase().includes(q))
    );
  }, [customers, customerSearch]);

  // Filtered products for picker
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.filter((p) => p.active);
    const q = productSearch.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.active &&
        (p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.includes(q)))
    );
  }, [products, productSearch]);

  // Handle selecting an existing customer
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setCustomerAddress(customer.address || '');
    setCustomerSearch('');
  };

  // Helper to determine unit price based on retail vs wholesale mode
  const getProductUnitPrice = (product: Product, mode: 'retail' | 'wholesale' = orderType): number => {
    if (mode === 'wholesale' && product.wholesalePrice !== undefined && product.wholesalePrice > 0) {
      return product.wholesalePrice;
    }
    return product.sellingPrice;
  };

  // Switch between Retail Sale and Wholesale Sale mode
  const handleToggleOrderType = (newType: 'retail' | 'wholesale') => {
    if (newType === orderType) return;
    setOrderType(newType);

    // Update all existing items in the order to match the new mode
    setItems((prevItems) =>
      prevItems.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return item;
        const newUnitPrice = getProductUnitPrice(product, newType);
        return {
          ...item,
          unitPrice: newUnitPrice,
          lineTotal: Math.max(0, item.quantity * newUnitPrice - item.discount),
        };
      })
    );

    notifyInfo(
      newType === 'wholesale'
        ? 'Switched to Wholesale Sale mode. Applied wholesale prices to items where available.'
        : 'Switched to Retail Sale mode. Applied standard retail prices.'
    );
  };

  // Add product to line items (or increment quantity if already added)
  const handleAddProduct = (product: Product, quantityToAdd: number = 1) => {
    if (product.stockQuantity <= 0) {
      notifyWarning(`Product "${product.name}" is out of stock!`);
      return;
    }

    const unitPrice = getProductUnitPrice(product, orderType);
    const isWholesaleApplied = orderType === 'wholesale' && product.wholesalePrice !== undefined && product.wholesalePrice > 0;

    setItems((prevItems) => {
      const existingIdx = prevItems.findIndex((i) => i.productId === product.id);

      if (existingIdx !== -1) {
        const currentQty = prevItems[existingIdx].quantity;
        const newQty = currentQty + quantityToAdd;

        if (newQty > product.stockQuantity) {
          notifyWarning(
            `Cannot add more! Only ${product.stockQuantity} units available in stock.`
          );
          return prevItems;
        }

        const updated = [...prevItems];
        const itemUnitPrice = updated[existingIdx].unitPrice;
        const discount = updated[existingIdx].discount;
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: newQty,
          lineTotal: Math.max(0, newQty * itemUnitPrice - discount),
        };
        return updated;
      }

      // Add as new line item
      if (quantityToAdd > product.stockQuantity) {
        notifyWarning(`Only ${product.stockQuantity} units available in stock.`);
        return prevItems;
      }

      const newItem: OrderItem = {
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        quantity: quantityToAdd,
        unitPrice,
        discount: 0,
        lineTotal: unitPrice * quantityToAdd,
        ...(product.imageUrl ? { imageUrl: product.imageUrl } : {}),
      };

      notifySuccess(
        `Added ${product.name}${
          isWholesaleApplied ? ` (Wholesale: Rs. ${unitPrice.toFixed(2)})` : ''
        }`
      );
      return [newItem, ...prevItems];
    });
  };

  // Barcode scanner auto-enter trigger
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const query = barcodeInput.trim();
    const matched = products.find(
      (p) =>
        (p.barcode && p.barcode === query) ||
        p.sku.toUpperCase() === query.toUpperCase()
    );

    if (matched) {
      handleAddProduct(matched, 1);
      setBarcodeInput('');
    } else {
      notifyWarning(`No product found with barcode/SKU: ${query}`);
    }
  };

  // Update item quantity with live stock bound
  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    const prod = products.find((p) => p.id === productId);
    const maxStock = prod ? prod.stockQuantity : 9999;

    if (newQuantity <= 0) {
      handleRemoveItem(productId);
      return;
    }

    if (newQuantity > maxStock) {
      notifyWarning(`Only ${maxStock} units currently available in stock!`);
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          return {
            ...item,
            quantity: newQuantity,
            lineTotal: Math.max(0, newQuantity * item.unitPrice - item.discount),
          };
        }
        return item;
      })
    );
  };

  // Update item discount
  const handleUpdateItemDiscount = (productId: string, discount: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const validDiscount = Math.max(0, discount);
          return {
            ...item,
            discount: validDiscount,
            lineTotal: Math.max(0, item.quantity * item.unitPrice - validDiscount),
          };
        }
        return item;
      })
    );
  };

  // Remove item
  const handleRemoveItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.lineTotal, 0);
  }, [items]);

  const effectiveDeliveryFee = isFreeDelivery ? 0 : deliveryFee;
  const grandTotal = Math.max(0, subtotal - orderDiscount + effectiveDeliveryFee);

  // Form submission
  const handleCreateOrder = async () => {
    if (items.length === 0) {
      notifyWarning('Please add at least one product item to create the order');
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      notifyWarning('Customer name and phone number are required');
      return;
    }

    setSaving(true);
    try {
      const year = new Date().getFullYear();
      const rand = Math.floor(10000 + Math.random() * 90000);
      const orderNumber = `ORD-${year}-${rand}`;

      const cleanAddress = customerAddress.trim();
      const cleanNotes = orderNotes.trim();

      const newOrderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> = {
        orderNumber,
        ...(selectedCustomerId ? { customerId: selectedCustomerId } : {}),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        ...(cleanAddress ? { customerAddress: cleanAddress } : {}),
        items: items.map((item) => {
          const cleanItem: OrderItem = {
            productId: item.productId,
            sku: item.sku,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            lineTotal: item.lineTotal,
            ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
          };
          return cleanItem;
        }),
        subtotal,
        discount: orderDiscount,
        deliveryFee: effectiveDeliveryFee,
        total: grandTotal,
        paymentMethod,
        paymentStatus,
        orderStatus,
        deliveryStatus: 'pending',
        orderType: isWholesale ? 'wholesale' : 'retail',
        ...(cleanNotes ? { notes: cleanNotes } : {}),
        createdBy: userProfile?.name || 'Danix Operator',
      };

      const created = await saveOrder(newOrderData, {
        uid: userProfile?.uid || 'user',
        name: userProfile?.name || 'Danix User',
      });

      setCreatedOrder(created);
      notifySuccess(`Order #${orderNumber} (${isWholesale ? 'Wholesale' : 'Retail'}) placed successfully! Stock deducted.`);

      // Automatically trigger popup-free printing of the receipt slip immediately upon order completion!
      printOrderReceipt(created, {
        title: `Order Receipt - ${created.orderNumber}`,
        onComplete: () => {
          notifySuccess(`Order #${created.orderNumber} receipt sent to printer automatically`);
        },
      });

      if (onOrderCreated) {
        onOrderCreated(created);
      }
    } catch (err) {
      notifyError((err as Error).message || 'Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  const handleReprintSlip = () => {
    if (!createdOrder) return;
    printOrderReceipt(createdOrder, {
      title: `Order Receipt - ${createdOrder.orderNumber}`,
      onComplete: () => {
        notifySuccess(`Receipt for Order #${createdOrder.orderNumber} re-sent to printer`);
      },
    });
  };

  const handlePrintA4 = () => {
    if (!createdOrder) return;
    const inv: Invoice = {
      id: `inv-${createdOrder.id}`,
      invoiceNumber: createdOrder.orderNumber.replace('ORD-', 'INV-'),
      orderId: createdOrder.id,
      orderNumber: createdOrder.orderNumber,
      ...(createdOrder.customerId ? { customerId: createdOrder.customerId } : {}),
      customerSnapshot: {
        name: createdOrder.customerName,
        phone: createdOrder.customerPhone,
        address: createdOrder.customerAddress || '',
      },
      items: createdOrder.items,
      subtotal: createdOrder.subtotal,
      discount: createdOrder.discount || 0,
      deliveryFee: createdOrder.deliveryFee || 0,
      total: createdOrder.total,
      paidAmount: createdOrder.paymentStatus === 'paid' ? createdOrder.total : 0,
      paymentStatus: createdOrder.paymentStatus,
      paymentMethod: createdOrder.paymentMethod,
      invoiceType: isWholesale ? 'wholesale' : 'retail',
      notes: createdOrder.notes,
      createdBy: createdOrder.createdBy,
      createdAt: createdOrder.createdAt,
    };
    printA4InvoiceDocument(inv, {
      title: `Invoice - ${inv.invoiceNumber}`,
      onComplete: () => {
        notifySuccess(`A4 Invoice for Order #${createdOrder.orderNumber} sent to printer`);
      },
    });
  };

  const handleStartNewOrder = () => {
    setCreatedOrder(null);
    setSelectedCustomerId('');
    setCustomerSearch('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setItems([]);
    setOrderDiscount(0);
    setDeliveryFee(350);
    setIsFreeDelivery(false);
    setOrderNotes('');
    setPaymentMethod('cod');
    setPaymentStatus('unpaid');
    setOrderStatus('confirmed');
    setProductSearch('');
    setBarcodeInput('');
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-navy-900 tracking-tight">Create New Order</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  isWholesale
                    ? 'bg-sky-100 text-sky-800 border border-sky-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}
              >
                {isWholesale ? '📦 Wholesale Mode' : '🛍️ Retail Mode'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Live inventory verification, customer matching, and automated stock deductions
            </p>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreateOrder}
            disabled={saving || items.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-500/25 hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Processing Order...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Place Order (Rs. {grandTotal.toLocaleString('en-LK')})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sale Mode Selector Card / Pills */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Order Selling Channel & Pricing Mode
          </span>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-navy-900">
              {isWholesale ? '📦 Wholesale Sale (B2B)' : '🛍️ Retail Sale (Direct Customer)'}
            </h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                isWholesale
                  ? 'bg-sky-100 text-sky-800 border border-sky-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}
            >
              {isWholesale ? 'Wholesale Pricing Active' : 'Standard Retail Pricing'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isWholesale
              ? 'Automatically applies product wholesale rates. Switching channels recalculates cart items.'
              : 'Standard retail selling prices applied to order items and printed invoice.'}
          </p>
        </div>

        {/* Switcher Pills */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1.5 border border-slate-200 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleToggleOrderType('retail')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              !isWholesale
                ? 'bg-white text-navy-900 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-navy-900'
            }`}
          >
            <span>🛍️</span>
            <span>Retail Sale</span>
          </button>
          <button
            type="button"
            onClick={() => handleToggleOrderType('wholesale')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              isWholesale
                ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                : 'text-slate-600 hover:text-navy-900'
            }`}
          >
            <span>📦</span>
            <span>Wholesale Sale</span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${
                isWholesale ? 'bg-sky-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              B2B
            </span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left (Customer & Items) + Right (Totals & Payment) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Customer Picker & Line Items Picker */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-brand-500" />
                <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                  Customer Information
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsQuickCustomerModalOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Quick Add Customer</span>
              </button>
            </div>

            {/* Search or Quick Choose Customer */}
            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search registered customer by name or phone..."
                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />

              {customerSearch && filteredCustomers.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl border border-slate-200 bg-white p-1 shadow-lg max-h-48 overflow-y-auto">
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCustomer(c)}
                      className="w-full text-left p-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-navy-900">{c.name}</span>
                        <span className="text-[11px] text-slate-500 font-mono ml-2">{c.phone}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                        {c.address}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Inputs (Pre-filled or Manual) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Recipient Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Kasun Jayasuriya"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="0771234567"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">
                  Delivery Address & City
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Street address, City, District"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Product Picker & Barcode Scanner Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Boxes className="h-4 w-4 text-brand-500" />
                <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                  Add Products to Order
                </h3>
              </div>

              <span className="text-[11px] text-slate-500">Live stock check active</span>
            </div>

            {/* Quick Barcode Scanner Form */}
            <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <QrCode className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan barcode or type SKU and hit Enter..."
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-navy-900 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-800 transition-colors shadow-sm"
              >
                Scan / Add
              </button>
            </form>

            {/* Search Filter for Catalog Grid */}
            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products by name or category..."
                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Quick Catalog Picker Carousel / Grid */}
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {filteredProducts.map((p) => {
                const inStock = p.stockQuantity > 0;
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-navy-900 truncate">{p.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                          <span>{p.sku}</span>
                          <span
                            className={`font-semibold ${
                              inStock ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            • {inStock ? `${p.stockQuantity} in stock` : 'Out of stock'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="font-bold text-navy-900 block">
                          Rs. {getProductUnitPrice(p).toFixed(2)}
                        </span>
                        {isWholesale && p.wholesalePrice && p.wholesalePrice > 0 ? (
                          <span className="text-[10px] font-bold text-sky-600 block">
                            Wholesale Rate
                          </span>
                        ) : isWholesale ? (
                          <span className="text-[10px] text-slate-400 block">
                            Retail (no WS)
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        disabled={!inStock}
                        onClick={() => handleAddProduct(p, 1)}
                        className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Line Items Table Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                Order Items ({items.length})
              </h3>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setItems([])}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
                >
                  Clear All Items
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                No items in order yet. Use the barcode scanner or catalog list above to add products.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600">
                    <tr>
                      <th className="py-2.5 pl-3 pr-2">Product</th>
                      <th className="px-2 py-2.5">Price</th>
                      <th className="px-2 py-2.5 text-center">Quantity</th>
                      <th className="px-2 py-2.5 text-right">Discount (Rs)</th>
                      <th className="px-2 py-2.5 text-right">Total</th>
                      <th className="py-2.5 pl-2 pr-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => {
                      const prod = products.find((p) => p.id === item.productId);
                      const maxStock = prod ? prod.stockQuantity : 999;

                      return (
                        <tr key={item.productId} className="hover:bg-slate-50/50">
                          <td className="py-3 pl-3 pr-2">
                            <span className="font-bold text-navy-900 block">{item.productName}</span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {item.sku} (Max: {maxStock})
                            </span>
                          </td>
                          <td className="px-2 py-3 font-semibold text-slate-700">
                            <div>Rs. {item.unitPrice.toFixed(2)}</div>
                            {isWholesale && prod?.wholesalePrice && prod.wholesalePrice === item.unitPrice && (
                              <span className="inline-block text-[9px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded uppercase mt-0.5">
                                Wholesale
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                                className="h-6 w-6 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-100"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-8 text-center font-bold text-navy-900">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                                className="h-6 w-6 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-100"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td className="px-2 py-3 text-right">
                            <input
                              type="number"
                              min="0"
                              value={item.discount || ''}
                              onChange={(e) =>
                                handleUpdateItemDiscount(
                                  item.productId,
                                  e.target.value === '' ? 0 : parseFloat(e.target.value)
                                )
                              }
                              placeholder="0"
                              className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-right text-xs focus:ring-1 focus:ring-brand-500"
                            />
                          </td>
                          <td className="px-2 py-3 text-right font-bold text-navy-900">
                            Rs. {item.lineTotal.toFixed(2)}
                          </td>
                          <td className="py-3 pl-2 pr-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.productId)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Summary, Payment, Status & Actions */}
        <div className="space-y-6">
          {/* Order Summary & Pricing Calculation */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider border-b border-slate-100 pb-3">
              Order Totals & Breakdown
            </h3>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span className="font-bold text-navy-900">Rs. {subtotal.toFixed(2)}</span>
              </div>

              {/* Order Level Discount */}
              <div className="flex items-center justify-between">
                <span>Order Discount (Rs):</span>
                <input
                  type="number"
                  min="0"
                  value={orderDiscount || ''}
                  onChange={(e) =>
                    setOrderDiscount(e.target.value === '' ? 0 : parseFloat(e.target.value))
                  }
                  placeholder="0.00"
                  className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right font-semibold text-rose-600 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Delivery Fee with Free Delivery toggle */}
              <div className="space-y-1.5 border-t border-slate-100 pt-2">
                <div className="flex items-center justify-between">
                  <span>Delivery Fee:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      disabled={isFreeDelivery}
                      value={isFreeDelivery ? 0 : deliveryFee}
                      onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                      className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-right font-semibold text-slate-800 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <label className="flex items-center gap-1.5 text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFreeDelivery}
                      onChange={(e) => setIsFreeDelivery(e.target.checked)}
                      className="rounded text-brand-500 focus:ring-brand-500"
                    />
                    <span>Free Delivery Promotion</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Default: Rs. 350</span>
                </div>
              </div>

              {/* Grand Total */}
              <div className="flex justify-between text-base font-black text-navy-900 border-t border-slate-200 pt-3">
                <span>Grand Total:</span>
                <span className="text-brand-600">
                  Rs. {grandTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method & Status */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider border-b border-slate-100 pb-3">
              Payment & Fulfillment
            </h3>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'cod', label: 'Cash on Delivery', sub: 'COD' },
                  { id: 'bank_transfer', label: 'Bank Transfer', sub: 'Online' },
                  { id: 'cash', label: 'Cash (Counter)', sub: 'POS' },
                  { id: 'card', label: 'Credit/Debit Card', sub: 'Terminal' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      paymentMethod === m.id
                        ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20 text-brand-900'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="block font-bold leading-tight">{m.label}</span>
                    <span className="text-[10px] text-slate-400 uppercase">{m.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payment Status
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="unpaid">Unpaid (Payment Pending)</option>
                <option value="paid">Paid (Fully Cleared)</option>
                <option value="partial">Partial Payment</option>
              </select>
            </div>

            {/* Order Initial Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Order Pipeline Status
              </label>
              <select
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="confirmed">Confirmed (Reserve & Deduct Stock)</option>
                <option value="pending">Pending (Hold Order)</option>
                <option value="packed">Packed (Ready for Dispatch)</option>
              </select>
              <p className="mt-1 text-[10px] text-slate-400">
                Confirmed orders automatically deduct item stock atomically.
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Order Notes / Delivery Remarks
              </label>
              <textarea
                rows={2}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="e.g. Call before dispatch, fragile packaging..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Big Action Button */}
          <button
            type="button"
            onClick={handleCreateOrder}
            disabled={saving || items.length === 0}
            className="w-full rounded-2xl bg-brand-500 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-brand-500/30 hover:bg-brand-600 transition-all disabled:opacity-50"
          >
            {saving ? 'Processing...' : `Confirm & Place Order (Rs. ${grandTotal.toLocaleString('en-LK')})`}
          </button>
        </div>
      </div>

      {/* Quick Customer Registration Modal */}
      {isQuickCustomerModalOpen && (
        <CustomerModal
          customer={null}
          existingCustomers={customers}
          onClose={() => setIsQuickCustomerModalOpen(false)}
          onSave={async (custData) => {
            const saved = await saveCustomer(custData, {
              uid: userProfile?.uid || 'user',
              name: userProfile?.name || 'Danix User',
            });
            handleSelectCustomer(saved);
          }}
        />
      )}

      {/* Order Success & Print Modal */}
      {createdOrder && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/75 p-4 backdrop-blur-sm animate-in fade-in"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            {/* Success Header */}
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mb-3 shadow-inner">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-black text-navy-900">Order Placed Successfully!</h3>
              <p className="mt-1 text-xs text-slate-500">
                Order receipt slip was automatically dispatched to your printer.
              </p>
            </div>

            {/* Order Brief Summary Box */}
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="font-semibold text-slate-600">Order Reference:</span>
                <span className="font-mono font-bold text-navy-900 text-sm">{createdOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Customer:</span>
                <span className="font-bold text-slate-900">{createdOrder.customerName} ({createdOrder.customerPhone})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Items Count:</span>
                <span className="font-semibold text-slate-900">{createdOrder.items.reduce((s, i) => s + i.quantity, 0)} units</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Payment Status:</span>
                <span className="font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {createdOrder.paymentStatus} • {createdOrder.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm font-black text-navy-900">
                <span>Grand Total:</span>
                <span className="text-brand-600 font-mono">Rs. {createdOrder.total.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Print & Action Buttons */}
            <div className="mt-6 space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleReprintSlip}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-xs font-bold text-navy-900 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <Printer className="h-4 w-4 text-brand-500" />
                  <span>Re-print Slip</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintA4}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-xs font-bold text-navy-900 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <FileText className="h-4 w-4 text-sky-600" />
                  <span>Print A4 Invoice</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleStartNewOrder}
                  className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 px-4 text-xs font-black text-white hover:bg-brand-600 transition-colors shadow-md shadow-brand-500/25"
                >
                  <Plus className="h-4 w-4" />
                  <span>New Order</span>
                </button>
                <button
                  type="button"
                  onClick={onBack}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 py-3 px-4 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <span>Orders List</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
