import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase/config';
import {
  Product,
  Customer,
  Order,
  Invoice,
  Delivery,
  StockMovement,
  Expense,
  ActivityLog,
  BusinessSettings,
  User,
  UserRole,
} from '@/types';
import {
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_ORDERS,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_DELIVERIES,
  INITIAL_EXPENSES,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_SETTINGS,
  INITIAL_STAFF_USERS,
} from './mockData';
import { logActivity, recordStockMovement } from './firebase/firestore';

// LocalStorage Persistence Keys
const LS_KEYS = {
  PRODUCTS: 'danix_pos_products',
  CUSTOMERS: 'danix_pos_customers',
  ORDERS: 'danix_pos_orders',
  INVOICES: 'danix_pos_invoices',
  DELIVERIES: 'danix_pos_deliveries',
  EXPENSES: 'danix_pos_expenses',
  LOGS: 'danix_pos_activity_logs',
  SETTINGS: 'danix_pos_business_settings',
  USERS: 'danix_pos_users',
};

// Helper: load from localStorage with initial fallback
function getLocalCollection<T>(key: string, initialFallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(initialFallback));
      return initialFallback;
    }
    return JSON.parse(raw) as T[];
  } catch {
    return initialFallback;
  }
}

// Helper: save to localStorage
function saveLocalCollection<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

// Helper: get Single Local Document with fallback
function getLocalDoc<T>(key: string, initialFallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(initialFallback));
      return initialFallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return initialFallback;
  }
}

function saveLocalDoc<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save doc to localStorage:', err);
  }
}

// ==================== DASHBOARD & KPI SERVICES ====================

export interface DashboardMetrics {
  todaySales: number;
  totalRevenue: number;
  totalOrdersCount: number;
  pendingOrdersCount: number;
  activeDeliveriesCount: number;
  lowStockCount: number;
  totalProductsCount: number;
  totalCustomersCount: number;
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  if (!isFirebaseConfigured) {
    const orders = getLocalCollection<Order>(LS_KEYS.ORDERS, INITIAL_ORDERS);
    const products = getLocalCollection<Product>(LS_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    const customers = getLocalCollection<Customer>(LS_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    const deliveries = getLocalCollection<Delivery>(LS_KEYS.DELIVERIES, INITIAL_DELIVERIES);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const todayOrders = orders.filter((o) => Number(o.createdAt) >= startOfToday);
    const todaySales = todayOrders.reduce((sum, o) => sum + (o.paymentStatus === 'paid' ? o.total : 0), 0);

    const totalRevenue = orders.reduce((sum, o) => sum + (o.paymentStatus === 'paid' ? o.total : 0), 0);
    const pendingOrdersCount = orders.filter((o) => o.orderStatus === 'pending' || o.paymentStatus === 'unpaid').length;
    const activeDeliveriesCount = deliveries.filter(
      (d) => d.status === 'in_transit' || d.status === 'dispatched' || d.status === 'pending' || d.status === 'ready'
    ).length;
    const lowStockCount = products.filter((p) => p.stockQuantity <= p.minimumStock).length;

    return {
      todaySales,
      totalRevenue,
      totalOrdersCount: orders.length,
      pendingOrdersCount,
      activeDeliveriesCount,
      lowStockCount,
      totalProductsCount: products.length,
      totalCustomersCount: customers.length,
    };
  }

  try {
    // Optimized queries using limits and counts
    const productsSnap = await getDocs(query(collection(db, 'products'), limit(250)));
    const products = productsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
    const lowStockCount = products.filter((p) => (p.stockQuantity ?? 0) <= (p.minimumStock ?? 0)).length;

    const ordersSnap = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100)));
    const orders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayOrders = orders.filter((o) => Number(o.createdAt) >= startOfToday);
    const todaySales = todayOrders.reduce((sum, o) => sum + (o.paymentStatus === 'paid' ? o.total : 0), 0);
    const totalRevenue = orders.reduce((sum, o) => sum + (o.paymentStatus === 'paid' ? o.total : 0), 0);
    const pendingOrdersCount = orders.filter((o) => o.orderStatus === 'pending' || o.paymentStatus === 'unpaid').length;

