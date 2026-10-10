import { useState, useEffect, useCallback } from 'react';
import {
  getDocs,
  doc,
  getDoc,
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
  categoriesCol,
  customersCol,
  ordersCol,
  invoicesCol,
  deliveriesCol,
  stockMovementsCol,
  recordStockMovement,
  generateNextInvoiceNumber,
  generateNextCategorySku,
  DEFAULT_PREDEFINED_CATEGORIES,
  sanitizeSkuPrefix,
  logActivity,
  sanitizeForFirestore,
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
  ProductCategory,
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
  CATEGORIES: 'danix_mock_categories',
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
  if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_PREDEFINED_CATEGORIES));
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

// Track collections seeded during this session to prevent repeated seeding loops
const seededCollections = new Set<string>();

// ----------------------------------------------------
// SINGLETON SUBSCRIPTION & CACHE QUOTA MANAGEMENT
// ----------------------------------------------------

export type CacheDomain = 'all' | 'orders' | 'products' | 'deliveries' | 'expenses' | 'settings' | 'logs';
type CacheInvalidator = (domain?: CacheDomain) => void;
const cacheInvalidators = new Set<CacheInvalidator>();

export function registerCacheInvalidator(fn: CacheInvalidator): () => void {
  cacheInvalidators.add(fn);
  return () => {
    cacheInvalidators.delete(fn);
  };
}

export function invalidateDataCache(domain: CacheDomain = 'all'): void {
  cacheInvalidators.forEach((fn) => {
    try {
      fn(domain);
    } catch (e) {
      console.warn('[CacheManager] Error in invalidator:', e);
    }
  });
}

class LiveCollectionManager<T> {
  private data: T[] | null = null;
  private subscribers = new Set<(items: T[]) => void>();
  private unsubscribe: (() => void) | null = null;
  private teardownTimer: ReturnType<typeof setTimeout> | null = null;
  private colRef: any;
  private processSnapshot: (docs: any[]) => T[];
  private storageKey: string;
  private fallbackInitial: T[];

  constructor(
    colRef: any,
    processSnapshot: (docs: any[]) => T[],
    storageKey: string,
    fallbackInitial: T[]
  ) {
    this.colRef = colRef;
    this.processSnapshot = processSnapshot;
    this.storageKey = storageKey;
    this.fallbackInitial = fallbackInitial;
  }

  public getLive(): T[] | null {
    return this.data;
  }

  public subscribe(onUpdate: (items: T[]) => void): () => void {
    this.subscribers.add(onUpdate);

    if (this.teardownTimer) {
      clearTimeout(this.teardownTimer);
      this.teardownTimer = null;
    }

    if (this.data !== null) {
      onUpdate(this.data);
    }

    if (!this.unsubscribe && isFirebaseConfigured) {
      try {
        this.unsubscribe = onSnapshot(
          this.colRef,
          (snapshot: any) => {
            const list = this.processSnapshot(snapshot.docs);
            this.data = list;
            try {
              localStorage.setItem(this.storageKey, JSON.stringify(list));
            } catch {}
            this.subscribers.forEach((sub) => sub(list));
          },
          (err: any) => {
            console.warn(`[LiveStore ${this.storageKey}] Snapshot inactive:`, err);
            const stored = localStorage.getItem(this.storageKey);
            const fallback = stored ? JSON.parse(stored) : this.fallbackInitial;
            this.data = fallback;
            this.subscribers.forEach((sub) => sub(fallback));
          }
        );
      } catch (err) {
        console.warn(`[LiveStore ${this.storageKey}] Subscription error:`, err);
      }
    }

    return () => {
      this.subscribers.delete(onUpdate);
      // Grace period of 45s keeps the warm connection alive across tab/navigation switches
      if (this.subscribers.size === 0 && this.unsubscribe) {
        this.teardownTimer = setTimeout(() => {
          if (this.subscribers.size === 0 && this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
          }
        }, 45000);
      }
    };
  }

  public updateMemory(updater: (current: T[]) => T[]) {
    const current = this.data || this.fallbackInitial;
    const updated = updater(current);
    this.data = updated;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(updated));
    } catch {}
    this.subscribers.forEach((sub) => sub(updated));
  }
}

const productsStore = new LiveCollectionManager<Product>(
  productsCol,
  (docs) => docs.map((d) => ({ ...d.data(), id: d.id } as Product)),
  STORAGE_KEYS.PRODUCTS,
  INITIAL_PRODUCTS
);

