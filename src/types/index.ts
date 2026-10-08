// Danix POS - Global TypeScript Definitions

export type UserRole = 'admin' | 'staff';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  phone?: string;
  avatarUrl?: string;
  createdAt: string | number;
  updatedAt: string | number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  description?: string;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minimumStock: number;
  active: boolean;
  imageUrl?: string;
  createdAt: string | number;
  updatedAt: string | number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  totalOrders?: number;
  totalSpent?: number;
  createdAt: string | number;
  updatedAt: string | number;
}

export interface OrderItem {
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
  imageUrl?: string;
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'cod' | 'card';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export type DeliveryStatus =
  | 'pending'
  | 'ready'
  | 'dispatched'
  | 'in_transit'
  | 'delivered'
  | 'failed'
  | 'returned';

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  deliveryStatus: DeliveryStatus;
  notes?: string;
  createdBy: string;
  createdAt: string | number;
  updatedAt: string | number;
}

export interface CustomerSnapshot {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber?: string;
  customerId?: string;
  customerSnapshot: CustomerSnapshot;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paidAmount?: number;
  dueDate?: string | number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  notes?: string;
  createdBy: string;
  createdAt: string | number;
}

export interface Delivery {
  id: string;
  orderId: string;
  orderNumber?: string;
  invoiceId?: string;
  customerName: string;
  phone: string;
  phone2?: string;
  address: string;
  city?: string;
  courier: string;
  serviceType?: string;
  trackingNumber?: string;
  deliveryFee: number;
  codAmount?: number;
  status: DeliveryStatus;
  notes?: string;
  dispatchedAt?: string | number;
  deliveredAt?: string | number;
  createdAt: string | number;
  updatedAt: string | number;
}

export type StockMovementType =
  | 'stock_in'
  | 'sale'
  | 'return'
  | 'adjustment'
  | 'damaged';

export interface StockMovement {
  id: string;
  productId: string;
  sku: string;
  type: StockMovementType;
  quantity: number; // positive or negative adjustment
  previousStock: number;
  newStock: number;
  referenceType?: 'order' | 'manual' | 'purchase' | 'return' | 'adjustment' | string;
  referenceId?: string;
  reason?: string;
  createdBy: string;
  createdAt: string | number;
}

export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  notes?: string;
  createdBy: string;
  createdAt: string | number;
}

export interface ActivityLog {
  id: string;
  action: string;
  entityType: 'product' | 'order' | 'invoice' | 'delivery' | 'customer' | 'stock' | 'expense' | 'user' | 'settings' | string;
  entityId?: string;
  description: string;
  performedBy: string;
  performedByName: string;
  createdAt: string | number;
}

export interface BusinessSettings {
  businessName: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  invoicePrefix: string;
  invoiceFooter: string;
  taxSettings: {
    enabled: boolean;
    rate: number;
  };
  deliverySettings: {
    defaultFee: number;
    couriers: string[];
  };
}

// Notification & UI Types
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number;
  createdAt: number;
}

// App Navigation Item Type
export interface NavItem {
  name: string;
  href: string;
  iconName: string;
  requiredRole?: UserRole;
  badge?: string | number;
}

// Product Category Definition for Dynamic Category Management
export interface ProductCategory {
  id: string;
  name: string;
  skuPrefix: string;
  active: boolean;
  description?: string;
  createdAt: string | number;
  updatedAt: string | number;
}

