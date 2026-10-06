import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  PackageCheck,
  PackageMinus,
  AlertOctagon,
  RotateCcw,
} from 'lucide-react';
import { Product, StockMovementType } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';

interface StockAdjustmentModalProps {
  products: Product[];
  initialProduct?: Product | null;
  onClose: () => void;
  onAdjust: (adjustment: {
    productId: string;
    sku: string;
    type: StockMovementType;
    quantity: number;
    reason: string;
    createdBy: string;
  }) => Promise<void>;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  products,
  initialProduct,
  onClose,
  onAdjust,
}) => {
  const { userProfile } = useAuth();
  const { notifySuccess, notifyError } = useNotification();

  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProduct?.id || (products[0]?.id ?? '')
  );
  const [movementType, setMovementType] = useState<StockMovementType>('stock_in');
  const [quantity, setQuantity] = useState<number | ''>(5);
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const previousStock = selectedProduct?.stockQuantity ?? 0;
  const numQuantity = typeof quantity === 'number' ? quantity : 0;

  // Calculate resulting stock based on type
  let resultingStock = previousStock;
  let delta = 0;

  switch (movementType) {
    case 'stock_in':
    case 'return':
      delta = numQuantity;
      resultingStock = previousStock + numQuantity;
      break;
    case 'sale':
    case 'damaged':
      delta = -numQuantity;
      resultingStock = previousStock - numQuantity;
      break;
    case 'adjustment':
      // For general adjustment, allow direct increase or decrease via signed input
      delta = numQuantity;
      resultingStock = previousStock + numQuantity;
      break;
  }

  const isNegativeStock = resultingStock < 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedProduct) {
      setError('Please select a valid product');
      return;
    }

    if (quantity === '' || numQuantity === 0) {
      setError('Quantity must be greater than zero');
      return;
    }

    if (isNegativeStock) {
      setError(
        `Invalid adjustment! Cannot reduce stock below 0 (Result would be ${resultingStock})`
      );
      return;
    }

    if (!reason.trim()) {
      setError('Please enter a note/reason for this stock change');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdjust({
        productId: selectedProduct.id,
        sku: selectedProduct.sku,
        type: movementType,
        quantity: delta,
        reason: reason.trim(),
        createdBy: userProfile?.name || 'Danix Operator',
      });

      notifySuccess(`Stock adjusted for ${selectedProduct.name}: New stock is ${resultingStock}`);
      onClose();
    } catch (err) {
      notifyError((err as Error).message || 'Failed to record stock adjustment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-navy-900 px-6 py-4 text-white">
          <div>
            <h3 className="text-base font-bold text-white">Record Stock Adjustment</h3>
            <p className="text-xs text-slate-300">
              Update inventory counts and record audit ledger entry
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Product Picker */}
          <div>
            <label className="block text-xs font-semibold text-navy-900 mb-1">
              Select Product <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — Current Stock: {p.stockQuantity}
                </option>
              ))}
            </select>
          </div>

          {/* Movement Type Radio Grid */}
          <div>
            <label className="block text-xs font-semibold text-navy-900 mb-1.5">
              Adjustment Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                {
                  id: 'stock_in',
                  label: 'Stock In',
                  sub: 'Restock / Inbound',
                  icon: PackageCheck,
                  color: 'text-emerald-600',
                  border: 'peer-checked:border-emerald-500 peer-checked:bg-emerald-50/50',
                },
                {
                  id: 'adjustment',
                  label: 'Audit Adj.',
                  sub: 'Physical count',
                  icon: TrendingUp,
                  color: 'text-amber-600',
                  border: 'peer-checked:border-amber-500 peer-checked:bg-amber-50/50',
                },
                {
                  id: 'damaged',
                  label: 'Damaged',
                  sub: 'Spoiled / Lost',
                  icon: AlertOctagon,
                  color: 'text-rose-600',
                  border: 'peer-checked:border-rose-500 peer-checked:bg-rose-50/50',
                },
                {
                  id: 'return',
                  label: 'Return',
                  sub: 'Customer return',
                  icon: RotateCcw,
                  color: 'text-purple-600',
                  border: 'peer-checked:border-purple-500 peer-checked:bg-purple-50/50',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <label key={item.id} className="relative cursor-pointer">
                    <input
                      type="radio"
                      name="movementType"
                      value={item.id}
                      checked={movementType === item.id}
                      onChange={() => setMovementType(item.id as StockMovementType)}
                      className="sr-only peer"
                    />
                    <div
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 text-center transition-all peer-checked:ring-2 peer-checked:ring-brand-500 ${item.border}`}
                    >
                      <Icon className={`h-4 w-4 mb-1 ${item.color}`} />
                      <span className="text-[11px] font-bold text-slate-800">{item.label}</span>
                      <span className="text-[9px] text-slate-400">{item.sub}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-xs font-semibold text-navy-900 mb-1">
              Quantity to {movementType === 'damaged' ? 'Write Off' : 'Adjust'}{' '}
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min={movementType === 'adjustment' ? undefined : '1'}
              step="1"
              value={quantity}
              onChange={(e) =>
                setQuantity(e.target.value === '' ? '' : parseInt(e.target.value, 10))
              }
              placeholder="e.g. 10"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="mt-1 text-[10px] text-slate-400">
              {movementType === 'damaged'
                ? 'Will deduct this quantity from available inventory'
                : movementType === 'stock_in'
                ? 'Will add this quantity to available inventory'
                : 'Will update inventory balance atomically'}
            </p>
          </div>

          {/* Real-time Before and After Stock Preview Card */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Stock Calculation Preview
            </span>
            <div className="flex items-center justify-between">
              {/* Previous */}
              <div className="text-center flex-1">
                <span className="text-slate-400 text-[10px] block font-medium">Previous Stock</span>
                <span className="text-lg font-bold text-slate-700">{previousStock}</span>
              </div>

              {/* Arrow with Change */}
              <div className="flex flex-col items-center px-4">
                <span
                  className={`text-xs font-extrabold flex items-center gap-0.5 ${
                    delta >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {delta >= 0 ? `+${delta}` : delta}
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400 my-0.5" />
              </div>

              {/* Resulting */}
              <div className="text-center flex-1">
                <span className="text-slate-400 text-[10px] block font-medium">New Stock</span>
                <span
                  className={`text-xl font-black ${
                    isNegativeStock
                      ? 'text-rose-600'
                      : resultingStock === 0
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {resultingStock}
                </span>
              </div>
            </div>

            {/* Negative stock warning */}
            {isNegativeStock && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-200">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>
                  <strong>Negative stock prevented!</strong> You cannot deduct {numQuantity} from an
                  existing balance of {previousStock}.
                </span>
              </div>
            )}
          </div>

          {/* Reason / Notes */}
          <div>
            <label className="block text-xs font-semibold text-navy-900 mb-1">
              Reason / Reference Notes <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Supplier delivery invoice #INV-402, monthly physical count correction, expired batch write-off..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isNegativeStock}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2 text-xs font-bold text-white shadow-md shadow-brand-500/25 hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirm Adjustment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
