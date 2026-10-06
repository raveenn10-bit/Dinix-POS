import { useState, useEffect, useCallback } from 'react';
import {
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase/config';
import {
  productsCol,
  customersCol,
  ordersCol,
  invoicesCol,
  deliveriesCol,
  stockMovementsCol,
  recordStockMovement,
  generateNextInvoiceNumber,
  logActivity,
} from '@/lib/firebase/firestore';
import {
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_ORDERS,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_INVOICES,
  INITIAL_DELIVERIES,
} from './mockData';
import {
  Product,
  Customer,
  Order,
  StockMovement,
  StockMovementType,
  Invoice,
  Delivery,
  DeliveryStatus,
  PaymentStatus,
  PaymentMethod,
} from '@/types';

// Storage keys for demo mode
const STORAGE_KEYS = {
  PRODUCTS: 'danix_mock_products',
  CUSTOMERS: 'danix_mock_customers',
  ORDERS: 'danix_mock_orders',
  STOCK_MOVEMENTS: 'danix_mock_stock_movements',
  INVOICES: 'danix_mock_invoices',
  DELIVERIES: 'danix_mock_deliveries',
};

// Initialize Local Storage demo data if missing
export function initDemoStorage(): void {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.STOCK_MOVEMENTS)) {
    localStorage.setItem(STORAGE_KEYS.STOCK_MOVEMENTS, JSON.stringify(INITIAL_STOCK_MOVEMENTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.INVOICES)) {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(INITIAL_INVOICES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.DELIVERIES)) {
    localStorage.setItem(STORAGE_KEYS.DELIVERIES, JSON.stringify(INITIAL_DELIVERIES));
  }
}

// ----------------------------------------------------
// PRODUCTS SERVICE & HOOK
// ----------------------------------------------------

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    initDemoStorage();
    if (!isFirebaseConfigured) {
      const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      setProducts(stored ? JSON.parse(stored) : INITIAL_PRODUCTS);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const snapshot = await getDocs(productsCol);
      if (snapshot.empty) {
        // First run in live Firestore: seed initial products
        for (const p of INITIAL_PRODUCTS) {
          await setDoc(doc(db, 'products', p.id), p);
        }
        setProducts(INITIAL_PRODUCTS);
      } else {
        const list = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        }));
        setProducts(list);
      }
    } catch (err) {
      console.warn('[Firestore] Falling back to local products:', err);
      const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      setProducts(stored ? JSON.parse(stored) : INITIAL_PRODUCTS);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      fetchProducts();
      return;
    }

    const unsubscribe = onSnapshot(
      productsCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((docSnap) => ({
            ...docSnap.data(),
            id: docSnap.id,
          }));
          setProducts(list);
          setLoading(false);
        } else {
          fetchProducts();
        }
      },
      (err) => {
        console.warn('[Firestore snapshot error, falling back]', err);
        fetchProducts();
      }
    );

    return () => unsubscribe();
  }, [fetchProducts]);

  const saveProduct = async (
    product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    user: { uid: string; name: string }
  ): Promise<Product> => {
    const isNew = !product.id;
    const now = Date.now();
    const id = product.id || `prod-${now}-${Math.random().toString(36).substring(2, 6)}`;

    const saved: Product = {
      ...product,
      id,
      createdAt: (product as Partial<Product>).createdAt || now,
      updatedAt: now,
    };

    if (!isFirebaseConfigured) {
      const current = [...products];
      const index = current.findIndex((p) => p.id === id);
      let updated: Product[];
      if (index !== -1) {
        updated = current.map((p) => (p.id === id ? saved : p));
      } else {
        updated = [saved, ...current];
      }
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));
      setProducts(updated);
      logActivity(
        isNew ? 'CREATE_PRODUCT' : 'UPDATE_PRODUCT',
        'product',
        id,
        `${isNew ? 'Created' : 'Updated'} product: ${saved.name} (SKU: ${saved.sku})`,
        user
      );
      return saved;
    }

    await setDoc(doc(db, 'products', id), saved);
    await logActivity(
      isNew ? 'CREATE_PRODUCT' : 'UPDATE_PRODUCT',
      'product',
      id,
      `${isNew ? 'Created' : 'Updated'} product: ${saved.name} (SKU: ${saved.sku})`,
      user
    );
    return saved;
  };

  const deleteProduct = async (id: string, user: { uid: string; name: string }): Promise<void> => {
    const target = products.find((p) => p.id === id);
    if (!isFirebaseConfigured) {
      const updated = products.filter((p) => p.id !== id);
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));
      setProducts(updated);
      logActivity(
        'DELETE_PRODUCT',
        'product',
        id,
        `Deleted product ${target?.name || id} (SKU: ${target?.sku || 'N/A'})`,
        user
      );
      return;
    }

    await deleteDoc(doc(db, 'products', id));
    await logActivity(
      'DELETE_PRODUCT',
      'product',
      id,
      `Deleted product ${target?.name || id} (SKU: ${target?.sku || 'N/A'})`,
      user
    );
  };

  return { products, loading, error, refresh: fetchProducts, saveProduct, deleteProduct };
}