    const deliveriesSnap = await getDocs(query(collection(db, 'deliveries'), limit(100)));
    const deliveries = deliveriesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Delivery));
    const activeDeliveriesCount = deliveries.filter(
      (d) => d.status === 'in_transit' || d.status === 'dispatched' || d.status === 'pending' || d.status === 'ready'
    ).length;

    const customersSnap = await getDocs(query(collection(db, 'customers'), limit(100)));

    return {
      todaySales,
      totalRevenue,
      totalOrdersCount: ordersSnap.size,
      pendingOrdersCount,
      activeDeliveriesCount,
      lowStockCount,
      totalProductsCount: productsSnap.size,
      totalCustomersCount: customersSnap.size,
    };
  } catch (err) {
    console.warn('[DataService] Dashboard Firestore query fallback:', err);
    // Fallback to local
    return fetchDashboardMetricsOffline();
  }
}

function fetchDashboardMetricsOffline(): DashboardMetrics {
  const orders = getLocalCollection<Order>(LS_KEYS.ORDERS, INITIAL_ORDERS);
  const products = getLocalCollection<Product>(LS_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  const customers = getLocalCollection<Customer>(LS_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  const deliveries = getLocalCollection<Delivery>(LS_KEYS.DELIVERIES, INITIAL_DELIVERIES);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const todayOrders = orders.filter((o) => Number(o.createdAt) >= startOfToday);
  const todaySales = todayOrders.reduce((sum, o) => sum + (o.paymentStatus === 'paid' ? o.total : 0), 0);
  const totalRevenue = orders.reduce((sum, o) => sum + (o.paymentStatus === 'paid' ? o.total : 0), 0);
  const pendingOrdersCount = orders.filter((o) => o.orderStatus === 'pending' || o.paymentStatus === 'unpaid').length;
  const activeDeliveriesCount = deliveries.filter(
    (d) => d.status === 'in_transit' || d.status === 'dispatched' || d.status === 'pending' || d.status === 'ready'
  ).length;
  const lowStockCount = products.filter((p) => p.stockQuantity <= p.minimumStock).length;

  return {
    todaySales,
    totalRevenue,
    totalOrdersCount: orders.length,
    pendingOrdersCount,
    activeDeliveriesCount,
    lowStockCount,
    totalProductsCount: products.length,
    totalCustomersCount: customers.length,
  };
}

export async function fetchRecentOrders(maxCount: number = 5): Promise<Order[]> {
  if (!isFirebaseConfigured) {
    const list = getLocalCollection<Order>(LS_KEYS.ORDERS, INITIAL_ORDERS);
    return list.slice(0, maxCount);
  }
  try {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(maxCount));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
  } catch (err) {
    console.warn('[DataService] Recent orders fallback:', err);
    const list = getLocalCollection<Order>(LS_KEYS.ORDERS, INITIAL_ORDERS);
    return list.slice(0, maxCount);
  }
}

export async function fetchLowStockProducts(maxCount: number = 8): Promise<Product[]> {
  if (!isFirebaseConfigured) {
    const list = getLocalCollection<Product>(LS_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    return list.filter((p) => p.stockQuantity <= p.minimumStock).slice(0, maxCount);
  }
  try {
    const snap = await getDocs(query(collection(db, 'products'), limit(100)));
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
    return all.filter((p) => (p.stockQuantity ?? 0) <= (p.minimumStock ?? 0)).slice(0, maxCount);
  } catch (err) {
    console.warn('[DataService] Low stock fallback:', err);
    const list = getLocalCollection<Product>(LS_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    return list.filter((p) => p.stockQuantity <= p.minimumStock).slice(0, maxCount);
  }
}

export async function quickRestockProduct(
  productId: string,
  quantityToAdd: number,
  user: { uid: string; name: string }
): Promise<Product> {
  if (!isFirebaseConfigured) {
    const products = getLocalCollection<Product>(LS_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    const idx = products.findIndex((p) => p.id === productId);
    if (idx === -1) throw new Error('Product not found');
    const oldStock = products[idx].stockQuantity;
    products[idx].stockQuantity += quantityToAdd;
    products[idx].updatedAt = Date.now();
    saveLocalCollection(LS_KEYS.PRODUCTS, products);

    // Record Stock Movement
    await recordStockMovement({
      productId,
      sku: products[idx].sku,
      type: 'stock_in',
      quantity: quantityToAdd,
      referenceType: 'manual',
      reason: `Quick Restock trigger (+${quantityToAdd} units)`,
      createdBy: user.name,
    });

    await logActivity(
      'Stock Restocked',
      'stock',
      productId,
      `Quick restocked ${quantityToAdd} units of ${products[idx].name} (Stock: ${oldStock} -> ${products[idx].stockQuantity})`,
      user
    );

    return products[idx];
  }

  try {
    const movement = await recordStockMovement({
      productId,
      sku: '',
      type: 'stock_in',
      quantity: quantityToAdd,
      referenceType: 'manual',
      reason: `Quick Restock trigger (+${quantityToAdd} units)`,
      createdBy: user.name,
    });

    await logActivity(
      'Stock Restocked',
      'stock',
      productId,
      `Quick restocked ${quantityToAdd} units of product ID ${productId}`,
      user
    );

    const docSnap = await getDoc(doc(db, 'products', productId));
    return { id: docSnap.id, ...docSnap.data() } as Product;
  } catch (err) {
    console.error('Quick restock error:', err);
    throw err;
  }
}

// ==================== ACTIVITY LOGS ====================

export async function fetchActivityLogs(
  filterEntityType?: string,
  filterAction?: string,
  maxCount: number = 50
): Promise<ActivityLog[]> {
  if (!isFirebaseConfigured) {
    let logs = getLocalCollection<ActivityLog>(LS_KEYS.LOGS, INITIAL_ACTIVITY_LOGS);
    if (filterEntityType && filterEntityType !== 'all') {
      logs = logs.filter((l) => l.entityType === filterEntityType);
    }
    if (filterAction && filterAction !== 'all') {
      logs = logs.filter((l) => l.action.toLowerCase().includes(filterAction.toLowerCase()));
    }
    return logs.slice(0, maxCount);
  }

  try {
    let q = query(collection(db, 'activity_logs'), orderBy('createdAt', 'desc'), limit(maxCount));
    if (filterEntityType && filterEntityType !== 'all') {
      q = query(
        collection(db, 'activity_logs'),
        where('entityType', '==', filterEntityType),
        orderBy('createdAt', 'desc'),
        limit(maxCount)
      );
    }
    const snap = await getDocs(q);
    let logs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ActivityLog));
    if (filterAction && filterAction !== 'all') {
      logs = logs.filter((l) => l.action.toLowerCase().includes(filterAction.toLowerCase()));
    }
    return logs;
  } catch (err) {
    console.warn('[DataService] Activity logs query fallback:', err);
    let logs = getLocalCollection<ActivityLog>(LS_KEYS.LOGS, INITIAL_ACTIVITY_LOGS);
    if (filterEntityType && filterEntityType !== 'all') {
      logs = logs.filter((l) => l.entityType === filterEntityType);
    }
    if (filterAction && filterAction !== 'all') {
      logs = logs.filter((l) => l.action.toLowerCase().includes(filterAction.toLowerCase()));
    }
    return logs.slice(0, maxCount);
  }
}

// ==================== EXPENSES MANAGEMENT ====================

export async function fetchExpenses(): Promise<Expense[]> {
  if (!isFirebaseConfigured) {
    return getLocalCollection<Expense>(LS_KEYS.EXPENSES, INITIAL_EXPENSES);
  }
  try {
    const q = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'), limit(150));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense));
  } catch (err) {
    console.warn('[DataService] Expenses fallback:', err);
    return getLocalCollection<Expense>(LS_KEYS.EXPENSES, INITIAL_EXPENSES);
  }
}

export async function createExpense(
  expenseData: Omit<Expense, 'id' | 'createdAt'>,
  user: { uid: string; name: string }
): Promise<Expense> {
  const now = Date.now();
  if (!isFirebaseConfigured) {
    const expenses = getLocalCollection<Expense>(LS_KEYS.EXPENSES, INITIAL_EXPENSES);
    const newExpense: Expense = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...expenseData,
      createdAt: now,
    };
    expenses.unshift(newExpense);
    saveLocalCollection(LS_KEYS.EXPENSES, expenses);

    await logActivity(
      'Expense Created',
      'expense',
      newExpense.id,
      `Recorded ${newExpense.category} expense: ${newExpense.title} (Rs. ${newExpense.amount.toLocaleString()})`,
      user
    );
    return newExpense;
  }

  try {
    const docRef = await addDoc(collection(db, 'expenses'), {
      ...expenseData,
      createdAt: now,
    });
    const saved: Expense = {
      id: docRef.id,
      ...expenseData,
      createdAt: now,
    };
    await logActivity(
      'Expense Created',
      'expense',
      docRef.id,
      `Recorded ${saved.category} expense: ${saved.title} (Rs. ${saved.amount.toLocaleString()})`,
      user
    );
    return saved;
  } catch (err) {
    console.error('Failed to create expense in Firestore:', err);
    throw err;
  }
}

export async function updateExpense(
  id: string,
  updatedData: Partial<Omit<Expense, 'id' | 'createdAt'>>,
  user: { uid: string; name: string }
): Promise<void> {
  if (!isFirebaseConfigured) {
    const expenses = getLocalCollection<Expense>(LS_KEYS.EXPENSES, INITIAL_EXPENSES);
    const idx = expenses.findIndex((e) => e.id === id);
    if (idx !== -1) {
      expenses[idx] = { ...expenses[idx], ...updatedData };
      saveLocalCollection(LS_KEYS.EXPENSES, expenses);
      await logActivity(
        'Expense Updated',
        'expense',
        id,
        `Updated expense details for: ${expenses[idx].title}`,
        user
      );
    }
    return;
  }

  try {
    await updateDoc(doc(db, 'expenses', id), updatedData);
    await logActivity(
      'Expense Updated',
      'expense',
      id,
      `Updated expense ID: ${id}`,
      user
    );
  } catch (err) {
    console.error('Failed to update expense:', err);
    throw err;
  }
}

export async function deleteExpense(
  id: string,
  user: { uid: string; name: string }
): Promise<void> {
  if (!isFirebaseConfigured) {
    let expenses = getLocalCollection<Expense>(LS_KEYS.EXPENSES, INITIAL_EXPENSES);
    const item = expenses.find((e) => e.id === id);
    expenses = expenses.filter((e) => e.id !== id);
    saveLocalCollection(LS_KEYS.EXPENSES, expenses);
    await logActivity(
      'Expense Deleted',
      'expense',
      id,
      `Deleted expense: ${item?.title || id}`,
      user
    );
    return;
  }

  try {
    await deleteDoc(doc(db, 'expenses', id));
    await logActivity('Expense Deleted', 'expense', id, `Deleted expense ID: ${id}`, user);
  } catch (err) {
    console.error('Failed to delete expense:', err);
    throw err;
  }
}

// ==================== USER MANAGEMENT ====================

export async function fetchUsers(): Promise<User[]> {
  if (!isFirebaseConfigured) {
    return getLocalCollection<User>(LS_KEYS.USERS, INITIAL_STAFF_USERS);
  }

  try {
    const snap = await getDocs(collection(db, 'users'));
    if (snap.empty) {
      return getLocalCollection<User>(LS_KEYS.USERS, INITIAL_STAFF_USERS);
    }
    return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as User));
  } catch (err) {
    console.warn('[DataService] Users query fallback:', err);
    return getLocalCollection<User>(LS_KEYS.USERS, INITIAL_STAFF_USERS);
  }
}

