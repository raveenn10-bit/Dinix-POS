import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  AlertCircle,
  TrendingUp,
  Percent,
  Sparkles,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';
import { Product } from '@/types';
import { uploadProductImage } from '@/lib/firebase/storage';
import { useNotification } from '@/context/NotificationContext';

const PREDEFINED_CATEGORIES = [
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

interface ProductModalProps {
  product: Product | null; // null if creating, Product if editing
  existingProducts: Product[];
  onClose: () => void;
  onSave: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  existingProducts,
  onClose,
  onSave,
}) => {
  const isEditing = Boolean(product);
  const { notifySuccess, notifyError } = useNotification();

  const [name, setName] = useState(product?.name || '');
  const [sku, setSku] = useState(product?.sku || '');
  const [barcode, setBarcode] = useState(product?.barcode || '');
  const [category, setCategory] = useState(product?.category || PREDEFINED_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState(product?.description || '');
  const [costPrice, setCostPrice] = useState<number | ''>(product?.costPrice ?? '');
  const [sellingPrice, setSellingPrice] = useState<number | ''>(product?.sellingPrice ?? '');
  const [stockQuantity, setStockQuantity] = useState<number | ''>(product?.stockQuantity ?? 10);
  const [minimumStock, setMinimumStock] = useState<number | ''>(product?.minimumStock ?? 5);
  const [active, setActive] = useState<boolean>(product ? product.active : true);
  const [imageUrl, setImageUrl] = useState<string>(product?.imageUrl || '');

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Real-time Profit & Margin calculations
  const numCost = typeof costPrice === 'number' ? costPrice : 0;
  const numSelling = typeof sellingPrice === 'number' ? sellingPrice : 0;
  const profitAmount = numSelling - numCost;
  const profitMarginPercent = numSelling > 0 ? (profitAmount / numSelling) * 100 : 0;

  // Auto-generate SKU helper
  const handleGenerateSku = () => {
    const prefix = (category || 'DAN')
      .split(' ')
      .map((w) => w.substring(0, 3).toUpperCase())
      .join('-');
    const random = Math.floor(100 + Math.random() * 900);
    const generated = `${prefix.substring(0, 6)}-${random}`;
    setSku(generated);
    if (!barcode) {
      setBarcode(`479${Math.floor(1000000000 + Math.random() * 9000000000)}`);
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, image: 'Please select a valid image file (PNG, JPG, WebP)' }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: 'Image size should not exceed 5MB' }));
      return;
    }

    setImageFile(file);
    setUploadingImage(true);
    try {
      const uploadedUrl = await uploadProductImage(file, sku || 'product');
      setImageUrl(uploadedUrl);
      notifySuccess('Product image ready');
    } catch (err) {
      notifyError('Failed to process image file');
    } finally {
      setUploadingImage(false);
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!name.trim()) {
      errs.name = 'Product name is required';
    }

    if (!sku.trim()) {
      errs.sku = 'SKU is required';
    } else {
      // Unique SKU check
      const cleanSku = sku.trim().toUpperCase();
      const duplicate = existingProducts.find(
        (p) => p.sku.trim().toUpperCase() === cleanSku && (!isEditing || p.id !== product?.id)
      );
      if (duplicate) {
        errs.sku = `SKU "${sku}" is already in use by "${duplicate.name}"`;
      }
    }

    if (costPrice === '' || Number(costPrice) < 0) {
      errs.costPrice = 'Cost price must be 0 or higher';
    }

    if (sellingPrice === '' || Number(sellingPrice) <= 0) {
      errs.sellingPrice = 'Selling price must be greater than 0';
    } else if (Number(costPrice) > Number(sellingPrice)) {
      errs.sellingPriceWarning = 'Warning: Selling price is below cost price (Loss)';
    }

    if (stockQuantity === '' || Number(stockQuantity) < 0) {
      errs.stockQuantity = 'Stock quantity cannot be negative';
    }

    if (minimumStock === '' || Number(minimumStock) < 0) {
      errs.minimumStock = 'Minimum stock threshold cannot be negative';
    }

    if (category === 'Other' && !customCategory.trim()) {
      errs.category = 'Please specify the custom category name';
    }

    setErrors(errs);
    return Object.keys(errs).filter((k) => !k.includes('Warning')).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const finalCategory = category === 'Other' ? customCategory.trim() : category;

      await onSave({
        ...(product?.id ? { id: product.id } : {}),
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        barcode: barcode.trim() || undefined,
        category: finalCategory,
        description: description.trim() || undefined,
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        stockQuantity: Number(stockQuantity),
        minimumStock: Number(minimumStock),
        active,
        imageUrl: imageUrl.trim() || undefined,
      });

      notifySuccess(isEditing ? 'Product updated successfully' : 'New product created successfully');
      onClose();
    } catch (err) {
      notifyError((err as Error).message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  // Determine margin badge styling
  const getMarginBadge = () => {
    if (profitMarginPercent < 0) {
      return {
        bg: 'bg-rose-50 border-rose-200 text-rose-700',
        label: 'Loss Margin',
      };
    }
    if (profitMarginPercent < 15) {
      return {
        bg: 'bg-amber-50 border-amber-200 text-amber-800',
        label: 'Low Margin',
      };
    }
    return {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      label: 'Healthy Margin',
    };
  };

  const marginBadge = getMarginBadge();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="relative my-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-navy-900 px-6 py-4 text-white">
          <div>
            <h3 className="text-base font-bold text-white">
              {isEditing ? 'Edit Product' : 'Add New Product'}
            </h3>
            <p className="text-xs text-slate-300">
              {isEditing ? 'Update catalog details and inventory rules' : 'Create a new item in Danix POS inventory'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-300 hover:bg-navy-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Row 1: Product Name */}
          <div>
            <label className="block text-xs font-semibold text-navy-900 mb-1">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Danix Premium Ceylon Black Tea 500g"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 ${
                errors.name
                  ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/20'
                  : 'border-slate-200 focus:ring-brand-500'
              }`}
            />
            {errors.name && <p className="mt-1 text-[11px] text-rose-600">{errors.name}</p>}
          </div>

          {/* Row 2: SKU and Barcode with Auto-generate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-navy-900">
                  SKU Code <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleGenerateSku}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                >
                  <Sparkles className="h-3 w-3" />
                  Auto-generate
                </button>
              </div>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="e.g. TEA-BLK-500"
                className={`w-full font-mono uppercase rounded-xl border px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.sku
                    ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/20'
                    : 'border-slate-200 focus:ring-brand-500'
                }`}
              />
              {errors.sku && <p className="mt-1 text-[11px] text-rose-600">{errors.sku}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy-900 mb-1">
                Barcode (EAN-13 / Code-128)
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="e.g. 4792011001234"
                className="w-full font-mono rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="mt-1 text-[10px] text-slate-400">Scan product with barcode scanner or enter manually</p>
            </div>
          </div>

          {/* Row 3: Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-navy-900 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {PREDEFINED_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {category === 'Other' && (
              <div>
                <label className="block text-xs font-semibold text-navy-900 mb-1">
                  Custom Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter custom category"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.category && (
                  <p className="mt-1 text-[11px] text-rose-600">{errors.category}</p>
                )}
              </div>
            )}
          </div>

          {/* Row 4: Pricing & Margin Calculation Box */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-brand-500" />
                Pricing & Profit Margin Calculator
              </span>

              {numSelling > 0 && (
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${marginBadge.bg}`}
                >
                  <Percent className="h-3 w-3" />
                  {profitMarginPercent.toFixed(1)}% {marginBadge.label}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-navy-900 mb-1">
                  Cost Price (Rs.) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rs.</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="0.00"
                    className={`w-full rounded-xl border pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 ${
                      errors.costPrice
                        ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/20'
                        : 'border-slate-200 focus:ring-brand-500'
                    }`}
                  />
                </div>
                {errors.costPrice && <p className="mt-1 text-[11px] text-rose-600">{errors.costPrice}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-900 mb-1">
                  Selling Price (Rs.) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-brand-600">Rs.</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="0.00"
                    className={`w-full rounded-xl border pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 ${
                      errors.sellingPrice
                        ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/20'
                        : 'border-slate-200 focus:ring-brand-500'
                    }`}
                  />
                </div>
                {errors.sellingPrice && (
                  <p className="mt-1 text-[11px] text-rose-600">{errors.sellingPrice}</p>
                )}
              </div>
            </div>

            {/* Profit Margin Summary line */}
            <div className="flex items-center justify-between text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500">Gross Profit per Unit: </span>
                <span className={`font-bold ${profitAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  Rs. {profitAmount.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Margin: </span>
                <span className={`font-bold ${profitAmount >= 0 ? 'text-navy-900' : 'text-rose-600'}`}>
                  {numSelling > 0 ? `${profitMarginPercent.toFixed(1)}%` : '0%'}
                </span>
              </div>
            </div>

            {errors.sellingPriceWarning && (
              <div className="flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{errors.sellingPriceWarning}</span>
              </div>
            )}
          </div>

          {/* Row 5: Stock Quantities */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-navy-900 mb-1">
                Current Stock Quantity <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.stockQuantity
                    ? 'border-rose-400 focus:ring-rose-400'
                    : 'border-slate-200 focus:ring-brand-500'
                }`}
              />
              {errors.stockQuantity && (
                <p className="mt-1 text-[11px] text-rose-600">{errors.stockQuantity}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy-900 mb-1">
                Low Stock Threshold (Min Stock) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={minimumStock}
                onChange={(e) => setMinimumStock(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.minimumStock
                    ? 'border-rose-400 focus:ring-rose-400'
                    : 'border-slate-200 focus:ring-brand-500'
                }`}
              />
              <p className="mt-1 text-[10px] text-slate-400">Triggers alert when stock drops to or below this level</p>
            </div>
          </div>

          {/* Row 6: Image Upload & URL */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-navy-900">
              Product Image
            </label>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              {/* Image Preview Box */}
              <div className="relative h-24 w-24 shrink-0 rounded-xl border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                    onError={() => setImageUrl('')}
                  />
                ) : (
                  <ImageIcon className="h-8 w-8 text-slate-400" />
                )}
                {uploadingImage && (
                  <div className="absolute inset-0 bg-navy-900/60 flex items-center justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2 w-full">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                    <Upload className="h-3.5 w-3.5 text-brand-500" />
                    <span>Upload Image File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-xs text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      Clear image
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Or paste external image URL (e.g. https://...)"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                {errors.image && <p className="text-[11px] text-rose-600">{errors.image}</p>}
              </div>
            </div>
          </div>

          {/* Row 7: Description */}
          <div>
            <label className="block text-xs font-semibold text-navy-900 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide product highlights, packaging specifications, or storage details..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Row 8: Active Status Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div>
              <p className="text-xs font-semibold text-navy-900">Active in Store & POS</p>
              <p className="text-[11px] text-slate-500">
                Inactive products are hidden from POS terminal and active order picker
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500" />
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploadingImage}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-500/25 hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isEditing ? 'Update Product' : 'Create Product'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