// ----------------------------------------------------
// CUSTOMERS SERVICE & HOOK
// ----------------------------------------------------

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    initDemoStorage();
    if (!isFirebaseConfigured) {
      const stored = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      setCustomers(stored ? JSON.parse(stored) : INITIAL_CUSTOMERS);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const snapshot = await getDocs(customersCol);
      if (snapshot.empty) {
        for (const c of INITIAL_CUSTOMERS) {
          await setDoc(doc(db, 'customers', c.id), c);
        }
        setCustomers(INITIAL_CUSTOMERS);
      } else {
        const list = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        }));
        setCustomers(list);
      }
    } catch (err) {
      console.warn('[Firestore] Falling back to local customers:', err);
      const stored = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      setCustomers(stored ? JSON.parse(stored) : INITIAL_CUSTOMERS);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      fetchCustomers();
      return;
    }

    const unsubscribe = onSnapshot(
      customersCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((docSnap) => ({
            ...docSnap.data(),
            id: docSnap.id,
          }));
          setCustomers(list);
          setLoading(false);
        } else {
          fetchCustomers();
        }
      },
      (err) => {
        console.warn('[Firestore snapshot customers error]', err);
        fetchCustomers();
      }
    );

    return () => unsubscribe();
  }, [fetchCustomers]);

  const saveCustomer = async (
    customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    user: { uid: string; name: string }
  ): Promise<Customer> => {
    const isNew = !customer.id;
    const now = Date.now();
    const id = customer.id || `cust-${now}-${Math.random().toString(36).substring(2, 6)}`;

    const saved: Customer = {
      ...customer,
      id,
      totalOrders: customer.totalOrders || 0,
      totalSpent: customer.totalSpent || 0,
      createdAt: (customer as Partial<Customer>).createdAt || now,
      updatedAt: now,
    };

    if (!isFirebaseConfigured) {
      const current = [...customers];
      const index = current.findIndex((c) => c.id === id);
      let updated: Customer[];
      if (index !== -1) {
        updated = current.map((c) => (c.id === id ? saved : c));
      } else {
        updated = [saved, ...current];
      }
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updated));
      setCustomers(updated);
      logActivity(
        isNew ? 'CREATE_CUSTOMER' : 'UPDATE_CUSTOMER',
        'customer',
        id,
        `${isNew ? 'Added' : 'Updated'} customer: ${saved.name} (${saved.phone})`,
        user
      );
      return saved;
    }

    await setDoc(doc(db, 'customers', id), saved);
    await logActivity(
      isNew ? 'CREATE_CUSTOMER' : 'UPDATE_CUSTOMER',
      'customer',
      id,
      `${isNew ? 'Added' : 'Updated'} customer: ${saved.name} (${saved.phone})`,
      user
    );
    return saved;
  };

  return { customers, loading, error, refresh: fetchCustomers, saveCustomer };
}