export async function createStaffAccount(
  userData: { name: string; email: string; role: UserRole; phone?: string },
  adminUser: { uid: string; name: string }
): Promise<User> {
  const now = Date.now();
  const newUser: User = {
    uid: `user-${now}-${Math.random().toString(36).substring(2, 6)}`,
    name: userData.name,
    email: userData.email,
    role: userData.role,
    phone: userData.phone || '',
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  if (!isFirebaseConfigured) {
    const list = getLocalCollection<User>(LS_KEYS.USERS, INITIAL_STAFF_USERS);
    list.push(newUser);
    saveLocalCollection(LS_KEYS.USERS, list);

    await logActivity(
      'User Account Created',
      'user',
      newUser.uid,
      `Invited new staff user: ${newUser.name} (${newUser.email}) with role: ${newUser.role}`,
      adminUser
    );
    return newUser;
  }

  try {
    await setDoc(doc(db, 'users', newUser.uid), newUser);
    await logActivity(
      'User Account Created',
      'user',
      newUser.uid,
      `Created user account: ${newUser.name} (${newUser.email}) as ${newUser.role}`,
      adminUser
    );
    return newUser;
  } catch (err) {
    console.error('Failed to create user in Firestore:', err);
    throw err;
  }
}

export async function toggleUserStatus(
  uid: string,
  newActiveState: boolean,
  adminUser: { uid: string; name: string }
): Promise<void> {
  const now = Date.now();
  if (!isFirebaseConfigured) {
    const list = getLocalCollection<User>(LS_KEYS.USERS, INITIAL_STAFF_USERS);
    const target = list.find((u) => u.uid === uid);
    if (target) {
      target.active = newActiveState;
      target.updatedAt = now;
      saveLocalCollection(LS_KEYS.USERS, list);
      await logActivity(
        'User Status Changed',
        'user',
        uid,
        `Toggled user ${target.name} status to ${newActiveState ? 'Active' : 'Disabled'}`,
        adminUser
      );
    }
    return;
  }

  try {
    await updateDoc(doc(db, 'users', uid), {
      active: newActiveState,
      updatedAt: now,
    });
    await logActivity(
      'User Status Changed',
      'user',
      uid,
      `Changed user status to ${newActiveState ? 'Active' : 'Disabled'}`,
      adminUser
    );
  } catch (err) {
    console.error('Failed to update user status:', err);
    throw err;
  }
}

export async function updateUserRole(
  uid: string,
  newRole: UserRole,
  adminUser: { uid: string; name: string }
): Promise<void> {
  const now = Date.now();
  if (!isFirebaseConfigured) {
    const list = getLocalCollection<User>(LS_KEYS.USERS, INITIAL_STAFF_USERS);
    const target = list.find((u) => u.uid === uid);
    if (target) {
      target.role = newRole;
      target.updatedAt = now;
      saveLocalCollection(LS_KEYS.USERS, list);
      await logActivity(
        'User Role Changed',
        'user',
        uid,
        `Changed ${target.name}'s role to ${newRole}`,
        adminUser
      );
    }
    return;
  }

  try {
    await updateDoc(doc(db, 'users', uid), {
      role: newRole,
      updatedAt: now,
    });
    await logActivity(
      'User Role Changed',
      'user',
      uid,
      `Changed role to ${newRole}`,
      adminUser
    );
  } catch (err) {
    console.error('Failed to update user role:', err);
    throw err;
  }
}

// ==================== BUSINESS SETTINGS ====================

export async function fetchBusinessSettings(): Promise<BusinessSettings> {
  if (!isFirebaseConfigured) {
    return getLocalDoc<BusinessSettings>(LS_KEYS.SETTINGS, INITIAL_SETTINGS);
  }

  try {
    const snap = await getDoc(doc(db, 'settings', 'business'));
    if (snap.exists()) {
      return snap.data() as BusinessSettings;
    }
    return INITIAL_SETTINGS;
  } catch (err) {
    console.warn('[DataService] Settings fallback:', err);
    return getLocalDoc<BusinessSettings>(LS_KEYS.SETTINGS, INITIAL_SETTINGS);
  }
}

export async function saveBusinessSettings(
  settings: BusinessSettings,
  user: { uid: string; name: string }
): Promise<void> {
  if (!isFirebaseConfigured) {
    saveLocalDoc<BusinessSettings>(LS_KEYS.SETTINGS, settings);
    await logActivity(
      'Settings Updated',
      'settings',
      'business',
      `Saved business settings: ${settings.businessName}, ${settings.phone}`,
      user
    );
    return;
  }

  try {
    await setDoc(doc(db, 'settings', 'business'), settings, { merge: true });
    await logActivity(
      'Settings Updated',
      'settings',
      'business',
      `Saved business profile configuration`,
      user
    );
  } catch (err) {
    console.error('Failed to save settings to Firestore:', err);
    throw err;
  }
}

// ==================== REPORTS & ANALYTICS ====================

export interface SalesReportSummary {
  period: 'daily' | 'weekly' | 'monthly';
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  paidOrdersCount: number;
  unpaidOrdersCount: number;
  chartData: { label: string; revenue: number; orders: number }[];
}

export async function fetchSalesReport(period: 'daily' | 'weekly' | 'monthly'): Promise<SalesReportSummary> {
  const orders = isFirebaseConfigured
    ? (await getDocs(query(collection(db, 'orders'), limit(300)))).docs.map((d) => ({ id: d.id, ...d.data() } as Order))
    : getLocalCollection<Order>(LS_KEYS.ORDERS, INITIAL_ORDERS);

  const now = new Date();
  let filteredOrders: Order[] = [];
  let chartData: { label: string; revenue: number; orders: number }[] = [];

  if (period === 'daily') {
    // Last 7 days breakdown
    const days: { [dateStr: string]: { revenue: number; count: number } } = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      days[label] = { revenue: 0, count: 0 };
    }

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    filteredOrders = orders.filter((o) => Number(o.createdAt) >= sevenDaysAgo);

    filteredOrders.forEach((o) => {
      const d = new Date(Number(o.createdAt));
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      if (days[label]) {
        days[label].revenue += o.paymentStatus === 'paid' ? o.total : 0;
        days[label].count += 1;
      }
    });

    chartData = Object.entries(days).map(([label, val]) => ({
      label,
      revenue: val.revenue,
      orders: val.count,
    }));
  } else if (period === 'weekly') {
    // Last 4 weeks breakdown
    const weeks: { [weekLabel: string]: { revenue: number; count: number } } = {
      '3 Weeks Ago': { revenue: 0, count: 0 },
      '2 Weeks Ago': { revenue: 0, count: 0 },
      'Last Week': { revenue: 0, count: 0 },
      'This Week': { revenue: 0, count: 0 },
    };

    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const nowTs = Date.now();

    orders.forEach((o) => {
      const age = nowTs - Number(o.createdAt);
      if (age < oneWeek) {
        weeks['This Week'].revenue += o.paymentStatus === 'paid' ? o.total : 0;
        weeks['This Week'].count += 1;
      } else if (age < 2 * oneWeek) {
        weeks['Last Week'].revenue += o.paymentStatus === 'paid' ? o.total : 0;
        weeks['Last Week'].count += 1;
      } else if (age < 3 * oneWeek) {
        weeks['2 Weeks Ago'].revenue += o.paymentStatus === 'paid' ? o.total : 0;
        weeks['2 Weeks Ago'].count += 1;
      } else if (age < 4 * oneWeek) {
        weeks['3 Weeks Ago'].revenue += o.paymentStatus === 'paid' ? o.total : 0;
        weeks['3 Weeks Ago'].count += 1;
      }
    });

    chartData = Object.entries(weeks).map(([label, val]) => ({
      label,
      revenue: val.revenue,
      orders: val.count,
    }));
    filteredOrders = orders.filter((o) => nowTs - Number(o.createdAt) <= 4 * oneWeek);
  } else {
    // Monthly breakdown (Past 6 months)
    const months: { [monthLabel: string]: { revenue: number; count: number } } = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      months[label] = { revenue: 0, count: 0 };
    }

    orders.forEach((o) => {
      const d = new Date(Number(o.createdAt));
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (months[label]) {
        months[label].revenue += o.paymentStatus === 'paid' ? o.total : 0;
        months[label].count += 1;
      }
    });

    chartData = Object.entries(months).map(([label, val]) => ({
      label,
      revenue: val.revenue,
      orders: val.count,
    }));
    filteredOrders = orders;
  }

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.paymentStatus === 'paid' ? o.total : 0), 0);
  const paidOrders = filteredOrders.filter((o) => o.paymentStatus === 'paid');
  const unpaidOrders = filteredOrders.filter((o) => o.paymentStatus !== 'paid');
  const avgOrder = paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0;

  return {
    period,
    totalRevenue,
    totalOrders: filteredOrders.length,
    averageOrderValue: avgOrder,
    paidOrdersCount: paidOrders.length,
    unpaidOrdersCount: unpaidOrders.length,
    chartData,
  };
}

