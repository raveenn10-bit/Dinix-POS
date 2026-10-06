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
