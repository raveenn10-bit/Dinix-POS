import React, { useState, useMemo } from 'react';
import {
  ArrowLeftRight,
  Plus,
  Search,
  Filter,
  Calendar,
  Download,
  AlertTriangle,
  PackageX,
  TrendingUp,
  Boxes,
  PackageCheck,
  RotateCcw,
  AlertOctagon,
  RefreshCw,
  SlidersHorizontal,
  History,
} from 'lucide-react';
import { Product, StockMovement, StockMovementType } from '@/types';
import { useProducts, useStockMovements } from '@/lib/dataStore';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { StockAdjustmentModal } from './StockAdjustmentModal';

export const InventoryPage: React.FC = () => {
  const { products, refresh: refreshProducts } = useProducts();
  const { movements, loading: movementsLoading, addStockAdjustment, refresh: refreshMovements } =
    useStockMovements();
  const { userProfile, isAdmin } = useAuth();
  const { notifySuccess, notifyInfo } = useNotification();

  // Tab switch: Ledger vs. Stock Overview
  const [activeTab, setActiveTab] = useState<'ledger' | 'overview'>('ledger');

  // Filter state for Movements Ledger
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7days' | 'month'>('all');

  // Adjustment Modal state
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [presetProduct, setPresetProduct] = useState<Product | null>(null);

  // Summary Metrics calculations
  const summaryMetrics = useMemo(() => {
    const totalItems = products.length;
    const totalUnits = products.reduce((acc, p) => acc + p.stockQuantity, 0);
    const lowStockCount = products.filter(
      (p) => p.stockQuantity <= p.minimumStock && p.stockQuantity > 0
    ).length;
    const outOfStockCount = products.filter((p) => p.stockQuantity === 0).length;
    const costValue = products.reduce((acc, p) => acc + p.stockQuantity * p.costPrice, 0);
    const retailValue = products.reduce((acc, p) => acc + p.stockQuantity * p.sellingPrice, 0);

    return {
      totalItems,
      totalUnits,
      lowStockCount,
      outOfStockCount,
      costValue,
      retailValue,
    };
  }, [products]);

  // Filtered Movements
  const filteredMovements = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    return movements.filter((m) => {
      // Type match
      if (selectedType !== 'all' && m.type !== selectedType) {
        return false;
      }

      // Product match
      if (selectedProductFilter !== 'all' && m.productId !== selectedProductFilter) {
        return false;
      }

      // Date match
      const mTime = typeof m.createdAt === 'number' ? m.createdAt : new Date(m.createdAt).getTime();
      if (dateRange === 'today' && now - mTime > oneDay) {
        return false;
      }
      if (dateRange === '7days' && now - mTime > 7 * oneDay) {
        return false;
      }
      if (dateRange === 'month' && now - mTime > 30 * oneDay) {
        return false;
      }

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const prod = products.find((p) => p.id === m.productId);
        const matchesSku = m.sku.toLowerCase().includes(q);
        const matchesReason = (m.reason || '').toLowerCase().includes(q);
        const matchesUser = (m.createdBy || '').toLowerCase().includes(q);
        const matchesName = prod ? prod.name.toLowerCase().includes(q) : false;
        return matchesSku || matchesReason || matchesUser || matchesName;
      }

      return true;
    });
  }, [movements, selectedType, selectedProductFilter, dateRange, searchQuery, products]);

  const handleOpenAdjustment = (product?: Product) => {
    setPresetProduct(product || null);
    setIsAdjustmentModalOpen(true);
  };

  const handleExportCSV = () => {
    if (filteredMovements.length === 0) {
      notifyInfo('No movements to export for the selected filter');
      return;
    }

    const headers = [
      'Date',
      'Type',
      'SKU',
      'Product Name',
      'Quantity Change',
      'Previous Stock',
      'New Stock',
      'Reference / Reason',
      'Created By',
    ];

    const rows = filteredMovements.map((m) => {
      const prod = products.find((p) => p.id === m.productId);
      const dateStr = new Date(m.createdAt).toLocaleString('en-LK');
      return [
        `"${dateStr}"`,
        `"${m.type}"`,
        `"${m.sku}"`,
        `"${prod?.name || 'N/A'}"`,
        m.quantity,
        m.previousStock,
        m.newStock,
        `"${(m.reason || '').replace(/"/g, '""')}"`,
        `"${m.createdBy}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `danix-stock-movements-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notifySuccess('Stock movements exported as CSV');
  };

  // Type badge styling helper
  const getTypeBadge = (type: StockMovementType) => {
    switch (type) {
      case 'stock_in':
        return {
          icon: PackageCheck,
          label: 'Stock In',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'sale':
        return {
          icon: TrendingUp,
          label: 'Sale',
          color: 'bg-sky-50 text-sky-700 border-sky-200',
        };
      case 'return':
        return {
          icon: RotateCcw,
          label: 'Return',
          color: 'bg-purple-50 text-purple-700 border-purple-200',
        };
      case 'damaged':
        return {
          icon: AlertOctagon,
          label: 'Damaged',
          color: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'adjustment':
      default:
        return {
          icon: SlidersHorizontal,
          label: 'Adjustment',
          color: 'bg-amber-50 text-amber-700 border-amber-200',
        };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-navy-900 tracking-tight">
              Inventory & Stock Movements
            </h1>
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700 border border-brand-200">
              {summaryMetrics.totalUnits} Units in Stock
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time atomic stock control, audit movement ledger, and reorder alerts
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              refreshProducts();
              refreshMovements();
            }}
            title="Refresh Data"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAdjustment()}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-500/25 hover:bg-brand-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Adjust Stock</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
        {/* Total Catalog Items */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Items</span>
            <Boxes className="h-4 w-4 text-navy-700" />
          </div>
          <p className="mt-2 text-xl font-bold text-navy-900">{summaryMetrics.totalItems} SKUs</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{summaryMetrics.totalUnits} Total Units</p>
        </div>

        {/* Total Stock Value */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase">Stock Valuation</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-lg font-bold text-navy-900 truncate">
            Rs. {summaryMetrics.costValue.toLocaleString('en-LK')}
          </p>
          <p className="text-[10px] text-emerald-600 mt-0.5">
            Retail: Rs. {summaryMetrics.retailValue.toLocaleString('en-LK')}
          </p>
        </div>

        {/* Low Stock Counter */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-700 uppercase">Low Stock Alerts</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-xl font-bold text-amber-700">{summaryMetrics.lowStockCount} Items</p>
          <p className="text-[10px] text-amber-600/80 mt-0.5">At or below reorder threshold</p>
        </div>

        {/* Out of Stock Counter */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-700 uppercase">Out of Stock</span>
            <PackageX className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-2 text-xl font-bold text-rose-700">{summaryMetrics.outOfStockCount} Items</p>
          <p className="text-[10px] text-rose-600/80 mt-0.5">Cannot fulfill orders</p>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors ${
            activeTab === 'ledger'
              ? 'border-brand-500 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Stock Movement Ledger ({movements.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-colors ${
            activeTab === 'overview'
              ? 'border-brand-500 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="h-4 w-4" />
          <span>Product Balances & Quick Adjust</span>
        </button>
      </div>

      {/* TAB 1: STOCK MOVEMENT LEDGER */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ledger by SKU, product name, reference, or user..."
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Movement Type Filter */}
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="all">All Movement Types</option>
                  <option value="stock_in">Stock In (Restock)</option>
                  <option value="sale">Sale (Order Fulfillment)</option>
                  <option value="adjustment">Audit Adjustment</option>
                  <option value="damaged">Damaged / Write-off</option>
                  <option value="return">Customer Return</option>
                </select>

                {/* Product Dropdown */}
                <select
                  value={selectedProductFilter}
                  onChange={(e) => setSelectedProductFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 max-w-[200px] truncate focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="all">All Products</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} - {p.name}
                    </option>
                  ))}
                </select>

                {/* Date Range Filter */}
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
                  {[
                    { id: 'all', label: 'All Time' },
                    { id: 'today', label: 'Today' },
                    { id: '7days', label: 'Last 7D' },
                    { id: 'month', label: '30 Days' },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDateRange(d.id as 'all' | 'today' | '7days' | 'month')}
                      className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                        dateRange === d.id
                          ? 'bg-white font-bold text-navy-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="py-3.5 pl-6 pr-3">Timestamp</th>
                    <th className="px-3 py-3.5">Type</th>
                    <th className="px-3 py-3.5">Product & SKU</th>
                    <th className="px-3 py-3.5 text-center">Change</th>
                    <th className="px-3 py-3.5 text-center">Stock Transition</th>
                    <th className="px-3 py-3.5">Reason / Reference</th>
                    <th className="py-3.5 pl-3 pr-6 text-right">Logged By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {movementsLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Loading movements ledger...
                      </td>
                    </tr>
                  ) : filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <ArrowLeftRight className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-600">No stock movements found</p>
                        <p className="text-[11px] mt-0.5">
                          Try resetting filters or record a new stock adjustment.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((m) => {
                      const typeBadge = getTypeBadge(m.type);
                      const Icon = typeBadge.icon;
                      const prod = products.find((p) => p.id === m.productId);
                      const isPositive = m.quantity > 0;

                      return (
                        <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Timestamp */}
                          <td className="py-3.5 pl-6 pr-3 whitespace-nowrap">
                            <span className="font-medium text-slate-900 block">
                              {new Date(m.createdAt).toLocaleDateString('en-LK', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(m.createdAt).toLocaleTimeString('en-LK', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </td>

                          {/* Type */}
                          <td className="px-3 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold border ${typeBadge.color}`}
                            >
                              <Icon className="h-3 w-3" />
                              {typeBadge.label}
                            </span>
                          </td>

                          {/* Product */}
                          <td className="px-3 py-3.5">
                            <div className="font-bold text-navy-900">{prod?.name || 'Item'}</div>
                            <span className="font-mono text-[10px] text-slate-500 font-semibold">
                              {m.sku}
                            </span>
                          </td>

                          {/* Change */}
                          <td className="px-3 py-3.5 text-center">
                            <span
                              className={`inline-block font-black text-xs px-2 py-0.5 rounded-md ${
                                isPositive
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {isPositive ? `+${m.quantity}` : m.quantity}
                            </span>
                          </td>

                          {/* Stock Transition */}
                          <td className="px-3 py-3.5 text-center">
                            <span className="text-slate-400 font-mono text-[11px]">
                              {m.previousStock}
                            </span>
                            <span className="mx-1.5 text-slate-300">→</span>
                            <span className="font-bold font-mono text-navy-900 text-xs">
                              {m.newStock}
                            </span>
                          </td>

                          {/* Reason */}
                          <td className="px-3 py-3.5 max-w-xs">
                            <p className="text-xs text-slate-700 leading-snug break-words">
                              {m.reason || 'Manual inventory update'}
                            </p>
                            {m.referenceId && (
                              <span className="text-[10px] text-brand-600 font-mono font-semibold">
                                Ref: {m.referenceId}
                              </span>
                            )}
                          </td>

                          {/* Logged by */}
                          <td className="py-3.5 pl-3 pr-6 text-right whitespace-nowrap">
                            <span className="text-xs font-semibold text-slate-800">
                              {m.createdBy}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCT BALANCES & QUICK ADJUST */}
      {activeTab === 'overview' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="py-3.5 pl-6 pr-3">Product Name</th>
                  <th className="px-3 py-3.5">SKU</th>
                  <th className="px-3 py-3.5">Category</th>
                  <th className="px-3 py-3.5">Current Stock</th>
                  <th className="px-3 py-3.5">Min Threshold</th>
                  <th className="px-3 py-3.5">Stock Value (Cost)</th>
                  <th className="px-3 py-3.5">Stock Status</th>
                  <th className="py-3.5 pl-3 pr-6 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {products.map((p) => {
                  const isOut = p.stockQuantity === 0;
                  const isLow = p.stockQuantity <= p.minimumStock && !isOut;
                  const totalCostVal = p.stockQuantity * p.costPrice;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 pl-6 pr-3">
                        <div className="font-bold text-navy-900">{p.name}</div>
                      </td>
                      <td className="px-3 py-3.5 font-mono text-slate-600">{p.sku}</td>
                      <td className="px-3 py-3.5">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {p.category}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 font-bold text-sm text-navy-900">
                        {p.stockQuantity}
                      </td>
                      <td className="px-3 py-3.5 text-slate-400">{p.minimumStock}</td>
                      <td className="px-3 py-3.5 font-medium text-slate-700">
                        Rs. {totalCostVal.toLocaleString('en-LK')}
                      </td>
                      <td className="px-3 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isOut
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : isLow
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'Optimal'}
                        </span>
                      </td>
                      <td className="py-3.5 pl-3 pr-6 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenAdjustment(p)}
                          className="inline-flex items-center gap-1 rounded-xl bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800 transition-colors shadow-sm"
                        >
                          <SlidersHorizontal className="h-3 w-3" />
                          <span>Adjust</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {isAdjustmentModalOpen && (
        <StockAdjustmentModal
          products={products}
          initialProduct={presetProduct}
          onClose={() => setIsAdjustmentModalOpen(false)}
          onAdjust={async (adj) => {
            await addStockAdjustment(adj, {
              uid: userProfile?.uid || 'user',
              name: userProfile?.name || 'Danix User',
            });
            await refreshProducts();
          }}
        />
      )}
    </div>
  );
};