const categoriesStore = new LiveCollectionManager<ProductCategory>(
  categoriesCol,
  (docs) => {
    const list = docs.map((d) => ({ ...d.data(), id: d.id } as ProductCategory));
    const existingMap = new Map(list.map((c) => [c.id, c]));
    for (const pre of DEFAULT_PREDEFINED_CATEGORIES) {
      if (!existingMap.has(pre.id) && !list.some((c) => c.name.toLowerCase() === pre.name.toLowerCase())) {
        list.push(pre);
      }
    }
    return list;
  },
  STORAGE_KEYS.CATEGORIES,
  DEFAULT_PREDEFINED_CATEGORIES
);

const customersStore = new LiveCollectionManager<Customer>(
  customersCol,
  (docs) => docs.map((d) => ({ ...d.data(), id: d.id } as Customer)),
  STORAGE_KEYS.CUSTOMERS,
  INITIAL_CUSTOMERS
);

const ordersStore = new LiveCollectionManager<Order>(
  query(ordersCol, orderBy('createdAt', 'desc')),
  (docs) => docs.map((d) => ({ ...d.data(), id: d.id } as Order)),
  STORAGE_KEYS.ORDERS,
  INITIAL_ORDERS
);

const stockMovementsStore = new LiveCollectionManager<StockMovement>(
  query(stockMovementsCol, orderBy('createdAt', 'desc')),
  (docs) => docs.map((d) => ({ ...d.data(), id: d.id } as StockMovement)),
  STORAGE_KEYS.STOCK_MOVEMENTS,
  INITIAL_STOCK_MOVEMENTS
);

const invoicesStore = new LiveCollectionManager<Invoice>(
  query(invoicesCol, orderBy('createdAt', 'desc')),
  (docs) => docs.map((d) => ({ ...d.data(), id: d.id } as Invoice)),
  STORAGE_KEYS.INVOICES,
  INITIAL_INVOICES
);

const deliveriesStore = new LiveCollectionManager<Delivery>(
  query(deliveriesCol, orderBy('createdAt', 'desc')),
  (docs) => docs.map((d) => ({ ...d.data(), id: d.id } as Delivery)),
  STORAGE_KEYS.DELIVERIES,
  INITIAL_DELIVERIES
);

// Export memory getters for metric calculations without Firestore reads
export function getLiveProducts(): Product[] | null {
  return productsStore.getLive();
}
export function getLiveCategories(): ProductCategory[] | null {
  return categoriesStore.getLive();
}
export function getLiveCustomers(): Customer[] | null {
  return customersStore.getLive();
}
export function getLiveOrders(): Order[] | null {
  return ordersStore.getLive();
}
export function getLiveDeliveries(): Delivery[] | null {
  return deliveriesStore.getLive();
}
export function getLiveInvoices(): Invoice[] | null {
  return invoicesStore.getLive();
}
export function getLiveStockMovements(): StockMovement[] | null {
  return stockMovementsStore.getLive();
}

// ----------------------------------------------------
// PRODUCTS SERVICE & HOOK
// ----------------------------------------------------