export interface InventoryValuation {
  totalItemsCount: number;
  totalCostValue: number;
  totalRetailValue: number;
  projectedGrossProfit: number;
  projectedMarginPercent: number;
  categoryBreakdown: { category: string; count: number; costVal: number; retailVal: number }[];
}

export async function fetchInventoryValuationReport(): Promise<InventoryValuation> {
  const products = isFirebaseConfigured
    ? (await getDocs(query(collection(db, 'products'), limit(300)))).docs.map((d) => ({ id: d.id, ...d.data() } as Product))
    : getLocalCollection<Product>(LS_KEYS.PRODUCTS, INITIAL_PRODUCTS);

  let totalCostValue = 0;
  let totalRetailValue = 0;
  const categories: { [cat: string]: { count: number; costVal: number; retailVal: number } } = {};

  products.forEach((p) => {
    const qty = p.stockQuantity || 0;
    const cost = (p.costPrice || 0) * qty;
    const retail = (p.sellingPrice || 0) * qty;

    totalCostValue += cost;
    totalRetailValue += retail;

    const cat = p.category || 'General';
    if (!categories[cat]) {
      categories[cat] = { count: 0, costVal: 0, retailVal: 0 };
    }
    categories[cat].count += qty;
    categories[cat].costVal += cost;
    categories[cat].retailVal += retail;
  });

  const projectedGrossProfit = totalRetailValue - totalCostValue;
  const projectedMarginPercent = totalRetailValue > 0 ? (projectedGrossProfit / totalRetailValue) * 100 : 0;

  return {
    totalItemsCount: products.reduce((acc, p) => acc + (p.stockQuantity || 0), 0),
    totalCostValue,
    totalRetailValue,
    projectedGrossProfit,
    projectedMarginPercent: Math.round(projectedMarginPercent * 10) / 10,
    categoryBreakdown: Object.entries(categories).map(([category, val]) => ({
      category,
      count: val.count,
      costVal: val.costVal,
      retailVal: val.retailVal,
    })),
  };
}

