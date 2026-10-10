import React, { useState } from 'react';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  FolderTree,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Tag,
  Sparkles,
} from 'lucide-react';
import { ProductCategory, Product } from '@/types';
import { useNotification } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';
import { sanitizeSkuPrefix } from '@/lib/firebase/firestore';

interface CategoryModalProps {
  categories: ProductCategory[];
  products?: Product[];
  onClose: () => void;
  onSaveCategory: (
    categoryData: Omit<ProductCategory, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    user: { uid: string; name: string }
  ) => Promise<ProductCategory>;
  onToggleActive: (id: string, user: { uid: string; name: string }) => Promise<void>;
  onDeleteCategory?: (id: string, user: { uid: string; name: string }) => Promise<void>;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  categories,
  products = [],
  onClose,
  onSaveCategory,
  onToggleActive,
  onDeleteCategory,
}) => {
  const { userProfile, isAdmin } = useAuth();
  const { notifySuccess, notifyError, notifyWarning } = useNotification();

  // Mode: 'list' | 'add' | 'edit'
  const [mode, setMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<ProductCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Form Fields
  const [name, setName] = useState('');
  const [skuPrefix, setSkuPrefix] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currentUser = {
    uid: userProfile?.uid || 'admin',
    name: userProfile?.name || 'Administrator',
  };

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName('');
    setSkuPrefix('');
    setDescription('');
    setActive(true);
    setErrors({});
    setMode('add');
  };

  const handleOpenEdit = (cat: ProductCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSkuPrefix(cat.skuPrefix);
    setDescription(cat.description || '');
    setActive(cat.active);
    setErrors({});
    setMode('edit');
  };

  const handleCancelForm = () => {
    setMode('list');
    setEditingCategory(null);
    setErrors({});
  };

  // Auto-suggest prefix as user types name if prefix is empty or untouched
  const handleNameChange = (val: string) => {
    setName(val);
    if (mode === 'add' && (!skuPrefix || skuPrefix.length <= 4)) {
      setSkuPrefix(sanitizeSkuPrefix(val));
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const trimmedName = name.trim();
    const cleanPrefix = sanitizeSkuPrefix(skuPrefix || trimmedName);

    if (!trimmedName) {
      errs.name = 'Category name is required';
    } else {
      const dupName = categories.find(
        (c) =>
          c.name.toLowerCase() === trimmedName.toLowerCase() &&
          (!editingCategory || c.id !== editingCategory.id)
      );
      if (dupName) {
        errs.name = `Category "${trimmedName}" already exists`;
      }
    }

    if (!cleanPrefix) {
      errs.skuPrefix = 'Unique SKU prefix is required (e.g. ELE, CLO, TEA)';
    } else if (cleanPrefix.length < 2 || cleanPrefix.length > 6) {
      errs.skuPrefix = 'Prefix must be between 2 and 6 characters';
    } else {
      const dupPrefix = categories.find(
        (c) =>
          c.skuPrefix.toUpperCase() === cleanPrefix &&
          (!editingCategory || c.id !== editingCategory.id)
      );
      if (dupPrefix) {
        errs.skuPrefix = `Prefix "${cleanPrefix}" is already in use by "${dupPrefix.name}"`;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      notifyWarning('Only Administrators have permission to manage categories');
      return;
    }

    if (!validate()) return;

    setSaving(true);
    try {
      const cleanPrefix = sanitizeSkuPrefix(skuPrefix || name);
      const cleanDesc = description.trim();
      await onSaveCategory(
        {
          ...(editingCategory?.id ? { id: editingCategory.id } : {}),
          name: name.trim(),
          skuPrefix: cleanPrefix,
          active,
          ...(cleanDesc ? { description: cleanDesc } : {}),
        },
        currentUser
      );

      notifySuccess(
        editingCategory ? 'Category updated successfully' : 'New category created successfully'
      );
      setMode('list');
      setEditingCategory(null);
    } catch (err) {
      notifyError((err as Error).message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActiveClick = async (cat: ProductCategory) => {
    if (!isAdmin) {
      notifyWarning('Only Administrators can change category status');
      return;
    }

    try {
      await onToggleActive(cat.id, currentUser);
      notifySuccess(`Category "${cat.name}" is now ${cat.active ? 'inactive' : 'active'}`);
    } catch (err) {
      notifyError((err as Error).message || 'Failed to update category status');
    }
  };

  const handleDeleteClick = (cat: ProductCategory) => {
    if (!isAdmin) {
      notifyWarning('Only Administrators have permission to delete categories');
      return;
    }
    setDeletingCategory(cat);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCategory || !onDeleteCategory) return;
    setIsDeleting(true);
    try {
      await onDeleteCategory(deletingCategory.id, currentUser);
      notifySuccess(`Category "${deletingCategory.name}" was deleted successfully`);
      setDeletingCategory(null);
    } catch (err) {
      notifyError((err as Error).message || 'Failed to delete category');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="relative my-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-navy-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-brand-400">
              <FolderTree className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Category Management</h3>
              <p className="text-xs text-slate-300">
                Configure dynamic product categories and category-based SKU prefixes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-300 hover:bg-navy-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
          {mode === 'list' ? (
            <div className="space-y-4">
              {/* Top Action Bar */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                    Product Categories ({categories.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Active categories appear in the product creation dropdown with automatic SKU generation
                  </p>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleOpenAdd}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-brand-500/25 hover:bg-brand-600 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Category</span>
                  </button>
                )}
              </div>

              {/* Categories List Table */}
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Category Name</th>
                      <th className="px-3 py-3">SKU Prefix</th>
                      <th className="px-3 py-3">Sample SKU</th>
                      <th className="px-3 py-3 text-center">Status</th>
                      {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categories.map((cat) => (
                      <tr
                        key={cat.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          !cat.active ? 'opacity-60 bg-slate-50/40' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-semibold text-navy-950">
                          <div className="flex items-center gap-2">
                            <span>{cat.name}</span>
                            {cat.id.startsWith('cat-') && cat.id.length < 15 && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                                Default
                              </span>
                            )}
                          </div>
                          {cat.description && (
                            <p className="text-[10px] text-slate-400 font-normal line-clamp-1">
                              {cat.description}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3 font-mono font-bold text-brand-600">
                          {cat.skuPrefix}
                        </td>
                        <td className="px-3 py-3 font-mono text-[11px] text-slate-500">
                          {cat.skuPrefix}-0001
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleActiveClick(cat)}
                            title={cat.active ? 'Click to deactivate' : 'Click to activate'}
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold transition-all ${
                              cat.active
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {cat.active ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                Active
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 text-slate-400" />
                                Inactive
                              </>
                            )}
                          </button>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(cat)}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-navy-900 transition-colors"
                                title="Edit Category"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              {onDeleteCategory && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteClick(cat)}
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                  title="Delete Category"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Add / Edit Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-2">
                  <Tag className="h-4 w-4 text-brand-500" />
                  {mode === 'add' ? 'Add New Category' : `Edit Category: ${editingCategory?.name}`}
                </h4>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Back to list
                </button>
              </div>

              {/* Category Name */}
              <div>
                <label className="block text-xs font-semibold text-navy-900 mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Electronics, Clothing, Home Care"
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 ${
                    errors.name
                      ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/20'
                      : 'border-slate-200 focus:ring-brand-500'
                  }`}
                />
                {errors.name && <p className="mt-1 text-[11px] text-rose-600">{errors.name}</p>}
              </div>

              {/* SKU Prefix */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-navy-900">
                    Unique SKU Prefix <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">2-6 letters (e.g. ELE, CLO, ACC)</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={skuPrefix}
                    onChange={(e) => setSkuPrefix(sanitizeSkuPrefix(e.target.value))}
                    placeholder="e.g. ELE"
                    className={`w-full font-mono uppercase rounded-xl border px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 ${
                      errors.skuPrefix
                        ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/20'
                        : 'border-slate-200 focus:ring-brand-500'
                    }`}
                  />
                </div>
                {errors.skuPrefix && (
                  <p className="mt-1 text-[11px] text-rose-600">{errors.skuPrefix}</p>
                )}
                <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50/70 p-2 text-[11px] text-amber-800 border border-amber-200/60">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span>
                    New products in this category will receive SKUs like:{' '}
                    <strong className="font-mono">{skuPrefix || 'XXX'}-0001</strong>,{' '}
                    <strong className="font-mono">{skuPrefix || 'XXX'}-0002</strong>
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-navy-900 mb-1">
                  Description <span className="text-slate-400">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional notes or details about this product category"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="cat-active"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="cat-active" className="text-xs font-semibold text-navy-900 cursor-pointer">
                  Activate category for product catalog and POS selection
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-brand-500 px-5 py-2 text-xs font-bold text-white shadow-md shadow-brand-500/25 hover:bg-brand-600 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : mode === 'add' ? 'Create Category' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        {mode === 'list' && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-3 text-xs">
            <span className="text-[11px] text-slate-500">
              Changes update immediately across the entire POS system
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-navy-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-navy-800 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>

      {/* Category Delete Confirmation Modal */}
      {deletingCategory && (() => {
        const assignedProducts = (products || []).filter(
          (p) => p.category?.toLowerCase() === deletingCategory.name.toLowerCase()
        );
        const hasAssignedProducts = assignedProducts.length > 0;

        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-950/75 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full mx-auto mb-4 ${
                  hasAssignedProducts ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
                }`}
              >
                {hasAssignedProducts ? (
                  <AlertCircle className="h-6 w-6" />
                ) : (
                  <Trash2 className="h-6 w-6" />
                )}
              </div>

              <h3 className="text-center text-base font-bold text-navy-900">
                {hasAssignedProducts ? 'Cannot Delete Category' : 'Confirm Category Deletion'}
              </h3>

              {hasAssignedProducts ? (
                <div className="mt-3 text-center">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    The category <strong className="text-navy-950 font-semibold">{deletingCategory.name}</strong> cannot be deleted because{' '}
                    <span className="font-bold text-amber-700">{assignedProducts.length} product(s)</span> are currently assigned to it.
                  </p>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Please edit or reassign those products before deleting this category.
                  </p>
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => setDeletingCategory(null)}
                      className="w-full rounded-xl bg-navy-900 py-2.5 text-xs font-bold text-white hover:bg-navy-800 transition-colors"
                    >
                      Understood
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-center">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Are you sure you want to permanently delete the category{' '}
                    <strong className="text-navy-950 font-semibold">{deletingCategory.name}</strong>{' '}
                    (SKU Prefix: <span className="font-mono font-bold text-brand-600">{deletingCategory.skuPrefix}</span>)?
                  </p>
                  <p className="mt-2 text-[11px] text-rose-600">
                    This action cannot be undone.
                  </p>
                  <div className="mt-6 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setDeletingCategory(null)}
                      disabled={isDeleting}
                      className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      disabled={isDeleting}
                      className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-600/30 hover:bg-rose-700 transition-colors disabled:opacity-50"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete Category'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
