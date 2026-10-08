import {
  collection,
  doc,
  runTransaction,
  addDoc,
  serverTimestamp,
  CollectionReference,
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import {
  User,
  Product,
  Customer,
  Order,
  Invoice,
  Delivery,
  StockMovement,
  Expense,
  ActivityLog,
  BusinessSettings,
  StockMovementType,
  ProductCategory,
} from '@/types';

// Generic Firestore type converter helper
export const createConverter = <T extends DocumentData>(): FirestoreDataConverter<T> => ({
  toFirestore: (data: T) => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T => {
    return { id: snapshot.id, ...snapshot.data(options) } as unknown as T;
  },
});

// Typed collection references
export const usersCol = collection(db, 'users').withConverter(createConverter<User>());
export const productsCol = collection(db, 'products').withConverter(createConverter<Product>());
export const categoriesCol = collection(db, 'categories').withConverter(createConverter<ProductCategory>());
export const customersCol = collection(db, 'customers').withConverter(createConverter<Customer>());
export const ordersCol = collection(db, 'orders').withConverter(createConverter<Order>());
export const invoicesCol = collection(db, 'invoices').withConverter(createConverter<Invoice>());
export const deliveriesCol = collection(db, 'deliveries').withConverter(createConverter<Delivery>());
export const stockMovementsCol = collection(db, 'stock_movements').withConverter(createConverter<StockMovement>());
export const expensesCol = collection(db, 'expenses').withConverter(createConverter<Expense>());
export const activityLogsCol = collection(db, 'activity_logs').withConverter(createConverter<ActivityLog>());
export const settingsCol = collection(db, 'settings').withConverter(createConverter<BusinessSettings>());

/**
 * Generate Next Atomic Invoice Number using Firestore Transaction
 * E.g., INV-00001, INV-00002
 */
export async function generateNextInvoiceNumber(prefix: string = 'INV'): Promise<string> {
  if (!isFirebaseConfigured) {
    const key = `danix_counter_${prefix}`;
    const current = parseInt(localStorage.getItem(key) || '100', 10) + 1;
    localStorage.setItem(key, current.toString());
    const year = new Date().getFullYear();
    return `${prefix}-${year}-${String(current).padStart(5, '0')}`;
  }

  const counterDocRef = doc(db, 'settings', 'counters');

  try {
    const nextNumber = await runTransaction(db, async (transaction) => {
      const counterSnap = await transaction.get(counterDocRef);
      let currentVal = 0;

      if (counterSnap.exists()) {
        const data = counterSnap.data();
        currentVal = data?.[`invoice_${prefix}`] || data?.invoiceCount || 0;
      }

      const incremented = currentVal + 1;
      transaction.set(
        counterDocRef,
        {
          [`invoice_${prefix}`]: incremented,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      return incremented;
    });

    const year = new Date().getFullYear();
    return `${prefix}-${year}-${String(nextNumber).padStart(5, '0')}`;
  } catch (error) {
    console.warn('[Firestore] Invoice numbering transaction fallback:', error);
    const fallbackNumber = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${new Date().getFullYear()}-${fallbackNumber}`;
  }
}

/**
 * Record Stock Movement and atomically update Product Stock Quantity
 */
export async function recordStockMovement(
  movementData: {
    productId: string;
    sku: string;
    type: StockMovementType;
    quantity: number;
    referenceType?: string;
    referenceId?: string;
    reason?: string;
    createdBy: string;
  }
): Promise<StockMovement> {
  const { productId, sku, type, quantity, referenceType, referenceId, reason, createdBy } = movementData;
  const now = Date.now();

  // Determine net change to product inventory
  let delta = 0;
  switch (type) {
    case 'stock_in':
    case 'return':
      delta = Math.abs(quantity);
      break;
    case 'sale':
    case 'damaged':
      delta = -Math.abs(quantity);
      break;
    case 'adjustment':
    default:
      delta = quantity;
      break;
  }

  if (!isFirebaseConfigured) {
    // Local / Demo Mode execution
    const cachedProducts = localStorage.getItem('danix_mock_products');
    let prevStock = 10;
    let newStock = 10 + delta;

    if (cachedProducts) {
      try {
        const productsList: Product[] = JSON.parse(cachedProducts);
        const productIndex = productsList.findIndex((p) => p.id === productId);
        if (productIndex !== -1) {
          prevStock = productsList[productIndex].stockQuantity;
          newStock = Math.max(0, prevStock + delta);
          productsList[productIndex].stockQuantity = newStock;
          productsList[productIndex].updatedAt = now;
          localStorage.setItem('danix_mock_products', JSON.stringify(productsList));
        }
      } catch (e) {
        console.error(e);
      }
    }

    const recorded: StockMovement = {
      id: `sm-${now}-${Math.random().toString(36).substring(2, 6)}`,
      productId,
      sku,
      type,
      quantity,
      previousStock: prevStock,
      newStock,
      referenceType,
      referenceId,
      reason: reason || `Inventory movement: ${type}`,
      createdBy,
      createdAt: now,
    };

    return recorded;
  }

  const productRef = doc(db, 'products', productId);
  const movementsCollection = collection(db, 'stock_movements');

  try {
    const result = await runTransaction(db, async (transaction) => {
      const productDoc = await transaction.get(productRef);
      if (!productDoc.exists()) {
        throw new Error(`Product with ID ${productId} does not exist`);
      }

      const product = productDoc.data() as Product;
      const previousStock = product.stockQuantity || 0;
      const newStock = Math.max(0, previousStock + delta);

      // Update product document
      transaction.update(productRef, {
        stockQuantity: newStock,
        updatedAt: now,
      });

      // Prepare stock movement document
      const newMovementRef = doc(movementsCollection);
      const stockMovement: StockMovement = {
        id: newMovementRef.id,
        productId,
        sku: sku || product.sku || '',
        type,
        quantity,
        previousStock,
        newStock,
        referenceType,
        referenceId,
        reason: reason || `Updated via ${type}`,
        createdBy,
        createdAt: now,
      };

      transaction.set(newMovementRef, stockMovement);

      return stockMovement;
    });

    return result;
  } catch (error) {
    console.error('[Firestore] recordStockMovement transaction failed:', error);
    throw error;
  }
}

/**
 * Log System Activity
 */
export async function logActivity(
  action: string,
  entityType: ActivityLog['entityType'],
  entityId: string | undefined,
  description: string,
  user: { uid: string; name: string }
): Promise<void> {
  const logItem: Omit<ActivityLog, 'id'> = {
    action,
    entityType,
    entityId: entityId || '',
    description,
    performedBy: user.uid,
    performedByName: user.name,
    createdAt: Date.now(),
  };

  if (!isFirebaseConfigured) {
    console.info('[Activity Log Demo]', logItem);
    const existing = JSON.parse(localStorage.getItem('danix_activity_logs') || '[]');
    existing.unshift({ id: `log-${Date.now()}`, ...logItem });
    localStorage.setItem('danix_activity_logs', JSON.stringify(existing.slice(0, 100)));
    return;
  }

  try {
    await addDoc(collection(db, 'activity_logs'), logItem);
  } catch (error) {
    console.warn('[Firestore] Failed to log activity:', error);
  }
}

// ----------------------------------------------------
// DYNAMIC CATEGORY & SECURE ATOMIC SKU GENERATOR
// ----------------------------------------------------

export const DEFAULT_PREDEFINED_CATEGORIES: ProductCategory[] = [
  { id: 'cat-tea', name: 'Ceylon Tea', skuPrefix: 'TEA', active: true, createdAt: 1704067200000, updatedAt: 1704067200000 },
  { id: 'cat-spices', name: 'Spices & Condiments', skuPrefix: 'SPI', active: true, createdAt: 1704067200000, updatedAt: 1704067200000 },
  { id: 'cat-oils', name: 'Oils & Ghee', skuPrefix: 'OIL', active: true, createdAt: 1704067200000, updatedAt: 1704067200000 },
  { id: 'cat-sweets', name: 'Sweets & Syrups', skuPrefix: 'SWT', active: true, createdAt: 1704067200000, updatedAt: 1704067200000 },
  { id: 'cat-dry', name: 'Dry Goods', skuPrefix: 'DRY', active: true, createdAt: 1704067200000, updatedAt: 1704067200000 },
  { id: 'cat-canned', name: 'Canned Goods', skuPrefix: 'CAN', active: true, createdAt: 1704067200000, updatedAt: 1704067200000 },
  { id: 'cat-bakery', name: 'Bakery & Snacks', skuPrefix: 'BAK', active: true, createdAt: 1704067200000, updatedAt: 1704067200000 },
  { id: 'cat-beverages', name: 'Beverages', skuPrefix: 'BEV', active: true, createdAt: 1704067200000, updatedAt: 1704067200000 },
  { id: 'cat-care', name: 'Personal Care', skuPrefix: 'PC', active: true, createdAt: 1704067200000, updatedAt: 1704067200000 },
  { id: 'cat-other', name: 'Other', skuPrefix: 'OTH', active: true, createdAt: 1704067200000, updatedAt: 1704067200000 },
];

/**
 * Sanitize and standardize a SKU Prefix (2-6 uppercase letters/numbers)
 */
export function sanitizeSkuPrefix(prefixOrName: string): string {
  if (!prefixOrName) return 'DAN';
  const clean = prefixOrName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return clean.substring(0, 4) || 'DAN';
}

/**
 * Inspect existing products to find the highest number currently in use for a prefix
 */
export function getHighestExistingSkuNumber(prefix: string, products: Product[] = []): number {
  const cleanPrefix = sanitizeSkuPrefix(prefix);
  const regex = new RegExp(`^${cleanPrefix}-(\\d+)$`, 'i');
  let max = 0;
  for (const p of products) {
    if (!p.sku) continue;
    const match = p.sku.trim().match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > max) {
        max = num;
      }
    }
  }
  return max;
}

/**
 * Read-only preview of prospective next SKU for a category prefix (does not increment counter)
 */
export function peekNextCategorySku(prefix: string, products: Product[] = []): string {
  const cleanPrefix = sanitizeSkuPrefix(prefix);
  const highestExisting = getHighestExistingSkuNumber(cleanPrefix, products);
  let stored = 0;
  if (typeof window !== 'undefined') {
    stored = parseInt(localStorage.getItem(`danix_sku_counter_${cleanPrefix}`) || '0', 10);
  }
  const prospective = Math.max(stored, highestExisting) + 1;
  return `${cleanPrefix}-${String(prospective).padStart(4, '0')}`;
}

/**
 * Atomically generate and increment the next unique category-based SKU using Firestore transaction
 * E.g., ELE-0001, ELE-0002, CLO-0001
 */
export async function generateNextCategorySku(
  prefix: string,
  existingProducts: Product[] = []
): Promise<string> {
  const cleanPrefix = sanitizeSkuPrefix(prefix);
  const highestExisting = getHighestExistingSkuNumber(cleanPrefix, existingProducts);

  if (!isFirebaseConfigured) {
    const key = `danix_sku_counter_${cleanPrefix}`;
    const stored = parseInt(localStorage.getItem(key) || '0', 10);
    const nextVal = Math.max(stored, highestExisting) + 1;
    localStorage.setItem(key, nextVal.toString());
    return `${cleanPrefix}-${String(nextVal).padStart(4, '0')}`;
  }

  const counterDocRef = doc(db, 'settings', 'sku_counters');

  try {
    const nextNumber = await runTransaction(db, async (transaction) => {
      const counterSnap = await transaction.get(counterDocRef);
      let currentVal = 0;

      if (counterSnap.exists()) {
        const data = counterSnap.data();
        currentVal = data?.[`prefix_${cleanPrefix}`] || 0;
      }

      const incremented = Math.max(currentVal, highestExisting) + 1;
      transaction.set(
        counterDocRef,
        {
          [`prefix_${cleanPrefix}`]: incremented,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      return incremented;
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem(`danix_sku_counter_${cleanPrefix}`, nextNumber.toString());
    }

    return `${cleanPrefix}-${String(nextNumber).padStart(4, '0')}`;
  } catch (error) {
    console.warn('[Firestore] Atomic SKU counter transaction fallback:', error);
    const nextVal = highestExisting + 1;
    if (typeof window !== 'undefined') {
      localStorage.setItem(`danix_sku_counter_${cleanPrefix}`, nextVal.toString());
    }
    return `${cleanPrefix}-${String(nextVal).padStart(4, '0')}`;
  }
}