// ----------------------------------------------------
// ORDERS SERVICE & HOOK
// ----------------------------------------------------

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    initDemoStorage();
    if (!isFirebaseConfigured) {
      const stored = localStorage.getItem(STORAGE_KEYS.ORDERS);
      setOrders(stored ? JSON.parse(stored) : INITIAL_ORDERS);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const snapshot = await getDocs(query(ordersCol, orderBy('createdAt', 'desc')));
      if (snapshot.empty) {
        for (const o of INITIAL_ORDERS) {
          await setDoc(doc(db, 'orders', o.id), o);
        }
        setOrders(INITIAL_ORDERS);
      } else {
        const list = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        }));
        setOrders(list);
      }
    } catch (err) {
      console.warn('[Firestore] Falling back to local orders:', err);
      const stored = localStorage.getItem(STORAGE_KEYS.ORDERS);
      setOrders(stored ? JSON.parse(stored) : INITIAL_ORDERS);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      fetchOrders();
      return;
    }

    const unsubscribe = onSnapshot(
      query(ordersCol, orderBy('createdAt', 'desc')),
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((docSnap) => ({
            ...docSnap.data(),
            id: docSnap.id,
          }));
          setOrders(list);
          setLoading(false);
        } else {
          fetchOrders();
        }
      },
      (err) => {
        console.warn('[Firestore snapshot orders error]', err);
        fetchOrders();
      }
    );

    return () => unsubscribe();
  }, [fetchOrders]);

  /**
   * Save Order, update customer metrics, and handle automatic atomic stock movements
   */
  const saveOrder = async (
    orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    user: { uid: string; name: string }
  ): Promise<Order> => {
    const isNew = !orderData.id;
    const now = Date.now();
    const id = orderData.id || `ord-${now}-${Math.random().toString(36).substring(2, 6)}`;

    const saved: Order = {
      ...orderData,
      id,
      createdAt: (orderData as Partial<Order>).createdAt || now,
      updatedAt: now,
    };

    // If order is new and confirmed or paid upon creation, deduct stock atomically
    if (isNew && (saved.orderStatus === 'confirmed' || saved.paymentStatus === 'paid')) {
      for (const item of saved.items) {
        try {
          await recordStockMovement({
            productId: item.productId,
            sku: item.sku,
            type: 'sale',
            quantity: item.quantity,
            referenceType: 'order',
            referenceId: saved.orderNumber,
            reason: `Order #${saved.orderNumber} confirmed sale`,
            createdBy: user.name,
          });
        } catch (err) {
          console.error(`Failed to deduct stock for product ${item.productName}:`, err);
        }
      }
    }

    if (!isFirebaseConfigured) {
      const current = [...orders];
      const index = current.findIndex((o) => o.id === id);
      let updated: Order[];
      if (index !== -1) {
        updated = current.map((o) => (o.id === id ? saved : o));
      } else {
        updated = [saved, ...current];
      }
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updated));
      setOrders(updated);

      // Update customer stats
      if (saved.customerId) {
        const storedCustomers: Customer[] = JSON.parse(
          localStorage.getItem(STORAGE_KEYS.CUSTOMERS) || '[]'
        );
        const cIdx = storedCustomers.findIndex((c) => c.id === saved.customerId);
        if (cIdx !== -1) {
          storedCustomers[cIdx].totalOrders = (storedCustomers[cIdx].totalOrders || 0) + (isNew ? 1 : 0);
          storedCustomers[cIdx].totalSpent = (storedCustomers[cIdx].totalSpent || 0) + (isNew ? saved.total : 0);
          localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(storedCustomers));
        }
      }

      logActivity(
        isNew ? 'CREATE_ORDER' : 'UPDATE_ORDER',
        'order',
        id,
        `${isNew ? 'Created' : 'Updated'} order #${saved.orderNumber} for ${saved.customerName} (Rs. ${saved.total})`,
        user
      );
      return saved;
    }

    await setDoc(doc(db, 'orders', id), saved);

    // Update customer stats in Firestore
    if (saved.customerId && isNew) {
      try {
        const customerRef = doc(db, 'customers', saved.customerId);
        const custSnap = await getDocs(customersCol);
        const target = custSnap.docs.find((d) => d.id === saved.customerId);
        if (target) {
          const currentTotal = target.data().totalSpent || 0;
          const currentCount = target.data().totalOrders || 0;
          await updateDoc(customerRef, {
            totalOrders: currentCount + 1,
            totalSpent: currentTotal + saved.total,
            updatedAt: now,
          });
        }
      } catch (e) {
        console.warn('Customer stats update error:', e);
      }
    }

    await logActivity(
      isNew ? 'CREATE_ORDER' : 'UPDATE_ORDER',
      'order',
      id,
      `${isNew ? 'Created' : 'Updated'} order #${saved.orderNumber} for ${saved.customerName} (Rs. ${saved.total})`,
      user
    );
    return saved;
  };

  /**
   * Update Order status with atomic inventory adjustment (sale vs restore on cancel)
   */
  const updateOrderStatus = async (
    orderId: string,
    newStatus: Order['orderStatus'],
    user: { uid: string; name: string }
  ): Promise<void> => {
    const existing = orders.find((o) => o.id === orderId);
    if (!existing) return;

    const previousStatus = existing.orderStatus;
    if (previousStatus === newStatus) return;

    const now = Date.now();
    const updatedOrder: Order = {
      ...existing,
      orderStatus: newStatus,
      updatedAt: now,
    };

    // If order was pending and moves to confirmed -> Deduct stock
    if (previousStatus === 'pending' && (newStatus === 'confirmed' || newStatus === 'packed')) {
      for (const item of existing.items) {
        await recordStockMovement({
          productId: item.productId,
          sku: item.sku,
          type: 'sale',
          quantity: item.quantity,
          referenceType: 'order',
          referenceId: existing.orderNumber,
          reason: `Status changed to ${newStatus}: Order #${existing.orderNumber}`,
          createdBy: user.name,
        });
      }
    }

    // If order was confirmed/packed/shipped and gets cancelled or returned -> Restore stock
    if (
      (previousStatus === 'confirmed' || previousStatus === 'packed' || previousStatus === 'shipped') &&
      (newStatus === 'cancelled' || newStatus === 'returned')
    ) {
      for (const item of existing.items) {
        await recordStockMovement({
          productId: item.productId,
          sku: item.sku,
          type: newStatus === 'returned' ? 'return' : 'adjustment',
          quantity: item.quantity,
          referenceType: 'order',
          referenceId: existing.orderNumber,
          reason: `Order #${existing.orderNumber} marked ${newStatus}: Restored stock`,
          createdBy: user.name,
        });
      }
    }

    if (!isFirebaseConfigured) {
      const current = orders.map((o) => (o.id === orderId ? updatedOrder : o));
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(current));
      setOrders(current);
      logActivity(
        'ORDER_STATUS_CHANGED',
        'order',
        orderId,
        `Order #${existing.orderNumber} status changed from ${previousStatus} to ${newStatus}`,
        user
      );
      return;
    }

    await setDoc(doc(db, 'orders', orderId), updatedOrder);
    await logActivity(
      'ORDER_STATUS_CHANGED',
      'order',
      orderId,
      `Order #${existing.orderNumber} status changed from ${previousStatus} to ${newStatus}`,
      user
    );
  };

  return { orders, loading, error, refresh: fetchOrders, saveOrder, updateOrderStatus };
}