export function useProducts() {
  const [products, setProducts] = useState<Product[]>(() => {
    initDemoStorage();
    if (productsStore.getLive() !== null) return productsStore.getLive()!;
    if (typeof window === 'undefined') return INITIAL_PRODUCTS;
    const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return stored ? JSON.parse(stored) : INITIAL_PRODUCTS;
  });
  const [loading, setLoading] = useState<boolean>(productsStore.getLive() === null);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    initDemoStorage();
    if (!isFirebaseConfigured) {
      const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      setProducts(stored ? JSON.parse(stored) : INITIAL_PRODUCTS);
      setLoading(false);
      return;
    }
    if (productsStore.getLive() !== null) {
      setProducts(productsStore.getLive()!);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      fetchProducts();
      return;
    }

    const unsub = productsStore.subscribe((items) => {
      setProducts(items);
      setLoading(false);
    });

    return () => unsub();
  }, [fetchProducts]);

  const saveProduct = async (
    product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    user: { uid: string; name: string }
  ): Promise<Product> => {
    const isNew = !product.id;
    const now = Date.now();
    const id = product.id || `prod-${now}-${Math.random().toString(36).substring(2, 6)}`;

    // Automatic Category-Based SKU allocation for new products (Preserves existing product SKUs 100%)
    let finalSku = (product.sku || '').trim().toUpperCase();
    if (isNew) {
      const hasCollision = products.some((p) => p.sku.trim().toUpperCase() === finalSku);
      if (!finalSku || hasCollision) {
        finalSku = await generateNextCategorySku(product.category, products);
      }
    }

    const saved: Product = {
      ...product,
      sku: finalSku,
      id,
      createdAt: (product as Partial<Product>).createdAt || now,
      updatedAt: now,
    };

    // 1. Optimistic local persistence & memory update
    const current = [...products];
    const index = current.findIndex((p) => p.id === id);
    const updated = index !== -1 ? current.map((p) => (p.id === id ? saved : p)) : [saved, ...current];
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));
    setProducts(updated);
    productsStore.updateMemory((curr) => {
      const idx = curr.findIndex((p) => p.id === id);
      return idx !== -1 ? curr.map((p) => (p.id === id ? saved : p)) : [saved, ...curr];
    });
    invalidateDataCache('products');

    // 2. Cloud Firestore sync
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'products', id), sanitizeForFirestore(saved));
        await logActivity(
          isNew ? 'CREATE_PRODUCT' : 'UPDATE_PRODUCT',
          'product',
          id,
          `${isNew ? 'Created' : 'Updated'} product: ${saved.name} (SKU: ${saved.sku})`,
          user
        );
      } catch (fbErr) {
        console.warn('[Firestore Sync] Product write deferred to local storage:', fbErr);
      }
    } else {
      logActivity(
        isNew ? 'CREATE_PRODUCT' : 'UPDATE_PRODUCT',
        'product',
        id,
        `${isNew ? 'Created' : 'Updated'} product: ${saved.name} (SKU: ${saved.sku})`,
        user
      );
    }

    return saved;
  };

  const deleteProduct = async (id: string, user: { uid: string; name: string }): Promise<void> => {
    const target = products.find((p) => p.id === id);
    const updated = products.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));
    setProducts(updated);
    productsStore.updateMemory((curr) => curr.filter((p) => p.id !== id));
    invalidateDataCache('products');

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'products', id));
        await logActivity(
          'DELETE_PRODUCT',
          'product',
          id,
          `Deleted product ${target?.name || id} (SKU: ${target?.sku || 'N/A'})`,
          user
        );
      } catch (fbErr) {
        console.warn('[Firestore Sync] Product delete deferred:', fbErr);
      }
    } else {
      logActivity(
        'DELETE_PRODUCT',
        'product',
        id,
        `Deleted product ${target?.name || id} (SKU: ${target?.sku || 'N/A'})`,
        user
      );
    }
  };

  return { products, loading, error, refresh: fetchProducts, saveProduct, deleteProduct };
}

// ----------------------------------------------------
// DYNAMIC CATEGORIES SERVICE & HOOK
// ----------------------------------------------------