export interface CourierPerformance {
  totalDeliveries: number;
  deliveredCount: number;
  pendingCount: number;
  failedCount: number;
  successRate: number;
  courierBreakdown: { courier: string; total: number; delivered: number; successRate: number }[];
}

export async function fetchCourierPerformanceReport(): Promise<CourierPerformance> {
  const deliveries = isFirebaseConfigured
    ? (await getDocs(query(collection(db, 'deliveries'), limit(200)))).docs.map((d) => ({ id: d.id, ...d.data() } as Delivery))
    : getLocalCollection<Delivery>(LS_KEYS.DELIVERIES, INITIAL_DELIVERIES);

  const total = deliveries.length;
  const delivered = deliveries.filter((d) => d.status === 'delivered').length;
  const pending = deliveries.filter((d) => d.status === 'pending' || d.status === 'ready' || d.status === 'in_transit' || d.status === 'dispatched').length;
  const failed = deliveries.filter((d) => d.status === 'failed' || d.status === 'returned').length;
  const successRate = total > 0 ? Math.round((delivered / total) * 100) : 0;

  const couriersMap: { [c: string]: { total: number; delivered: number } } = {};
  deliveries.forEach((d) => {
    const c = d.courier || 'Standard Courier';
    if (!couriersMap[c]) couriersMap[c] = { total: 0, delivered: 0 };
    couriersMap[c].total += 1;
    if (d.status === 'delivered') couriersMap[c].delivered += 1;
  });

  return {
    totalDeliveries: total,
    deliveredCount: delivered,
    pendingCount: pending,
    failedCount: failed,
    successRate,
    courierBreakdown: Object.entries(couriersMap).map(([courier, val]) => ({
      courier,
      total: val.total,
      delivered: val.delivered,
      successRate: val.total > 0 ? Math.round((val.delivered / val.total) * 100) : 0,
    })),
  };
}

