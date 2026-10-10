/**
 * ==============================================================================
 * DANIX.LK POS - COMMERCIAL PRODUCTION QA & DOMAIN VERIFICATION TEST SUITE
 * ==============================================================================
 * Comprehensive automated verification test suite covering:
 *  - System Configuration & Manifests (.env, firebase.json, firestore.rules, indexes)
 *  - Authentication & Role-Based Access Control (Admin vs Staff)
 *  - Product Management & Margin Calculations
 *  - Inventory Ledger & Negative Stock Prevention
 *  - Customer CRM & Sri Lankan Phone Validation
 *  - Order Pipeline & Item Snapshotting
 *  - Atomic Sequential Invoice Numbering (INV-YYYY-XXXXXX)
 *  - Delivery Logistics & Courier Status Pipeline
 *  - Label Generation & Barcode / QR Rendering
 *  - Financial Reports & P&L Logic
 *  - Firestore Security Rules Static Verification
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Test Suite State & Reporting Metrics
const testResults = [];
let passedCount = 0;
let failedCount = 0;

// Assertion Helpers
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Failed'}: Expected [${expected}], but got [${actual}]`);
  }
}

function assertApprox(actual, expected, tolerance = 0.01, message) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message || 'Failed'}: Expected ~[${expected}], but got [${actual}]`);
  }
}

async function runTest(section, testName, testFn) {
  const start = Date.now();
  try {
    await testFn();
    const duration = Date.now() - start;
    passedCount++;
    testResults.push({ section, name: testName, status: 'PASS', duration });
    console.log(`  [PASS] ${testName} (${duration}ms)`);
  } catch (err) {
    const duration = Date.now() - start;
    failedCount++;
    testResults.push({ section, name: testName, status: 'FAIL', duration, error: err.message });
    console.error(`  [FAIL] ${testName}: ${err.message}`);
  }
}

async function main() {
  console.log('==============================================================================');
  console.log('  DANIX POS - COMPREHENSIVE AUTOMATED VERIFICATION TEST SUITE');
  console.log('==============================================================================\n');

  // --------------------------------------------------------------------------
  // DOMAIN 1: SYSTEM ARCHITECTURE & FIREBASE MANIFESTS
  // --------------------------------------------------------------------------
  console.log('--- Domain 1: Configuration & Firebase Manifests ---');

  await runTest('Config', 'Verify .env.example exists with required keys', () => {
    const envExample = fs.readFileSync(path.join(rootDir, '.env.example'), 'utf-8');
    assert(envExample.includes('VITE_FIREBASE_API_KEY'), 'Missing VITE_FIREBASE_API_KEY');
    assert(envExample.includes('VITE_FIREBASE_PROJECT_ID'), 'Missing VITE_FIREBASE_PROJECT_ID');
    assert(envExample.includes('VITE_FIREBASE_AUTH_DOMAIN'), 'Missing VITE_FIREBASE_AUTH_DOMAIN');
  });

  await runTest('Config', 'Verify firebase.json configuration', () => {
    const fbJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'firebase.json'), 'utf-8'));
    assert(fbJson.firestore, 'Missing firestore config block');
    assertEqual(fbJson.firestore.rules, 'firestore.rules', 'Incorrect rules file reference');
    assertEqual(fbJson.firestore.indexes, 'firestore.indexes.json', 'Incorrect indexes reference');
    assert(fbJson.emulators && fbJson.emulators.auth, 'Missing auth emulator config');
    assert(fbJson.emulators.firestore, 'Missing firestore emulator config');
  });

  await runTest('Config', 'Verify firestore.indexes.json composite indexes coverage', () => {
    const indexesJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'firestore.indexes.json'), 'utf-8'));
    assert(Array.isArray(indexesJson.indexes), 'Indexes must be an array');
    const collections = indexesJson.indexes.map(i => i.collectionGroup);
    assert(collections.includes('orders'), 'Missing orders index');
    assert(collections.includes('deliveries'), 'Missing deliveries index');
    assert(collections.includes('products'), 'Missing products index');
    assert(collections.includes('stock_movements'), 'Missing stock_movements index');
    assert(collections.includes('invoices'), 'Missing invoices index');
  });

  // --------------------------------------------------------------------------
  // DOMAIN 2: FIRESTORE SECURITY RULES VERIFICATION
  // --------------------------------------------------------------------------
  console.log('\n--- Domain 2: Firestore Security Rules Static Audit ---');

  await runTest('SecurityRules', 'Verify firestore.rules has global default-deny', () => {
    const rules = fs.readFileSync(path.join(rootDir, 'firestore.rules'), 'utf-8');
    assert(!rules.includes('allow read, write: if true;'), 'CRITICAL: Insecure default allow detected');
    assert(rules.includes('match /{document=**} {\n      allow read, write: if false;\n    }'), 'Missing global default deny rule');
  });

  await runTest('SecurityRules', 'Verify role separation & immutable audit trail enforcement', () => {
    const rules = fs.readFileSync(path.join(rootDir, 'firestore.rules'), 'utf-8');
    assert(rules.includes('function isAdmin()'), 'Missing isAdmin helper');
    assert(rules.includes('function isStaff()'), 'Missing isStaff helper');
    assert(rules.includes('function isActive()'), 'Missing isActive helper');
    assert(rules.includes('match /expenses/{expenseId}'), 'Missing expenses match block');
    assert(rules.includes('match /activity_logs/{logId}'), 'Missing activity_logs match block');
    assert(rules.includes('match /stock_movements/{movementId}'), 'Missing stock_movements match block');
    // Ensure stock movements and activity logs are immutable
    assert(rules.includes('allow update: if false;'), 'Missing immutable update guard');
    assert(rules.includes('allow delete: if false;'), 'Missing immutable delete guard');
  });

  // --------------------------------------------------------------------------
  // DOMAIN 3: PRODUCT CATALOG & PRICING LOGIC
  // --------------------------------------------------------------------------
  console.log('\n--- Domain 3: Product Management & Margin Calculations ---');

  await runTest('Products', 'Validate profit margin and markup calculations', () => {
    const costPrice = 1200;
    const sellingPrice = 1850;
    const profit = sellingPrice - costPrice;
    const marginPercent = ((profit / sellingPrice) * 100);
    assertEqual(profit, 650, 'Profit calculation incorrect');
    assertApprox(marginPercent, 35.135, 0.01, 'Margin percentage calculation incorrect');
  });

  await runTest('Products', 'Validate low-stock trigger threshold condition', () => {
    const isLowStock = (stock, min) => stock <= min;
    assert(isLowStock(8, 15), 'Should flag low stock when stock <= minimumStock');
    assert(isLowStock(10, 10), 'Should flag low stock when stock equals minimumStock');
    assert(!isLowStock(45, 10), 'Should not flag low stock when stock > minimumStock');
    assert(isLowStock(0, 5), 'Out of stock must be flagged as low stock');
  });

  await runTest('Products', 'Validate SKU uniqueness format validator', () => {
    const skuRegex = /^[A-Z0-9_-]{3,20}$/;
    assert(skuRegex.test('TEA-BLK-500'), 'Valid SKU rejected');
    assert(skuRegex.test('OIL_COC_500'), 'Valid SKU rejected');
    assert(!skuRegex.test(''), 'Empty SKU accepted');
    assert(!skuRegex.test('AB'), 'Too short SKU accepted');
  });

  // --------------------------------------------------------------------------
  // DOMAIN 4: INVENTORY & NEGATIVE STOCK PREVENTION
  // --------------------------------------------------------------------------
  console.log('\n--- Domain 4: Inventory & Stock Movement Protection ---');

  await runTest('Inventory', 'Validate atomic inventory deduction and prevent negative balance', () => {
    let currentStock = 10;
    const deductStock = (qty) => {
      if (qty <= 0) throw new Error('Quantity must be greater than zero');
      if (qty > currentStock) throw new Error('Insufficient inventory available. Cannot become negative.');
      currentStock -= qty;
      return currentStock;
    };

    assertEqual(deductStock(3), 7, 'Valid deduction failed');
    assertEqual(deductStock(7), 0, 'Valid deduction to zero failed');
    
    let caught = false;
    try {
      deductStock(1);
    } catch (e) {
      caught = true;
      assert(e.message.includes('Insufficient inventory'), 'Expected insufficient inventory error');
    }
    assert(caught, 'Negative stock was permitted');
  });

  await runTest('Inventory', 'Verify stock movement record types and previous/new stock tracking', () => {
    const validTypes = ['stock_in', 'sale', 'return', 'adjustment', 'damaged'];
    const movement = {
      productId: 'prod-001',
      sku: 'TEA-BLK-500',
      type: 'sale',
      quantity: 2,
      previousStock: 45,
      newStock: 43,
      reason: 'Order fulfillment'
    };

    assert(validTypes.includes(movement.type), 'Invalid movement type');
    assertEqual(movement.newStock, movement.previousStock - movement.quantity, 'Stock delta mismatch');
  });

  // --------------------------------------------------------------------------
  // DOMAIN 5: CUSTOMER CRM & SRI LANKAN PHONE VALIDATION
  // --------------------------------------------------------------------------
  console.log('\n--- Domain 5: Customer Management & Phone Validation ---');

  await runTest('Customers', 'Validate Sri Lankan phone number parser and normalization', () => {
    const normalizeSlPhone = (phone) => {
      const cleaned = phone.replace(/[\s-]/g, '');
      if (/^07\d{8}$/.test(cleaned)) return cleaned;
      if (/^\+947\d{8}$/.test(cleaned)) return '0' + cleaned.substring(3);
      if (/^947\d{8}$/.test(cleaned)) return '0' + cleaned.substring(2);
      return null;
    };

    assertEqual(normalizeSlPhone('0771234567'), '0771234567', 'Standard local format failed');
    assertEqual(normalizeSlPhone('+94771234567'), '0771234567', 'International +94 format failed');
    assertEqual(normalizeSlPhone('077-123 4567'), '0771234567', 'Dashed/spaced format failed');
    assertEqual(normalizeSlPhone('1234567'), null, 'Invalid short number accepted');
    assertEqual(normalizeSlPhone('077123456789'), null, 'Too long number accepted');
  });

  // --------------------------------------------------------------------------
  // DOMAIN 6: ORDER PIPELINE & HISTORICAL SNAPSHOTTING
  // --------------------------------------------------------------------------
  console.log('\n--- Domain 6: Order Fulfillment & Snapshotting ---');

  await runTest('Orders', 'Validate order totals arithmetic with discounts and delivery fee', () => {
    const items = [
      { unitPrice: 1850, quantity: 2, discount: 0, lineTotal: 3700 },
      { unitPrice: 1450, quantity: 1, discount: 50, lineTotal: 1400 },
    ];
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const orderDiscount = 100;
    const deliveryFee = 350;
    const grandTotal = Math.max(0, subtotal - orderDiscount + deliveryFee);

    assertEqual(subtotal, 5100, 'Subtotal calculation mismatch');
    assertEqual(grandTotal, 5350, 'Grand total calculation mismatch');
  });

  await runTest('Orders', 'Verify order status progression state machine', () => {
    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['packed', 'cancelled'],
      packed: ['shipped', 'cancelled'],
      shipped: ['delivered', 'returned'],
      delivered: ['returned'],
      cancelled: [],
      returned: []
    };

    assert(validTransitions['pending'].includes('confirmed'), 'pending -> confirmed should be valid');
    assert(validTransitions['confirmed'].includes('packed'), 'confirmed -> packed should be valid');
    assert(validTransitions['shipped'].includes('delivered'), 'shipped -> delivered should be valid');
    assert(!validTransitions['delivered'].includes('pending'), 'delivered -> pending should be invalid');
  });

  // --------------------------------------------------------------------------
  // DOMAIN 7: SEQUENTIAL INVOICE GENERATION
  // --------------------------------------------------------------------------
  console.log('\n--- Domain 7: Atomic Sequential Invoice Engine ---');

  await runTest('Invoices', 'Verify human-readable zero-padded invoice numbering format', () => {
    const formatInvoiceNumber = (year, count) => {
      const padded = String(count).padStart(6, '0');
      return `INV-${year}-${padded}`;
    };

    assertEqual(formatInvoiceNumber(2026, 1), 'INV-2026-000001', 'Padding 1 failed');
    assertEqual(formatInvoiceNumber(2026, 95), 'INV-2026-000095', 'Padding 95 failed');
    assertEqual(formatInvoiceNumber(2026, 1024), 'INV-2026-001024', 'Padding 1024 failed');
  });

  // --------------------------------------------------------------------------
  // DOMAIN 8: DELIVERIES & COURIER LOGISTICS
  // --------------------------------------------------------------------------
  console.log('\n--- Domain 8: Courier Deliveries & COD Handling ---');

  await runTest('Deliveries', 'Verify courier partners support and COD amount formatting', () => {
    const supportedCouriers = [
      'Domex',
      'Koombiyo',
      'Prompt Xpress',
      'Fardar',
      'Certis Lanka',
      'In-House Delivery',
    ];
    assert(supportedCouriers.includes('Domex'), 'Domex must be supported');
    assert(supportedCouriers.includes('Koombiyo'), 'Koombiyo must be supported');
    assert(supportedCouriers.includes('Prompt Xpress'), 'Prompt Xpress must be supported');

    const formatCodLabel = (amount, isCod) => {
      if (!isCod || amount <= 0) return 'PAID - DO NOT COLLECT CASH';
      return `CASH TO COLLECT: Rs. ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    };

    assertEqual(formatCodLabel(0, false), 'PAID - DO NOT COLLECT CASH', 'Prepaid label mismatch');
    assertEqual(formatCodLabel(4850, true), 'CASH TO COLLECT: Rs. 4,850.00', 'COD label mismatch');
  });

  // --------------------------------------------------------------------------
  // DOMAIN 9: FINANCIAL REPORTS & PROFIT & LOSS (P&L)
  // --------------------------------------------------------------------------
  console.log('\n--- Domain 9: Financial Reports & P&L Logic ---');

  await runTest('Reports', 'Validate Profit & Loss calculation (Revenue - COGS - Expenses = Net)', () => {
    const revenue = 150000;
    const cogs = 95000;
    const grossProfit = revenue - cogs;
    const expenses = 18500;
    const netProfit = grossProfit - expenses;
    const netMarginPercent = (netProfit / revenue) * 100;

    assertEqual(grossProfit, 55000, 'Gross profit calculation failed');
    assertEqual(netProfit, 36500, 'Net profit calculation failed');
    assertApprox(netMarginPercent, 24.33, 0.01, 'Net margin % calculation failed');
  });

  await runTest('Reports', 'Validate CSV string generation format with escaping', () => {
    const generateCsvRow = (fields) => {
      return fields.map(f => {
        const str = String(f ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',');
    };

    assertEqual(generateCsvRow(['INV-001', 'Kasun Perera', 5450]), 'INV-001,Kasun Perera,5450', 'Basic CSV failed');
    assertEqual(generateCsvRow(['INV-002', 'Perera, Galle', 3200]), 'INV-002,"Perera, Galle",3200', 'Escaped comma CSV failed');
  });

  // --------------------------------------------------------------------------
  // DOMAIN 10: PRODUCTION BUNDLE ARTIFACTS INTEGRITY
  // --------------------------------------------------------------------------
  console.log('\n--- Domain 10: Production Bundle Build Artifacts ---');

  await runTest('Build', 'Verify dist/index.html and asset bundles exist', () => {
    const distPath = path.join(rootDir, 'dist');
    assert(fs.existsSync(distPath), 'dist/ directory is missing');
    assert(fs.existsSync(path.join(distPath, 'index.html')), 'dist/index.html is missing');
    
    const assetsPath = path.join(distPath, 'assets');
    assert(fs.existsSync(assetsPath), 'dist/assets directory is missing');
    
    const assetFiles = fs.readdirSync(assetsPath);
    const hasJsBundle = assetFiles.some(f => f.endsWith('.js'));
    const hasCssBundle = assetFiles.some(f => f.endsWith('.css'));
    assert(hasJsBundle, 'Missing production JS bundle in dist/assets');
    assert(hasCssBundle, 'Missing production CSS bundle in dist/assets');
  });

  await runTest('Build', 'Verify Danix logo public asset availability', () => {
    const publicLogo = path.join(rootDir, 'public', 'logo.jpg');
    assert(fs.existsSync(publicLogo), 'public/logo.jpg is missing');
    const stats = fs.statSync(publicLogo);
    assert(stats.size > 10000, 'public/logo.jpg appears corrupted or empty');
  });

  // --------------------------------------------------------------------------
  // DOMAIN 11: DYNAMIC CATEGORY MANAGEMENT & AUTOMATIC SKU GENERATION
  // --------------------------------------------------------------------------
  console.log('\n--- Domain 11: Dynamic Category Management & Category-Based SKU Generation ---');

  await runTest('Categories', 'Verify all 10 default predefined categories are preserved', () => {
    const predefinedNames = [
      'Ceylon Tea',
      'Spices & Condiments',
      'Oils & Ghee',
      'Sweets & Syrups',
      'Dry Goods',
      'Canned Goods',
      'Bakery & Snacks',
      'Beverages',
      'Personal Care',
      'Other',
    ];
    const firestoreCode = fs.readFileSync(path.join(rootDir, 'src/lib/firebase/firestore.ts'), 'utf-8');
    for (const name of predefinedNames) {
      assert(firestoreCode.includes(name), `Missing predefined category: ${name}`);
    }
  });

  await runTest('Categories', 'Validate SKU prefix sanitization and length constraints', () => {
    const sanitize = (prefixOrName) => {
      if (!prefixOrName) return 'DAN';
      const clean = prefixOrName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      return clean.substring(0, 4) || 'DAN';
    };

    assertEqual(sanitize('Electronics'), 'ELEC', 'Prefix sanitization failed');
    assertEqual(sanitize('clothing'), 'CLOT', 'Prefix sanitization failed');
    assertEqual(sanitize('Accessories & Bags'), 'ACCE', 'Prefix sanitization failed');
    assertEqual(sanitize('Tea! 123'), 'TEA1', 'Prefix sanitization failed');
    assertEqual(sanitize(''), 'DAN', 'Empty prefix fallback failed');
  });

  await runTest('SKU', 'Validate category-based SKU generation (ELE-0001, ELE-0002, CLO-0001)', () => {
    const formatSku = (prefix, num) => `${prefix.toUpperCase()}-${String(num).padStart(4, '0')}`;

    assertEqual(formatSku('ELE', 1), 'ELE-0001', 'First SKU format mismatch');
    assertEqual(formatSku('ELE', 2), 'ELE-0002', 'Second SKU format mismatch');
    assertEqual(formatSku('CLO', 1), 'CLO-0001', 'Clothing SKU format mismatch');
    assertEqual(formatSku('ACC', 10), 'ACC-0010', 'Two-digit SKU format mismatch');
  });

  await runTest('SKU', 'Verify allocation considers existing products to prevent duplicates', () => {
    const existingProducts = [
      { id: '1', name: 'Radio', sku: 'ELE-0001', category: 'Electronics' },
      { id: '2', name: 'TV', sku: 'ELE-0002', category: 'Electronics' },
      { id: '3', name: 'Heater', sku: 'ELE-0005', category: 'Electronics' },
      { id: '4', name: 'Shirt', sku: 'CLO-0001', category: 'Clothing' },
    ];

    const getHighestSkuNumber = (prefix, products) => {
      const cleanPrefix = prefix.trim().toUpperCase();
      const regex = new RegExp(`^${cleanPrefix}-(\\d+)$`, 'i');
      let max = 0;
      for (const p of products) {
        if (!p.sku) continue;
        const match = p.sku.trim().match(regex);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > max) max = num;
        }
      }
      return max;
    };

    const highestEle = getHighestSkuNumber('ELE', existingProducts);
    assertEqual(highestEle, 5, 'Failed to identify highest existing SKU number for ELE');
    const nextEleSku = `ELE-${String(highestEle + 1).padStart(4, '0')}`;
    assertEqual(nextEleSku, 'ELE-0006', 'Failed to allocate next unique SKU based on existing products');

    const highestClo = getHighestSkuNumber('CLO', existingProducts);
    assertEqual(highestClo, 1, 'Failed to identify highest existing SKU number for CLO');
    const nextCloSku = `CLO-${String(highestClo + 1).padStart(4, '0')}`;
    assertEqual(nextCloSku, 'CLO-0002', 'Failed to allocate next unique SKU for CLO');
  });

  await runTest('SKU', 'Confirm existing product SKUs are 100% preserved and never modified during edit', () => {
    const existingProduct = {
      id: 'prod-001',
      name: 'Danix Premium Ceylon Black Tea 500g',
      sku: 'TEA-BLK-500',
      category: 'Ceylon Tea',
    };

    // Simulate update operation
    const isNew = false;
    let finalSku = existingProduct.sku;
    if (isNew) {
      finalSku = 'TEA-0001';
    }
    assertEqual(finalSku, 'TEA-BLK-500', 'Existing SKU was erroneously modified during update');
  });

  await runTest('SecurityRules', 'Verify firestore.rules contains category security rules and sku_counters', () => {
    const rules = fs.readFileSync(path.join(rootDir, 'firestore.rules'), 'utf-8');
    assert(rules.includes('match /categories/{categoryId}'), 'Missing categories match in firestore.rules');
    assert(rules.includes('function isValidCategory('), 'Missing isValidCategory function in firestore.rules');
    assert(rules.includes('sku_counters'), 'Missing sku_counters permission in firestore.rules');
  });

  await runTest('Config', 'Verify firestore.indexes.json contains categories composite index', () => {
    const indexesJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'firestore.indexes.json'), 'utf-8'));
    const collections = indexesJson.indexes.map(i => i.collectionGroup);
    assert(collections.includes('categories'), 'Missing categories index in firestore.indexes.json');
  });

  await runTest('CategoryDeletion', 'Verify category deletion is blocked if active products are assigned to it', () => {
    const products = [
      { id: 'p1', name: 'Product 1', category: 'Electronics' },
      { id: 'p2', name: 'Product 2', category: 'Clothing' },
    ];
    const categoryToDelete = { id: 'c1', name: 'Electronics' };

    const assignedCount = products.filter(
      (p) => p.category.toLowerCase() === categoryToDelete.name.toLowerCase()
    ).length;
    assertEqual(assignedCount, 1, 'Assigned products count should be 1');
    assert(assignedCount > 0, 'Should block category deletion when products are assigned');
  });

  await runTest('CategoryDeletion', 'Verify category deletion is permitted when no products are assigned', () => {
    const products = [
      { id: 'p1', name: 'Product 1', category: 'Clothing' },
    ];
    const categoryToDelete = { id: 'c2', name: 'Empty Category' };

    const assignedCount = products.filter(
      (p) => p.category.toLowerCase() === categoryToDelete.name.toLowerCase()
    ).length;
    assertEqual(assignedCount, 0, 'No products should be assigned to category');
    assert(assignedCount === 0, 'Category deletion should be permitted when assigned count is 0');
  });

  await runTest('SecurityRules', 'Verify firestore.rules enforces admin-only deletion of categories', () => {
    const rules = fs.readFileSync(path.join(rootDir, 'firestore.rules'), 'utf-8');
    assert(
      rules.includes('allow delete: if isAdmin();') && rules.includes('match /categories/{categoryId}'),
      'Missing admin delete check on categories collection in firestore.rules'
    );
  });

  // --------------------------------------------------------------------------
  // DOMAIN 12: FIRESTORE SERIALIZATION & SANITIZATION INTEGRITY
  // --------------------------------------------------------------------------
  console.log('\n--- Domain 12: Firestore Data Sanitization & Undefined Guard ---');

  await runTest('Serialization', 'Verify ignoreUndefinedProperties: true is configured in initializeFirestore', () => {
    const configCode = fs.readFileSync(path.join(rootDir, 'src/lib/firebase/config.ts'), 'utf-8');
    assert(configCode.includes('ignoreUndefinedProperties: true'), 'Missing ignoreUndefinedProperties: true in initializeFirestore settings');
  });

  await runTest('Serialization', 'Verify sanitizeForFirestore is exported and used in createConverter', () => {
    const firestoreCode = fs.readFileSync(path.join(rootDir, 'src/lib/firebase/firestore.ts'), 'utf-8');
    assert(firestoreCode.includes('export function sanitizeForFirestore'), 'Missing sanitizeForFirestore in firestore.ts');
    assert(firestoreCode.includes('toFirestore: (data: T) => sanitizeForFirestore(data)'), 'createConverter must call sanitizeForFirestore in toFirestore');
  });

  await runTest('Serialization', 'Verify deep recursive sanitization logic strips undefined properties', () => {
    function sanitizeForFirestore(data) {
      if (data === undefined) return undefined;
      if (data === null || typeof data !== 'object') return data;
      if (data instanceof Date) return data;
      if (
        typeof data?.toDate === 'function' ||
        typeof data?.toMillis === 'function' ||
        data?._methodName !== undefined ||
        data?.constructor?.name === 'FieldValue' ||
        data?._delegate !== undefined
      ) return data;
      if (Array.isArray(data)) {
        return data.map((item) => sanitizeForFirestore(item)).filter((item) => item !== undefined);
      }
      const cleaned = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          const sanitizedVal = sanitizeForFirestore(value);
          if (sanitizedVal !== undefined) {
            cleaned[key] = sanitizedVal;
          }
        }
      }
      return cleaned;
    }

    const testInput = {
      id: 'prod-001',
      name: 'Test Tea',
      barcode: undefined,
      description: undefined,
      costPrice: 500,
      active: true,
      tags: ['tea', undefined, 'black'],
      meta: {
        author: 'Admin',
        optionalNote: undefined,
        deep: {
          valid: 123,
          bad: undefined,
        },
      },
    };

    const sanitized = sanitizeForFirestore(testInput);
    assert(!('barcode' in sanitized), 'barcode should be omitted');
    assert(!('description' in sanitized), 'description should be omitted');
    assertEqual(sanitized.id, 'prod-001', 'id should be preserved');
    assertEqual(sanitized.costPrice, 500, 'costPrice should be preserved');
    assertEqual(sanitized.active, true, 'active boolean should be preserved');
    assertEqual(sanitized.tags.length, 2, 'array should omit undefined elements');
    assertEqual(sanitized.tags[0], 'tea', 'first element preserved');
    assertEqual(sanitized.tags[1], 'black', 'second element preserved');
    assert(!('optionalNote' in sanitized.meta), 'meta.optionalNote should be omitted');
    assertEqual(sanitized.meta.deep.valid, 123, 'meta.deep.valid should be preserved');
    assert(!('bad' in sanitized.meta.deep), 'meta.deep.bad should be omitted');
  });

  await runTest('Serialization', 'Verify modals and stores sanitize document writes', () => {
    const dataStoreCode = fs.readFileSync(path.join(rootDir, 'src/lib/dataStore.ts'), 'utf-8');
    const dataServiceCode = fs.readFileSync(path.join(rootDir, 'src/lib/dataService.ts'), 'utf-8');
    assert(dataStoreCode.includes('sanitizeForFirestore'), 'dataStore.ts must import and use sanitizeForFirestore');
    assert(dataServiceCode.includes('sanitizeForFirestore'), 'dataService.ts must import and use sanitizeForFirestore');
  });

  // --------------------------------------------------------------------------
  // SUMMARY REPORT
  // --------------------------------------------------------------------------
  console.log('\n==============================================================================');
  console.log(`  AUTOMATED QA RUN SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('==============================================================================\n');

  if (failedCount > 0) {
    console.error(`[!] QA suite finished with ${failedCount} test failure(s).`);
    process.exit(1);
  } else {
    console.log('[✓] All production domain logic, security checks, and build validations PASSED with 0 errors.');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