export function useCategories() {
  const [categories, setCategories] = useState<ProductCategory[]>(() => {
    initDemoStorage();
    if (categoriesStore.getLive() !== null) return categoriesStore.getLive()!;
    if (typeof window === 'undefined') return DEFAULT_PREDEFINED_CATEGORIES;
    const stored = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    return stored ? JSON.parse(stored) : DEFAULT_PREDEFINED_CATEGORIES;
  });
  const [loading, setLoading] = useState<boolean>(categoriesStore.getLive() === null);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    initDemoStorage();
    if (!isFirebaseConfigured) {
      const stored = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      setCategories(stored ? JSON.parse(stored) : DEFAULT_PREDEFINED_CATEGORIES);
      setLoading(false);
      return;
    }
    if (categoriesStore.getLive() !== null) {
      setCategories(categoriesStore.getLive()!);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      fetchCategories();
      return;
    }

    const unsub = categoriesStore.subscribe((items) => {
      setCategories(items);
      setLoading(false);
    });

    return () => unsub();
  }, [fetchCategories]);

  const saveCategory = async (
    categoryData: Omit<ProductCategory, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    user: { uid: string; name: string }
  ): Promise<ProductCategory> => {
    const isNew = !categoryData.id;
    const now = Date.now();
    const cleanPrefix = sanitizeSkuPrefix(categoryData.skuPrefix || categoryData.name);
    const cleanName = categoryData.name.trim();

    if (!cleanName) {
      throw new Error('Category name is required.');
    }

    if (!cleanPrefix) {
      throw new Error('Unique SKU prefix is required.');
    }

    // Unique category name check
    const dupName = categories.find(
      (c) => c.name.toLowerCase() === cleanName.toLowerCase() && c.id !== categoryData.id
    );
    if (dupName) {
      throw new Error(`Category "${cleanName}" already exists.`);
    }

    // Unique SKU prefix check
    const dupPrefix = categories.find(
      (c) => c.skuPrefix.toUpperCase() === cleanPrefix && c.id !== categoryData.id
    );
    if (dupPrefix) {
      throw new Error(`SKU prefix "${cleanPrefix}" is already in use by category "${dupPrefix.name}".`);
    }

    const id = categoryData.id || `cat-${now}-${Math.random().toString(36).substring(2, 6)}`;
    const saved: ProductCategory = {
      ...categoryData,
      id,
      name: cleanName,
      skuPrefix: cleanPrefix,
      active: categoryData.active !== undefined ? categoryData.active : true,
      createdAt: (categoryData as Partial<ProductCategory>).createdAt || now,
      updatedAt: now,
    };

    // 1. Optimistic local persistence & memory update
    const current = [...categories];
    const index = current.findIndex((c) => c.id === id);
    const updated = index !== -1 ? current.map((c) => (c.id === id ? saved : c)) : [saved, ...current];
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updated));
    setCategories(updated);
    categoriesStore.updateMemory((curr) => {
      const idx = curr.findIndex((c) => c.id === id);
      return idx !== -1 ? curr.map((c) => (c.id === id ? saved : c)) : [saved, ...curr];
    });
    invalidateDataCache('products');

    // 2. Cloud Firestore sync
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'categories', id), sanitizeForFirestore(saved));
        await logActivity(
          isNew ? 'CREATE_CATEGORY' : 'UPDATE_CATEGORY',
          'category',
          id,
          `${isNew ? 'Created' : 'Updated'} category: ${saved.name} (Prefix: ${saved.skuPrefix})`,
          user
        );
      } catch (fbErr) {
        console.warn('[Firestore Sync] Category write deferred to local storage:', fbErr);
      }
    } else {
      logActivity(
        isNew ? 'CREATE_CATEGORY' : 'UPDATE_CATEGORY',
        'category',
        id,
        `${isNew ? 'Created' : 'Updated'} category: ${saved.name} (Prefix: ${saved.skuPrefix})`,
        user
      );
    }

    return saved;
  };

  const toggleCategoryActive = async (
    id: string,
    user: { uid: string; name: string }
  ): Promise<void> => {
    const target = categories.find((c) => c.id === id);
    if (!target) return;

    const newActive = !target.active;
    const now = Date.now();
    const updatedCategory: ProductCategory = {
      ...target,
      active: newActive,
      updatedAt: now,
    };

    const updated = categories.map((c) => (c.id === id ? updatedCategory : c));
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updated));
    setCategories(updated);
    categoriesStore.updateMemory((curr) => curr.map((c) => (c.id === id ? updatedCategory : c)));
    invalidateDataCache('products');

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'categories', id), sanitizeForFirestore(updatedCategory), { merge: true });
        await logActivity(
          'UPDATE_CATEGORY',
          'category',
          id,
          `${newActive ? 'Activated' : 'Deactivated'} category: ${target.name}`,
          user
        );
      } catch (fbErr) {
        console.warn('[Firestore Sync] Category toggle deferred:', fbErr);
      }
    } else {
      logActivity(
        'UPDATE_CATEGORY',
        'category',
        id,
        `${newActive ? 'Activated' : 'Deactivated'} category: ${target.name}`,
        user
      );
    }
  };

  const deleteCategory = async (
    id: string,
    user: { uid: string; name: string }
  ): Promise<void> => {
    const target = categories.find((c) => c.id === id);
    if (!target) return;

    // Protection: verify no existing products are assigned to this category
    const liveProducts = getLiveProducts() || [];
    const assignedCount = liveProducts.filter((p) => p.category?.toLowerCase() === target.name.toLowerCase()).length;
    if (assignedCount > 0) {
      throw new Error(
        `Cannot delete "${target.name}" because ${assignedCount} product(s) are currently assigned to this category. Please reassign or delete those products first.`
      );
    }

    const updated = categories.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updated));
    setCategories(updated);
    categoriesStore.updateMemory((curr) => curr.filter((c) => c.id !== id));
    invalidateDataCache('products');

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'categories', id));
        await logActivity(
          'DELETE_CATEGORY',
          'category',
          id,
          `Deleted category: ${target.name} (SKU Prefix: ${target.skuPrefix})`,
          user
        );
      } catch (fbErr) {
        console.warn('[Firestore Sync] Category delete deferred:', fbErr);
      }
    } else {
      logActivity(
        'DELETE_CATEGORY',
        'category',
        id,
        `Deleted category: ${target.name} (SKU Prefix: ${target.skuPrefix})`,
        user
      );
    }
  };

  return {
    categories,
    loading,
    error,
    saveCategory,
    toggleCategoryActive,
    deleteCategory,
    refresh: fetchCategories,
  };
}