export interface ProfitLossSummary {
  salesRevenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  netMarginPercent: number;
  expenseCategoryBreakdown: { category: string; amount: number; percentage: number }[];
}

export async function fetchProfitLossReport(): Promise<ProfitLossSummary> {
  const orders = isFirebaseConfigured
    ? (await getDocs(query(collection(db, 'orders'), limit(300)))).docs.map((d) => ({ id: d.id, ...d.data() } as Order))
    : getLocalCollection<Order>(LS_KEYS.ORDERS, INITIAL_ORDERS);

  const expenses = isFirebaseConfigured
    ? (await getDocs(query(collection(db, 'expenses'), limit(200)))).docs.map((d) => ({ id: d.id, ...d.data() } as Expense))
    : getLocalCollection<Expense>(LS_KEYS.EXPENSES, INITIAL_EXPENSES);

  // Revenue from paid orders
  const paidOrders = orders.filter((o) => o.paymentStatus === 'paid');
  const salesRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);

  // Approximate COGS: assume average 55% of product selling price or calculated if products known
  const estimatedCostRatio = 0.55;
  const costOfGoodsSold = Math.round(salesRevenue * estimatedCostRatio);
  const grossProfit = salesRevenue - costOfGoodsSold;

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;
  const netMarginPercent = salesRevenue > 0 ? Math.round((netProfit / salesRevenue) * 1000) / 10 : 0;

  const expMap: { [c: string]: number } = {};
  expenses.forEach((e) => {
    expMap[e.category] = (expMap[e.category] || 0) + e.amount;
  });

  const expenseCategoryBreakdown = Object.entries(expMap).map(([category, amount]) => ({
    category,
    amount,
    percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
  }));

  return {
    salesRevenue,
    costOfGoodsSold,
    grossProfit,
    totalExpenses,
    netProfit,
    netMarginPercent,
    expenseCategoryBreakdown,
  };
}

