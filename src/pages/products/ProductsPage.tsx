import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  AlertTriangle,
  QrCode,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  PackageX,
  TrendingUp,
  Percent,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { Product } from '@/types';
import { useProducts } from '@/lib/dataStore';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { ProductModal } from './ProductModal';
import { BarcodeModal } from './BarcodeModal';

export const ProductsPage: React.FC = () => {
  const { products, loading, saveProduct, deleteProduct, refresh } = useProducts();
  const { userProfile, isAdmin } = useAuth();
  const { notifySuccess, notifyWarning, notifyError } = useNotification();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Derived categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      // Search check: Name, SKU, Barcode
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        (item.barcode && item.barcode.toLowerCase().includes(q));

      // Category check
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

      // Status check
      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'active' && item.active) ||
        (selectedStatus === 'inactive' && !item.active);

      // Low stock check
      const matchesLowStock = !filterLowStockOnly || item.stockQuantity <= item.minimumStock;

      return matchesSearch && matchesCategory && matchesStatus && matchesLowStock;
    });
  }, [products, searchQuery, selectedCategory, selectedStatus, filterLowStockOnly]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalCount = products.length;
    const lowStockCount = products.filter(
      (p) => p.stockQuantity <= p.minimumStock && p.stockQuantity > 0
    ).length;
    const outOfStockCount = products.filter((p) => p.stockQuantity === 0).length;
    const totalInventoryValue = products.reduce(
      (sum, p) => sum + p.stockQuantity * p.costPrice,
      0
    );
    const totalRetailValue = products.reduce(
      (sum, p) => sum + p.stockQuantity * p.sellingPrice,
      0
    );

    return {
      totalCount,
      lowStockCount,
      outOfStockCount,
      totalInventoryValue,
      totalRetailValue,
    };
  }, [products]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProduct) return;
    if (!isAdmin) {
      notifyWarning('Only Administrators have permission to delete products');
      setDeletingProduct(null);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteProduct(deletingProduct.id, {
        uid: userProfile?.uid || 'admin',
        name: userProfile?.name || 'Admin',
      });
      notifySuccess(`Deleted product: ${deletingProduct.name}`);
      setDeletingProduct(null);
    } catch (err) {
      notifyError((err as Error).message || 'Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Page Title & Action Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-navy-900 tracking-tight">
              Products Management
            </h1>
            <span className="rounded-full bg-navy-100 px-2.5 py-0.5 text-xs font-bold text-navy-800">
              {products.length} Items
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Maintain catalog pricing, inventory reorder thresholds, and generate product barcode labels
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={refresh}
            title="Refresh Catalog"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-500/25 hover:bg-brand-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Catalog</span>
            <Boxes className="h-4 w-4 text-navy-700" />
          </div>
          <p className="mt-2 text-xl font-bold text-navy-900">{metrics.totalCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Active & archived items</p>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => setFilterLowStockOnly((prev) => !prev)}
          className={`cursor-pointer rounded-2xl border p-4 transition-all shadow-sm ${
            filterLowStockOnly
              ? 'border-amber-400 bg-amber-50/70 ring-2 ring-amber-400/40'
              : 'border-slate-200 bg-white hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-700 uppercase">Low Stock Alerts</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-xl font-bold text-amber-700">{metrics.lowStockCount}</p>
          <p className="text-[10px] text-amber-600/80 mt-0.5">
            {filterLowStockOnly ? 'Filtered: click to reset' : 'Click to filter'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-700 uppercase">Out of Stock</span>
            <PackageX className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-2 text-xl font-bold text-rose-700">{metrics.outOfStockCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Requires urgent restocking</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase">Inventory Value</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-lg font-bold text-navy-900 truncate">
            Rs. {metrics.totalInventoryValue.toLocaleString('en-LK')}
          </p>
          <p className="text-[10px] text-emerald-600 mt-0.5">
            Retail: Rs. {metrics.totalRetailValue.toLocaleString('en-LK')}
          </p>
        </div>
      </div>

      {/* Search & Filters Controls Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product by name, SKU (e.g. TEA-BLK), or barcode..."
              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filters & View Switches */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Dropdown */}
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as 'all' | 'active' | 'inactive')}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            {/* Low stock quick toggle button */}
            <button
              type="button"
              onClick={() => setFilterLowStockOnly((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold border transition-colors ${
                filterLowStockOnly
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Low Stock Only</span>
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-navy-900 shadow-sm'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Table View"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-navy-900 shadow-sm'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Grid View"
              >
                <Grid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Applied Filters indicator */}
        {(searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all' || filterLowStockOnly) && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
            <span>
              Showing <strong className="text-navy-900">{filteredProducts.length}</strong> of{' '}
              {products.length} products
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedStatus('all');
                setFilterLowStockOnly(false);
              }}
              className="font-semibold text-brand-600 hover:text-brand-700"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Content Rendering: Table or Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="text-xs text-slate-500 font-medium">Loading catalog products...</p>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Boxes className="h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-navy-900">No products found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {searchQuery || selectedCategory !== 'all' || filterLowStockOnly
              ? 'Try adjusting your search criteria or filters to locate items.'
              : 'Your product catalog is empty. Click below to add your first item!'}
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-brand-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add First Product</span>
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="py-3.5 pl-6 pr-3">Product</th>
                  <th className="px-3 py-3.5">SKU & Barcode</th>
                  <th className="px-3 py-3.5">Category</th>
                  <th className="px-3 py-3.5">Cost Price</th>
                  <th className="px-3 py-3.5">Selling Price</th>
                  <th className="px-3 py-3.5">Margin</th>
                  <th className="px-3 py-3.5">Stock</th>
                  <th className="px-3 py-3.5">Status</th>
                  <th className="py-3.5 pl-3 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredProducts.map((p) => {
                  const profit = p.sellingPrice - p.costPrice;
                  const marginPct = p.sellingPrice > 0 ? (profit / p.sellingPrice) * 100 : 0;
                  const isOutOfStock = p.stockQuantity === 0;
                  const isLowStock = p.stockQuantity <= p.minimumStock && !isOutOfStock;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Product Name & Image */}
                      <td className="py-3 pl-6 pr-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center">
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <Boxes className="h-5 w-5 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0 max-w-xs">
                            <p className="font-bold text-navy-900 truncate">{p.name}</p>
                            {p.description && (
                              <p className="text-[11px] text-slate-400 truncate">{p.description}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* SKU & Barcode */}
                      <td className="px-3 py-3 font-mono">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800">{p.sku}</span>
                          {p.barcode && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <QrCode className="h-3 w-3 inline text-slate-400" />
                              {p.barcode}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-3 py-3">
                        <span className="inline-block rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                          {p.category}
                        </span>
                      </td>

                      {/* Cost Price */}
                      <td className="px-3 py-3 font-medium text-slate-500">
                        Rs. {p.costPrice.toFixed(2)}
                      </td>

                      {/* Selling Price */}
                      <td className="px-3 py-3 font-bold text-navy-900">
                        Rs. {p.sellingPrice.toFixed(2)}
                      </td>

                      {/* Margin */}
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            marginPct < 15
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          <Percent className="h-2.5 w-2.5" />
                          {marginPct.toFixed(0)}%
                        </span>
                      </td>

                      {/* Stock Quantity */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              isOutOfStock
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : isLowStock
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {isOutOfStock ? (
                              <>
                                <PackageX className="h-3 w-3" />
                                0 Out
                              </>
                            ) : isLowStock ? (
                              <>
                                <AlertTriangle className="h-3 w-3" />
                                {p.stockQuantity} Low
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                {p.stockQuantity} In
                              </>
                            )}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Min: {p.minimumStock}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            p.active
                              ? 'bg-emerald-100/70 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {p.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 pl-3 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Barcode Viewer Button */}
                          <button
                            type="button"
                            onClick={() => setBarcodeProduct(p)}
                            title="Generate / Print Barcode"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-navy-50 hover:text-navy-900 transition-colors"
                          >
                            <QrCode className="h-4 w-4" />
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            title="Edit Product"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete Button (Admin Only) */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => setDeletingProduct(p)}
                              title="Delete Product (Admin Only)"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((p) => {
            const profit = p.sellingPrice - p.costPrice;
            const marginPct = p.sellingPrice > 0 ? (profit / p.sellingPrice) * 100 : 0;
            const isOutOfStock = p.stockQuantity === 0;
            const isLowStock = p.stockQuantity <= p.minimumStock && !isOutOfStock;

            return (
              <div
                key={p.id}
                className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all"
              >
                {/* Image Banner */}
                <div className="relative mb-3 h-40 w-full overflow-hidden rounded-xl border border-slate-100 bg-slate-100 flex items-center justify-center">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <Boxes className="h-10 w-10 text-slate-300" />
                  )}

                  {/* Stock Badge Overlay */}
                  <div className="absolute top-2 left-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold shadow-sm ${
                        isOutOfStock
                          ? 'bg-rose-600 text-white'
                          : isLowStock
                          ? 'bg-amber-500 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {isOutOfStock ? 'Out of Stock' : `${p.stockQuantity} in stock`}
                    </span>
                  </div>

                  {/* Active / Inactive Badge */}
                  {!p.active && (
                    <div className="absolute top-2 right-2">
                      <span className="rounded-md bg-navy-950/80 px-2 py-0.5 text-[10px] font-bold text-white uppercase backdrop-blur-sm">
                        Inactive
                      </span>
                    </div>
                  )}
                </div>

                {/* Category & SKU */}
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-semibold text-brand-600 uppercase tracking-wide">
                    {p.category}
                  </span>
                  <span className="font-mono text-slate-400">{p.sku}</span>
                </div>

                {/* Name */}
                <h3 className="font-bold text-navy-900 text-sm line-clamp-2 leading-tight flex-1 mb-2">
                  {p.name}
                </h3>

                {/* Pricing Block */}
                <div className="border-t border-slate-100 pt-3 mt-auto">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-base font-extrabold text-navy-900">
                      Rs. {p.sellingPrice.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Cost: Rs. {p.costPrice.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-3">
                    <span className="flex items-center gap-1 font-semibold text-emerald-700">
                      <TrendingUp className="h-3 w-3" />
                      Profit: Rs. {profit.toFixed(2)}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold">
                      {marginPct.toFixed(0)}% Margin
                    </span>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setBarcodeProduct(p)}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <QrCode className="h-3.5 w-3.5 text-slate-500" />
                      <span>Barcode</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(p)}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-navy-900 py-1.5 text-xs font-semibold text-white hover:bg-navy-800 transition-colors shadow-sm"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setDeletingProduct(p)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Delete product"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <ProductModal
          product={editingProduct}
          existingProducts={products}
          onClose={() => setIsModalOpen(false)}
          onSave={async (prodData) => {
            await saveProduct(prodData, {
              uid: userProfile?.uid || 'user',
              name: userProfile?.name || 'Danix User',
            });
          }}
        />
      )}

      {/* Barcode Viewer & Printer Modal */}
      {barcodeProduct && (
        <BarcodeModal
          product={barcodeProduct}
          onClose={() => setBarcodeProduct(null)}
        />
      )}

      {/* Delete Confirmation Modal (Admin only) */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 mx-auto mb-4">
              <Trash2 className="h-6 w-6" />
            </div>

            <h3 className="text-center text-base font-bold text-navy-900">
              Confirm Product Deletion
            </h3>
            <p className="mt-2 text-center text-xs text-slate-500 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-slate-800 font-semibold">{deletingProduct.name}</strong>{' '}
              (SKU: <span className="font-mono">{deletingProduct.sku}</span>)?
              This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                disabled={isDeleting}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-600/30 hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