// ----------------------------------------------------
// CUSTOMERS SERVICE & HOOK
// ----------------------------------------------------

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>(() => {
    initDemoStorage();
    if (customersStore.getLive() !== null) return customersStore.getLive()!;
    if (typeof window === 'undefined') return INITIAL_CUSTOMERS;
    const stored = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return stored ? JSON.parse(stored) : INITIAL_CUSTOMERS;
  });
  const [loading, setLoading] = useState<boolean>(customersStore.getLive() === null);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    initDemoStorage();
    if (!isFirebaseConfigured) {
      const stored = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      setCustomers(stored ? JSON.parse(stored) : INITIAL_CUSTOMERS);
      setLoading(false);
      return;
    }
    if (customersStore.getLive() !== null) {
      setCustomers(customersStore.getLive()!);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      fetchCustomers();
      return;
    }

    const unsub = customersStore.subscribe((items) => {
      setCustomers(items);
      setLoading(false);
    });

    return () => unsub();
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

    // 1. Optimistic local persistence & memory update
    const current = [...customers];
    const index = current.findIndex((c) => c.id === id);
    const updated = index !== -1 ? current.map((c) => (c.id === id ? saved : c)) : [saved, ...current];
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updated));
    setCustomers(updated);
    customersStore.updateMemory((curr) => {
      const idx = curr.findIndex((c) => c.id === id);
      return idx !== -1 ? curr.map((c) => (c.id === id ? saved : c)) : [saved, ...curr];
    });
    invalidateDataCache('orders');

    // 2. Cloud Firestore sync
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'customers', id), sanitizeForFirestore(saved));
        await logActivity(
          isNew ? 'CREATE_CUSTOMER' : 'UPDATE_CUSTOMER',
          'customer',
          id,
          `${isNew ? 'Added' : 'Updated'} customer: ${saved.name} (${saved.phone})`,
          user
        );
      } catch (fbErr) {
        console.warn('[Firestore Sync] Customer write deferred to local storage:', fbErr);
      }
    } else {
      logActivity(
        isNew ? 'CREATE_CUSTOMER' : 'UPDATE_CUSTOMER',
        'customer',
        id,
        `${isNew ? 'Added' : 'Updated'} customer: ${saved.name} (${saved.phone})`,
        user
      );
    }

    return saved;
  };

  return { customers, loading, error, refresh: fetchCustomers, saveCustomer };
}

// ----------------------------------------------------
// ORDERS SERVICE & HOOK
// ----------------------------------------------------

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>(() => {
    initDemoStorage();
    if (ordersStore.getLive() !== null) return ordersStore.getLive()!;
    if (typeof window === 'undefined') return INITIAL_ORDERS;
    const stored = localStorage.getItem(STORAGE_KEYS.ORDERS);
    return stored ? JSON.parse(stored) : INITIAL_ORDERS;
  });
  const [loading, setLoading] = useState<boolean>(ordersStore.getLive() === null);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    initDemoStorage();
    if (!isFirebaseConfigured) {
      const stored = localStorage.getItem(STORAGE_KEYS.ORDERS);
      setOrders(stored ? JSON.parse(stored) : INITIAL_ORDERS);
      setLoading(false);
      return;
    }
    if (ordersStore.getLive() !== null) {
      setOrders(ordersStore.getLive()!);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      fetchOrders();
      return;
    }

    const unsub = ordersStore.subscribe((items) => {
      setOrders(items);
      setLoading(false);
    });

    return () => unsub();
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

    // 1. Optimistic local persistence & memory update
    const current = [...orders];
    const index = current.findIndex((o) => o.id === id);
    const updated = index !== -1 ? current.map((o) => (o.id === id ? saved : o)) : [saved, ...current];
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updated));
    setOrders(updated);
    ordersStore.updateMemory((curr) => {
      const idx = curr.findIndex((o) => o.id === id);
      return idx !== -1 ? curr.map((o) => (o.id === id ? saved : o)) : [saved, ...curr];
    });
    invalidateDataCache('orders');

    // Update customer stats locally
    if (saved.customerId) {
      const storedCustomers: Customer[] = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.CUSTOMERS) || '[]'
      );
      const cIdx = storedCustomers.findIndex((c) => c.id === saved.customerId);
      if (cIdx !== -1) {
        storedCustomers[cIdx].totalOrders = (storedCustomers[cIdx].totalOrders || 0) + (isNew ? 1 : 0);
        storedCustomers[cIdx].totalSpent = (storedCustomers[cIdx].totalSpent || 0) + (isNew ? saved.total : 0);
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(storedCustomers));
        customersStore.updateMemory((curr) => {
          const idx = curr.findIndex((c) => c.id === saved.customerId);
          if (idx === -1) return curr;
          return curr.map((c) => (c.id === saved.customerId ? storedCustomers[cIdx] : c));
        });
      }
    }

    // 2. Cloud Firestore sync
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'orders', id), sanitizeForFirestore(saved));

        if (saved.customerId && isNew) {
          try {
            const customerRef = doc(db, 'customers', saved.customerId);
            const custDoc = await getDoc(customerRef);
            if (custDoc.exists()) {
              const cData = custDoc.data();
              const currentTotal = cData.totalSpent || 0;
              const currentCount = cData.totalOrders || 0;
              await updateDoc(customerRef, sanitizeForFirestore({
                totalOrders: currentCount + 1,
                totalSpent: currentTotal + saved.total,
                updatedAt: now,
              }));
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
      } catch (fbErr) {
        console.warn('[Firestore Sync] Order write deferred to local storage:', fbErr);
      }
    } else {
      logActivity(
        isNew ? 'CREATE_ORDER' : 'UPDATE_ORDER',
        'order',
        id,
        `${isNew ? 'Created' : 'Updated'} order #${saved.orderNumber} for ${saved.customerName} (Rs. ${saved.total})`,
        user
      );
    }

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

    // 1. Optimistic local update
    const current = orders.map((o) => (o.id === orderId ? updatedOrder : o));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(current));
    setOrders(current);
    ordersStore.updateMemory((curr) => curr.map((o) => (o.id === orderId ? updatedOrder : o)));
    invalidateDataCache('orders');

    // 2. Cloud Firestore sync
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'orders', orderId), sanitizeForFirestore(updatedOrder));
        await logActivity(
          'ORDER_STATUS_CHANGED',
          'order',
          orderId,
          `Order #${existing.orderNumber} status changed from ${previousStatus} to ${newStatus}`,
          user
        );
      } catch (fbErr) {
        console.warn('[Firestore Sync] Order status update deferred to local storage:', fbErr);
      }
    } else {
      logActivity(
        'ORDER_STATUS_CHANGED',
        'order',
        orderId,
        `Order #${existing.orderNumber} status changed from ${previousStatus} to ${newStatus}`,
        user
      );
    }
  };

  return { orders, loading, error, refresh: fetchOrders, saveOrder, updateOrderStatus };
}