// ==================== CSV EXPORT UTILITY ====================

export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): void {
  const escapeCell = (cell: unknown): string => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerRow = headers.map(escapeCell).join(',');
  const dataRows = rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');
  const csvContent = '\uFEFF' + headerRow + '\r\n' + dataRows; // UTF-8 BOM

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ==================== SYSTEM DATA RESET ====================

export interface ClearDataOptions {
  clearTransactions: boolean; // Orders, Invoices, Deliveries, Stock Movements, Expenses, Logs
  clearProducts: boolean;     // Products
  clearCustomers: boolean;    // Customers
}

export async function clearAllSystemData(
  options: ClearDataOptions,
  adminUser: { uid: string; name: string }
): Promise<void> {
  const { clearTransactions, clearProducts, clearCustomers } = options;

  // 1. Clear LocalStorage keys
  if (clearTransactions) {
    localStorage.setItem(LS_KEYS.ORDERS, JSON.stringify([]));
    localStorage.setItem('danix_mock_orders', JSON.stringify([]));
    localStorage.setItem(LS_KEYS.INVOICES, JSON.stringify([]));
    localStorage.setItem('danix_mock_invoices', JSON.stringify([]));
    localStorage.setItem(LS_KEYS.DELIVERIES, JSON.stringify([]));
    localStorage.setItem('danix_mock_deliveries', JSON.stringify([]));
    localStorage.setItem(LS_KEYS.EXPENSES, JSON.stringify([]));
    localStorage.setItem('danix_mock_stock_movements', JSON.stringify([]));
    localStorage.setItem('danix_pos_stock_movements', JSON.stringify([]));
    localStorage.setItem(LS_KEYS.LOGS, JSON.stringify([]));
  }

  if (clearProducts) {
    localStorage.setItem(LS_KEYS.PRODUCTS, JSON.stringify([]));
    localStorage.setItem('danix_mock_products', JSON.stringify([]));
  }

  if (clearCustomers) {
    localStorage.setItem(LS_KEYS.CUSTOMERS, JSON.stringify([]));
    localStorage.setItem('danix_mock_customers', JSON.stringify([]));
  }

  // 2. If Live Firebase is configured, clear Firestore collections
  if (isFirebaseConfigured) {
    try {
      const collectionsToWipe: string[] = [];
      if (clearTransactions) {
        collectionsToWipe.push('orders', 'invoices', 'deliveries', 'expenses', 'stock_movements', 'activity_logs');
      }
      if (clearProducts) {
        collectionsToWipe.push('products');
      }
      if (clearCustomers) {
        collectionsToWipe.push('customers');
      }

      for (const colName of collectionsToWipe) {
        const snap = await getDocs(query(collection(db, colName), limit(200)));
        const deletePromises = snap.docs.map((d) => deleteDoc(doc(db, colName, d.id)));
        await Promise.all(deletePromises);
      }
    } catch (err) {
      console.warn('[DataService] Error clearing Firestore collections:', err);
    }
  }

  // Log Activity for Audit
  await logActivity(
    'System Reset',
    'settings',
    'system_reset',
    `Cleared POS data: Transactions=${clearTransactions}, Products=${clearProducts}, Customers=${clearCustomers}`,
    adminUser
  );
}