// ----------------------------------------------------
// STOCK MOVEMENTS SERVICE & HOOK
// ----------------------------------------------------

export function useStockMovements() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMovements = useCallback(async () => {
    initDemoStorage();
    if (!isFirebaseConfigured) {
      const stored = localStorage.getItem(STORAGE_KEYS.STOCK_MOVEMENTS);
      setMovements(stored ? JSON.parse(stored) : INITIAL_STOCK_MOVEMENTS);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const snapshot = await getDocs(query(stockMovementsCol, orderBy('createdAt', 'desc')));
      if (snapshot.empty) {
        for (const sm of INITIAL_STOCK_MOVEMENTS) {
          await setDoc(doc(db, 'stock_movements', sm.id), sm);
        }
        setMovements(INITIAL_STOCK_MOVEMENTS);
      } else {
        const list = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        }));
        setMovements(list);
      }
    } catch (err) {
      console.warn('[Firestore] Falling back to local stock movements:', err);
      const stored = localStorage.getItem(STORAGE_KEYS.STOCK_MOVEMENTS);
      setMovements(stored ? JSON.parse(stored) : INITIAL_STOCK_MOVEMENTS);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      fetchMovements();
      return;
    }

    const unsubscribe = onSnapshot(
      query(stockMovementsCol, orderBy('createdAt', 'desc')),
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((docSnap) => ({
            ...docSnap.data(),
            id: docSnap.id,
          }));
          setMovements(list);
          setLoading(false);
        } else {
          fetchMovements();
        }
      },
      (err) => {
        console.warn('[Firestore stock movements snapshot error]', err);
        fetchMovements();
      }
    );

    return () => unsubscribe();
  }, [fetchMovements]);

  const addStockAdjustment = async (
    adjustment: {
      productId: string;
      sku: string;
      type: StockMovementType;
      quantity: number;
      reason: string;
      createdBy: string;
    },
    user: { uid: string; name: string }
  ): Promise<StockMovement> => {
    const recorded = await recordStockMovement({
      productId: adjustment.productId,
      sku: adjustment.sku,
      type: adjustment.type,
      quantity: adjustment.quantity,
      referenceType: 'adjustment',
      reason: adjustment.reason,
      createdBy: adjustment.createdBy,
    });

    if (!isFirebaseConfigured) {
      const stored = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.STOCK_MOVEMENTS) || '[]'
      );
      const updated = [recorded, ...stored];
      localStorage.setItem(STORAGE_KEYS.STOCK_MOVEMENTS, JSON.stringify(updated));
      setMovements(updated);
    }

    await logActivity(
      'STOCK_ADJUSTMENT',
      'stock',
      adjustment.productId,
      `Stock adjustment (${adjustment.type}): ${adjustment.quantity > 0 ? '+' : ''}${adjustment.quantity} for SKU ${adjustment.sku}. Reason: ${adjustment.reason}`,
      user
    );

    return recorded;
  };

  return { movements, loading, error, refresh: fetchMovements, addStockAdjustment };
}