// ----------------------------------------------------
// STOCK MOVEMENTS SERVICE & HOOK
// ----------------------------------------------------

export function useStockMovements() {
  const [movements, setMovements] = useState<StockMovement[]>(() => {
    initDemoStorage();
    if (stockMovementsStore.getLive() !== null) return stockMovementsStore.getLive()!;
    if (typeof window === 'undefined') return INITIAL_STOCK_MOVEMENTS;
    const stored = localStorage.getItem(STORAGE_KEYS.STOCK_MOVEMENTS);
    return stored ? JSON.parse(stored) : INITIAL_STOCK_MOVEMENTS;
  });
  const [loading, setLoading] = useState<boolean>(stockMovementsStore.getLive() === null);
  const [error, setError] = useState<string | null>(null);

  const fetchMovements = useCallback(async () => {
    initDemoStorage();
    if (!isFirebaseConfigured) {
      const stored = localStorage.getItem(STORAGE_KEYS.STOCK_MOVEMENTS);
      setMovements(stored ? JSON.parse(stored) : INITIAL_STOCK_MOVEMENTS);
      setLoading(false);
      return;
    }
    if (stockMovementsStore.getLive() !== null) {
      setMovements(stockMovementsStore.getLive()!);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      fetchMovements();
      return;
    }

    const unsub = stockMovementsStore.subscribe((items) => {
      setMovements(items);
      setLoading(false);
    });

    return () => unsub();
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

    stockMovementsStore.updateMemory((curr) => [recorded, ...curr]);
    invalidateDataCache('products');

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
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    initDemoStorage();
    if (invoicesStore.getLive() !== null) return invoicesStore.getLive()!;
    if (typeof window === 'undefined') return INITIAL_INVOICES;
    const stored = localStorage.getItem(STORAGE_KEYS.INVOICES);
    return stored ? JSON.parse(stored) : INITIAL_INVOICES;
  });
  const [loading, setLoading] = useState<boolean>(invoicesStore.getLive() === null);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    initDemoStorage();
    if (!isFirebaseConfigured) {
      const stored = localStorage.getItem(STORAGE_KEYS.INVOICES);
      setInvoices(stored ? JSON.parse(stored) : INITIAL_INVOICES);
      setLoading(false);
      return;
    }
    if (invoicesStore.getLive() !== null) {
      setInvoices(invoicesStore.getLive()!);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      fetchInvoices();
      return;
    }

    const unsub = invoicesStore.subscribe((items) => {
      setInvoices(items);
      setLoading(false);
    });

    return () => unsub();
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

    // 1. Optimistic local persistence & memory update
    const current = [...invoices];
    const index = current.findIndex((inv) => inv.id === id);
    const updated = index !== -1 ? current.map((inv) => (inv.id === id ? saved : inv)) : [saved, ...current];
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(updated));
    setInvoices(updated);
    invoicesStore.updateMemory((curr) => {
      const idx = curr.findIndex((inv) => inv.id === id);
      return idx !== -1 ? curr.map((inv) => (inv.id === id ? saved : inv)) : [saved, ...curr];
    });
    invalidateDataCache('orders');

    // 2. Cloud Firestore sync
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'invoices', id), sanitizeForFirestore(saved));
        await logActivity(
          isNew ? 'CREATE_INVOICE' : 'UPDATE_INVOICE',
          'invoice',
          id,
          `${isNew ? 'Generated' : 'Updated'} invoice #${saved.invoiceNumber} for ${saved.customerSnapshot.name} (Rs. ${saved.total})`,
          user
        );
      } catch (fbErr) {
        console.warn('[Firestore Sync] Invoice write deferred to local storage:', fbErr);
      }
    } else {
      logActivity(
        isNew ? 'CREATE_INVOICE' : 'UPDATE_INVOICE',
        'invoice',
        id,
        `${isNew ? 'Generated' : 'Updated'} invoice #${saved.invoiceNumber} for ${saved.customerSnapshot.name} (Rs. ${saved.total})`,
        user
      );
    }

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
          await updateDoc(orderRef, sanitizeForFirestore({
            paymentStatus: newStatus,
            paymentMethod: paymentMethod || target.paymentMethod,
            updatedAt: Date.now(),
          }));
        }
      } catch (err) {
        console.warn('Could not sync payment status to linked order:', err);
      }
    }

    // 1. Optimistic local update
    const current = invoices.map((inv) => (inv.id === invoiceId ? updatedInvoice : inv));
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(current));
    setInvoices(current);
    invoicesStore.updateMemory((curr) => curr.map((inv) => (inv.id === invoiceId ? updatedInvoice : inv)));
    invalidateDataCache('orders');

    // 2. Cloud Firestore sync
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'invoices', invoiceId), sanitizeForFirestore(updatedInvoice));
        await logActivity(
          'RECORD_PAYMENT',
          'invoice',
          invoiceId,
          `Recorded payment of Rs. ${paidAddition} for invoice #${target.invoiceNumber}. New status: ${newStatus}`,
          user
        );
      } catch (fbErr) {
        console.warn('[Firestore Sync] Payment record write deferred to local storage:', fbErr);
      }
    } else {
      logActivity(
        'RECORD_PAYMENT',
        'invoice',
        invoiceId,
        `Recorded payment of Rs. ${paidAddition} for invoice #${target.invoiceNumber}. New status: ${newStatus}`,
        user
      );
    }

    return updatedInvoice;
  };

  const deleteInvoice = async (id: string, user: { uid: string; name: string }): Promise<void> => {
    const target = invoices.find((inv) => inv.id === id);
    // 1. Optimistic local update
    const updated = invoices.filter((inv) => inv.id !== id);
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(updated));
    setInvoices(updated);
    invoicesStore.updateMemory((curr) => curr.filter((inv) => inv.id !== id));
    invalidateDataCache('orders');

    // 2. Cloud Firestore sync
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'invoices', id));
        await logActivity(
          'DELETE_INVOICE',
          'invoice',
          id,
          `Deleted invoice #${target?.invoiceNumber || id}`,
          user
        );
      } catch (fbErr) {
        console.warn('[Firestore Sync] Invoice deletion deferred to local storage:', fbErr);
      }
    } else {
      logActivity(
        'DELETE_INVOICE',
        'invoice',
        id,
        `Deleted invoice #${target?.invoiceNumber || id}`,
        user
      );
    }
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
  const [deliveries, setDeliveries] = useState<Delivery[]>(() => {
    initDemoStorage();
    if (deliveriesStore.getLive() !== null) return deliveriesStore.getLive()!;
    if (typeof window === 'undefined') return INITIAL_DELIVERIES;
    const stored = localStorage.getItem(STORAGE_KEYS.DELIVERIES);
    return stored ? JSON.parse(stored) : INITIAL_DELIVERIES;
  });
  const [loading, setLoading] = useState<boolean>(deliveriesStore.getLive() === null);
  const [error, setError] = useState<string | null>(null);

  const fetchDeliveries = useCallback(async () => {
    initDemoStorage();
    if (!isFirebaseConfigured) {
      const stored = localStorage.getItem(STORAGE_KEYS.DELIVERIES);
      setDeliveries(stored ? JSON.parse(stored) : INITIAL_DELIVERIES);
      setLoading(false);
      return;
    }
    if (deliveriesStore.getLive() !== null) {
      setDeliveries(deliveriesStore.getLive()!);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      fetchDeliveries();
      return;
    }

    const unsub = deliveriesStore.subscribe((items) => {
      setDeliveries(items);
      setLoading(false);
    });

    return () => unsub();
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
        ordersStore.updateMemory((curr) =>
          curr.map((o) => (o.id === storedOrders[oIdx].id ? storedOrders[oIdx] : o))
        );
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
        await updateDoc(orderRef, sanitizeForFirestore(updates));
        ordersStore.updateMemory((curr) =>
          curr.map((o) => (o.id === orderId ? { ...o, ...updates } : o))
        );
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

    // 1. Optimistic local persistence & memory update
    const current = [...deliveries];
    const index = current.findIndex((del) => del.id === id);
    const updated = index !== -1 ? current.map((del) => (del.id === id ? saved : del)) : [saved, ...current];
    localStorage.setItem(STORAGE_KEYS.DELIVERIES, JSON.stringify(updated));
    setDeliveries(updated);
    deliveriesStore.updateMemory((curr) => {
      const idx = curr.findIndex((del) => del.id === id);
      return idx !== -1 ? curr.map((del) => (del.id === id ? saved : del)) : [saved, ...curr];
    });
    invalidateDataCache('deliveries');

    // 2. Cloud Firestore sync
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'deliveries', id), sanitizeForFirestore(saved));
        await logActivity(
          isNew ? 'CREATE_DELIVERY' : 'UPDATE_DELIVERY',
          'delivery',
          id,
          `${isNew ? 'Created' : 'Updated'} delivery for Order #${saved.orderNumber || saved.orderId} via ${saved.courier} (Tracking: ${saved.trackingNumber || 'N/A'})`,
          user
        );
      } catch (fbErr) {
        console.warn('[Firestore Sync] Delivery write deferred to local storage:', fbErr);
      }
    } else {
      logActivity(
        isNew ? 'CREATE_DELIVERY' : 'UPDATE_DELIVERY',
        'delivery',
        id,
        `${isNew ? 'Created' : 'Updated'} delivery for Order #${saved.orderNumber || saved.orderId} via ${saved.courier} (Tracking: ${saved.trackingNumber || 'N/A'})`,
        user
      );
    }

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

    const current = deliveries.map((del) => (del.id === deliveryId ? updated : del));
    localStorage.setItem(STORAGE_KEYS.DELIVERIES, JSON.stringify(current));
    setDeliveries(current);
    deliveriesStore.updateMemory((curr) => curr.map((del) => (del.id === deliveryId ? updated : del)));
    invalidateDataCache('deliveries');

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'deliveries', deliveryId), sanitizeForFirestore(updated));
        await logActivity(
          'DELIVERY_STATUS_CHANGED',
          'delivery',
          deliveryId,
          `Delivery for Order #${target.orderNumber || target.orderId} marked ${newStatus}`,
          user
        );
      } catch (fbErr) {
        console.warn('[Firestore Sync] Delivery status update deferred to local storage:', fbErr);
      }
    } else {
      logActivity(
        'DELIVERY_STATUS_CHANGED',
        'delivery',
        deliveryId,
        `Delivery for Order #${target.orderNumber || target.orderId} marked ${newStatus}`,
        user
      );
    }
  };

  const deleteDelivery = async (id: string, user: { uid: string; name: string }): Promise<void> => {
    const target = deliveries.find((del) => del.id === id);
    const updated = deliveries.filter((del) => del.id !== id);
    localStorage.setItem(STORAGE_KEYS.DELIVERIES, JSON.stringify(updated));
    setDeliveries(updated);
    deliveriesStore.updateMemory((curr) => curr.filter((del) => del.id !== id));
    invalidateDataCache('deliveries');

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'deliveries', id));
        await logActivity(
          'DELETE_DELIVERY',
          'delivery',
          id,
          `Deleted delivery for Order #${target?.orderNumber || target?.orderId || id}`,
          user
        );
      } catch (fbErr) {
        console.warn('[Firestore Sync] Delivery delete deferred to local storage:', fbErr);
      }
    } else {
      logActivity(
        'DELETE_DELIVERY',
        'delivery',
        id,
        `Deleted delivery for Order #${target?.orderNumber || target?.orderId || id}`,
        user
      );
    }
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