// ----------------------------------------------------
// INVOICES SERVICE & HOOK
// ----------------------------------------------------

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    initDemoStorage();
    if (!isFirebaseConfigured) {
      const stored = localStorage.getItem(STORAGE_KEYS.INVOICES);
      setInvoices(stored ? JSON.parse(stored) : INITIAL_INVOICES);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const snapshot = await getDocs(query(invoicesCol, orderBy('createdAt', 'desc')));
      if (snapshot.empty) {
        for (const inv of INITIAL_INVOICES) {
          await setDoc(doc(db, 'invoices', inv.id), inv);
        }
        setInvoices(INITIAL_INVOICES);
      } else {
        const list = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        }));
        setInvoices(list);
      }
    } catch (err) {
      console.warn('[Firestore] Falling back to local invoices:', err);
      const stored = localStorage.getItem(STORAGE_KEYS.INVOICES);
      setInvoices(stored ? JSON.parse(stored) : INITIAL_INVOICES);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      fetchInvoices();
      return;
    }

    const unsubscribe = onSnapshot(
      query(invoicesCol, orderBy('createdAt', 'desc')),
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((docSnap) => ({
            ...docSnap.data(),
            id: docSnap.id,
          }));
          setInvoices(list);
          setLoading(false);
        } else {
          fetchInvoices();
        }
      },
      (err) => {
        console.warn('[Firestore snapshot invoices error]', err);
        fetchInvoices();
      }
    );

    return () => unsubscribe();
  }, [fetchInvoices]);

  const saveInvoice = async (
    invoiceData: Omit<Invoice, 'id' | 'createdAt'> & { id?: string },
    user: { uid: string; name: string }
  ): Promise<Invoice> => {
    const isNew = !invoiceData.id;
    const now = Date.now();
    const id = invoiceData.id || `inv-${now}-${Math.random().toString(36).substring(2, 6)}`;
    const invoiceNumber = invoiceData.invoiceNumber || (await generateNextInvoiceNumber('INV'));

    const saved: Invoice = {
      ...invoiceData,
      id,
      invoiceNumber,
      createdAt: (invoiceData as Partial<Invoice>).createdAt || now,
    };

    if (!isFirebaseConfigured) {
      const current = [...invoices];
      const index = current.findIndex((inv) => inv.id === id);
      let updated: Invoice[];
      if (index !== -1) {
        updated = current.map((inv) => (inv.id === id ? saved : inv));
      } else {
        updated = [saved, ...current];
      }
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(updated));
      setInvoices(updated);
      logActivity(
        isNew ? 'CREATE_INVOICE' : 'UPDATE_INVOICE',
        'invoice',
        id,
        `${isNew ? 'Generated' : 'Updated'} invoice #${saved.invoiceNumber} for ${saved.customerSnapshot.name} (Rs. ${saved.total})`,
        user
      );
      return saved;
    }

    await setDoc(doc(db, 'invoices', id), saved);
    await logActivity(
      isNew ? 'CREATE_INVOICE' : 'UPDATE_INVOICE',
      'invoice',
      id,
      `${isNew ? 'Generated' : 'Updated'} invoice #${saved.invoiceNumber} for ${saved.customerSnapshot.name} (Rs. ${saved.total})`,
      user
    );
    return saved;
  };

  const recordPayment = async (
    invoiceId: string,
    paidAddition: number,
    paymentMethod: PaymentMethod,
    paymentNotes?: string,
    user: { uid: string; name: string } = { uid: 'admin', name: 'Danix Admin' }
  ): Promise<Invoice | null> => {
    const target = invoices.find((inv) => inv.id === invoiceId);
    if (!target) return null;

    const currentPaid = target.paidAmount || 0;
    const newPaidTotal = currentPaid + paidAddition;
    let newStatus: PaymentStatus = 'paid';
    if (newPaidTotal <= 0) {
      newStatus = 'unpaid';
    } else if (newPaidTotal < target.total) {
      newStatus = 'partial';
    } else {
      newStatus = 'paid';
    }

    const updatedInvoice: Invoice = {
      ...target,
      paidAmount: newPaidTotal,
      paymentStatus: newStatus,
      paymentMethod: paymentMethod || target.paymentMethod,
      notes: paymentNotes
        ? `${target.notes ? `${target.notes} | ` : ''}${paymentNotes}`
        : target.notes,
    };

    // If linked order exists, update linked order's payment status too
    if (target.orderId || target.orderNumber) {
      try {
        const storedOrders: Order[] = JSON.parse(
          localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]'
        );
        const oIdx = storedOrders.findIndex(
          (o) => o.id === target.orderId || o.orderNumber === target.orderNumber
        );
        if (oIdx !== -1) {
          storedOrders[oIdx].paymentStatus = newStatus;
          storedOrders[oIdx].paymentMethod = paymentMethod || storedOrders[oIdx].paymentMethod;
          localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(storedOrders));
        }

        if (isFirebaseConfigured && target.orderId) {
          const orderRef = doc(db, 'orders', target.orderId);
          await updateDoc(orderRef, {
            paymentStatus: newStatus,
            paymentMethod: paymentMethod || target.paymentMethod,
            updatedAt: Date.now(),
          });
        }
      } catch (err) {
        console.warn('Could not sync payment status to linked order:', err);
      }
    }

    if (!isFirebaseConfigured) {
      const current = invoices.map((inv) => (inv.id === invoiceId ? updatedInvoice : inv));
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(current));
      setInvoices(current);
      logActivity(
        'RECORD_PAYMENT',
        'invoice',
        invoiceId,
        `Recorded payment of Rs. ${paidAddition} for invoice #${target.invoiceNumber}. New status: ${newStatus}`,
        user
      );
      return updatedInvoice;
    }

    await setDoc(doc(db, 'invoices', invoiceId), updatedInvoice);
    await logActivity(
      'RECORD_PAYMENT',
      'invoice',
      invoiceId,
      `Recorded payment of Rs. ${paidAddition} for invoice #${target.invoiceNumber}. New status: ${newStatus}`,
      user
    );
    return updatedInvoice;
  };

  const deleteInvoice = async (id: string, user: { uid: string; name: string }): Promise<void> => {
    const target = invoices.find((inv) => inv.id === id);
    if (!isFirebaseConfigured) {
      const updated = invoices.filter((inv) => inv.id !== id);
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(updated));
      setInvoices(updated);
      logActivity(
        'DELETE_INVOICE',
        'invoice',
        id,
        `Deleted invoice #${target?.invoiceNumber || id}`,
        user
      );
      return;
    }

    await deleteDoc(doc(db, 'invoices', id));
    await logActivity(
      'DELETE_INVOICE',
      'invoice',
      id,
      `Deleted invoice #${target?.invoiceNumber || id}`,
      user
    );
  };

  return {
    invoices,
    loading,
    error,
    refresh: fetchInvoices,
    saveInvoice,
    recordPayment,
    deleteInvoice,
  };
}

// ----------------------------------------------------
// DELIVERIES SERVICE & HOOK
// ----------------------------------------------------

export function useDeliveries() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeliveries = useCallback(async () => {
    initDemoStorage();
    if (!isFirebaseConfigured) {
      const stored = localStorage.getItem(STORAGE_KEYS.DELIVERIES);
      setDeliveries(stored ? JSON.parse(stored) : INITIAL_DELIVERIES);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const snapshot = await getDocs(query(deliveriesCol, orderBy('createdAt', 'desc')));
      if (snapshot.empty) {
        for (const del of INITIAL_DELIVERIES) {
          await setDoc(doc(db, 'deliveries', del.id), del);
        }
        setDeliveries(INITIAL_DELIVERIES);
      } else {
        const list = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        }));
        setDeliveries(list);
      }
    } catch (err) {
      console.warn('[Firestore] Falling back to local deliveries:', err);
      const stored = localStorage.getItem(STORAGE_KEYS.DELIVERIES);
      setDeliveries(stored ? JSON.parse(stored) : INITIAL_DELIVERIES);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      fetchDeliveries();
      return;
    }

    const unsubscribe = onSnapshot(
      query(deliveriesCol, orderBy('createdAt', 'desc')),
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((docSnap) => ({
            ...docSnap.data(),
            id: docSnap.id,
          }));
          setDeliveries(list);
          setLoading(false);
        } else {
          fetchDeliveries();
        }
      },
      (err) => {
        console.warn('[Firestore snapshot deliveries error]', err);
        fetchDeliveries();
      }
    );

    return () => unsubscribe();
  }, [fetchDeliveries]);

  // Synchronize linked order when delivery status changes
  const syncLinkedOrder = async (
    orderIdOrNum: string | undefined,
    deliveryStatus: DeliveryStatus
  ) => {
    if (!orderIdOrNum) return;
    try {
      const storedOrders: Order[] = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]'
      );
      const oIdx = storedOrders.findIndex(
        (o) => o.id === orderIdOrNum || o.orderNumber === orderIdOrNum
      );
      if (oIdx !== -1) {
        storedOrders[oIdx].deliveryStatus = deliveryStatus;
        if (deliveryStatus === 'delivered') {
          storedOrders[oIdx].orderStatus = 'delivered';
        } else if (deliveryStatus === 'dispatched' || deliveryStatus === 'in_transit') {
          storedOrders[oIdx].orderStatus = 'shipped';
        } else if (deliveryStatus === 'returned') {
          storedOrders[oIdx].orderStatus = 'returned';
        }
        storedOrders[oIdx].updatedAt = Date.now();
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(storedOrders));
      }

      if (isFirebaseConfigured) {
        const orderId = storedOrders[oIdx]?.id || orderIdOrNum;
        const orderRef = doc(db, 'orders', orderId);
        const updates: Partial<Order> = {
          deliveryStatus,
          updatedAt: Date.now(),
        };
        if (deliveryStatus === 'delivered') updates.orderStatus = 'delivered';
        else if (deliveryStatus === 'dispatched' || deliveryStatus === 'in_transit') updates.orderStatus = 'shipped';
        else if (deliveryStatus === 'returned') updates.orderStatus = 'returned';
        await updateDoc(orderRef, updates);
      }
    } catch (err) {
      console.warn('Error syncing linked order status:', err);
    }
  };

  const saveDelivery = async (
    deliveryData: Omit<Delivery, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    user: { uid: string; name: string }
  ): Promise<Delivery> => {
    const isNew = !deliveryData.id;
    const now = Date.now();
    const id = deliveryData.id || `del-${now}-${Math.random().toString(36).substring(2, 6)}`;

    const saved: Delivery = {
      ...deliveryData,
      id,
      createdAt: (deliveryData as Partial<Delivery>).createdAt || now,
      updatedAt: now,
    };

    // Auto sync linked order if status changed
    await syncLinkedOrder(saved.orderId || saved.orderNumber, saved.status);

    if (!isFirebaseConfigured) {
      const current = [...deliveries];
      const index = current.findIndex((del) => del.id === id);
      let updated: Delivery[];
      if (index !== -1) {
        updated = current.map((del) => (del.id === id ? saved : del));
      } else {
        updated = [saved, ...current];
      }
      localStorage.setItem(STORAGE_KEYS.DELIVERIES, JSON.stringify(updated));
      setDeliveries(updated);
      logActivity(
        isNew ? 'CREATE_DELIVERY' : 'UPDATE_DELIVERY',
        'delivery',
        id,
        `${isNew ? 'Created' : 'Updated'} delivery for Order #${saved.orderNumber || saved.orderId} via ${saved.courier} (Tracking: ${saved.trackingNumber || 'N/A'})`,
        user
      );
      return saved;
    }

    await setDoc(doc(db, 'deliveries', id), saved);
    await logActivity(
      isNew ? 'CREATE_DELIVERY' : 'UPDATE_DELIVERY',
      'delivery',
      id,
      `${isNew ? 'Created' : 'Updated'} delivery for Order #${saved.orderNumber || saved.orderId} via ${saved.courier} (Tracking: ${saved.trackingNumber || 'N/A'})`,
      user
    );
    return saved;
  };

  const updateDeliveryStatus = async (
    deliveryId: string,
    newStatus: DeliveryStatus,
    user: { uid: string; name: string }
  ): Promise<void> => {
    const target = deliveries.find((del) => del.id === deliveryId);
    if (!target) return;

    const now = Date.now();
    const updated: Delivery = {
      ...target,
      status: newStatus,
      updatedAt: now,
      dispatchedAt:
        newStatus === 'dispatched' || newStatus === 'in_transit'
          ? target.dispatchedAt || now
          : target.dispatchedAt,
      deliveredAt: newStatus === 'delivered' ? now : target.deliveredAt,
    };

    // Auto sync linked order if delivered or status changed
    await syncLinkedOrder(target.orderId || target.orderNumber, newStatus);

    if (!isFirebaseConfigured) {
      const current = deliveries.map((del) => (del.id === deliveryId ? updated : del));
      localStorage.setItem(STORAGE_KEYS.DELIVERIES, JSON.stringify(current));
      setDeliveries(current);
      logActivity(
        'DELIVERY_STATUS_CHANGED',
        'delivery',
        deliveryId,
        `Delivery for Order #${target.orderNumber || target.orderId} marked ${newStatus}`,
        user
      );
      return;
    }

    await setDoc(doc(db, 'deliveries', deliveryId), updated);
    await logActivity(
      'DELIVERY_STATUS_CHANGED',
      'delivery',
      deliveryId,
      `Delivery for Order #${target.orderNumber || target.orderId} marked ${newStatus}`,
      user
    );
  };

  const deleteDelivery = async (id: string, user: { uid: string; name: string }): Promise<void> => {
    const target = deliveries.find((del) => del.id === id);
    if (!isFirebaseConfigured) {
      const updated = deliveries.filter((del) => del.id !== id);
      localStorage.setItem(STORAGE_KEYS.DELIVERIES, JSON.stringify(updated));
      setDeliveries(updated);
      logActivity(
        'DELETE_DELIVERY',
        'delivery',
        id,
        `Deleted delivery for Order #${target?.orderNumber || target?.orderId || id}`,
        user
      );
      return;
    }

    await deleteDoc(doc(db, 'deliveries', id));
    await logActivity(
      'DELETE_DELIVERY',
      'delivery',
      id,
      `Deleted delivery for Order #${target?.orderNumber || target?.orderId || id}`,
      user
    );
  };

  return {
    deliveries,
    loading,
    error,
    refresh: fetchDeliveries,
    fetchDeliveries,
    saveDelivery,
    updateDeliveryStatus,
    deleteDelivery,
  };
}
