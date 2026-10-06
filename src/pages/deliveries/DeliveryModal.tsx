import React, { useState, useEffect } from 'react';
import {
  Truck,
  X,
  CheckCircle2,
  AlertCircle,
  Hash,
  MapPin,
  Phone,
  DollarSign,
  FileText,
  User,
  Sparkles,
} from 'lucide-react';
import { Delivery, DeliveryStatus, Order } from '@/types';
import { useOrders } from '@/lib/dataStore';
import { useNotification } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';

interface DeliveryModalProps {
  delivery: Delivery | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (deliveryData: Partial<Delivery>) => Promise<void>;
}

const SRI_LANKA_COURIERS = [
  'Domex',
  'Koombiyo',
  'Prompt Xpress',
  'Fardar',
  'Certis Lanka',
  'In-House',
];

const SRI_LANKA_MAJOR_CITIES = [
  'Colombo',
  'Galle',
  'Kandy',
  'Maharagama',
  'Nugegoda',
  'Kadawatha',
  'Negombo',
  'Matara',
  'Kalutara',
  'Gampaha',
  'Kurunegala',
  'Ratnapura',
  'Jaffna',
  'Batticaloa',
  'Anuradhapura',
];

export const DeliveryModal: React.FC<DeliveryModalProps> = ({
  delivery,
  isOpen,
  onClose,
  onSave,
}) => {
  const { orders } = useOrders();
  const { userProfile } = useAuth();
  const { notifySuccess, notifyInfo } = useNotification();

  const isEditing = Boolean(delivery && delivery.id);

  // Form states
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [phone2, setPhone2] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<string>('Colombo');
  const [courier, setCourier] = useState<string>('Domex');
  const [serviceType, setServiceType] = useState<string>('COD');
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [deliveryFee, setDeliveryFee] = useState<number>(350);
  const [codAmount, setCodAmount] = useState<number>(0);
  const [status, setStatus] = useState<DeliveryStatus>('pending');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Populate fields on edit or reset on create
  useEffect(() => {
    if (delivery) {
      setOrderNumber(delivery.orderNumber || '');
      setOrderId(delivery.orderId || '');
      setCustomerName(delivery.customerName || '');
      setPhone(delivery.phone || '');
      setPhone2(delivery.phone2 || '');
      setAddress(delivery.address || '');
      setCity(delivery.city || 'Colombo');
      setCourier(delivery.courier || 'Domex');
      setServiceType(delivery.serviceType || (delivery.codAmount && delivery.codAmount > 0 ? 'COD' : 'PREPAID'));
      setTrackingNumber(delivery.trackingNumber || '');
      setDeliveryFee(delivery.deliveryFee || 350);
      setCodAmount(delivery.codAmount || 0);
      setStatus(delivery.status || 'pending');
      setNotes(delivery.notes || '');
    } else {
      setOrderNumber('');
      setOrderId('');
      setCustomerName('');
      setPhone('');
      setPhone2('');
      setAddress('');
      setCity('Colombo');
      setCourier('Domex');
      setServiceType('COD');
      setTrackingNumber('');
      setDeliveryFee(350);
      setCodAmount(0);
      setStatus('pending');
      setNotes('');
    }
  }, [delivery, isOpen]);

  if (!isOpen) return null;

  // When user selects an existing order from dropdown
  const handleSelectOrder = (selectedOrderNum: string) => {
    setOrderNumber(selectedOrderNum);
    const found = orders.find((o) => o.orderNumber === selectedOrderNum);
    if (found) {
      setOrderId(found.id);
      setCustomerName(found.customerName);
      setPhone(found.customerPhone);
      setAddress(found.customerAddress || '');
      setDeliveryFee(found.deliveryFee || 350);

      const isOrderCod = found.paymentMethod === 'cod' || found.paymentStatus === 'unpaid';
      setServiceType(isOrderCod ? 'COD' : 'PREPAID');
      setCodAmount(isOrderCod ? found.total : 0);

      notifyInfo(`Imported details from Order ${found.orderNumber}`, 'Order Linked');
    }
  };

  // Generate a realistic tracking number for the courier
  const generateTrackingNumber = () => {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    let prefix = 'DNX';
    switch (courier.toLowerCase()) {
      case 'domex':
        prefix = 'DMX-LK';
        break;
      case 'koombiyo':
        prefix = 'KB';
        break;
      case 'prompt xpress':
        prefix = 'PX';
        break;
      case 'fardar':
        prefix = 'FAR';
        break;
      case 'certis lanka':
        prefix = 'CL';
        break;
      case 'in-house':
        prefix = 'DNX-EXP';
        break;
    }
    const newTracking = `${prefix}-${randomDigits}`;
    setTrackingNumber(newTracking);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !phone || !address) return;

    try {
      setIsSubmitting(true);
      await onSave({
        orderNumber: orderNumber || `ORD-MANUAL-${Date.now().toString().slice(-4)}`,
        orderId: orderId || `ord-${Date.now()}`,
        customerName,
        phone,
        phone2: phone2 || undefined,
        address,
        city,
        courier,
        serviceType,
        trackingNumber: trackingNumber || undefined,
        deliveryFee,
        codAmount: serviceType === 'COD' ? codAmount : 0,
        status,
        notes: notes || undefined,
      });

      notifySuccess(
        isEditing
          ? `Updated delivery for ${customerName}`
          : `Created delivery parcel via ${courier}`,
        'Delivery Saved'
      );
      onClose();
    } catch (err) {
      console.error('Error saving delivery:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-navy-950/70 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/20">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-navy-900">
                {isEditing ? 'Edit Delivery Details' : 'Create New Courier Delivery'}
              </h2>
              <p className="text-xs text-slate-500">
                Assign delivery couriers, tracking codes, and configure COD collections.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
          {/* Order Association */}
          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-brand-500" />
                Linked Order Number
              </label>
              {orders.length > 0 && !isEditing && (
                <span className="text-[10px] text-slate-500 font-medium">
                  Select existing order to auto-fill
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  placeholder="e.g. ORD-2026-00101"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-brand-500 focus:outline-none"
                />
              </div>

              {!isEditing && orders.length > 0 && (
                <div>
                  <select
                    onChange={(e) => {
                      if (e.target.value) handleSelectOrder(e.target.value);
                    }}
                    defaultValue=""
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">-- Choose from Recent Orders --</option>
                    {orders.slice(0, 15).map((o) => (
                      <option key={o.id} value={o.orderNumber}>
                        {o.orderNumber} - {o.customerName} (Rs. {o.total.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Courier & Tracking Assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Courier Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Courier Partner *
              </label>
              <select
                required
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-navy-900 focus:border-brand-500 focus:outline-none"
              >
                {SRI_LANKA_COURIERS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Tracking Number */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Tracking Number
                </label>
                <button
                  type="button"
                  onClick={generateTrackingNumber}
                  className="text-[10px] font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  Auto-Gen ID
                </button>
              </div>
              <input
                type="text"
                placeholder="e.g. DMX-LK-8823194"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Customer & Address Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-navy-900 flex items-center gap-1.5 border-b border-slate-200 pb-1">
              <User className="h-3.5 w-3.5 text-brand-500" />
              Recipient Information
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                required
                placeholder="Full name of recipient"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Phone *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 0771234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Secondary Phone (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 0112845678"
                  value={phone2}
                  onChange={(e) => setPhone2(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-800 focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Delivery Address *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Street address, landmark, building number"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Destination City *
                </label>
                <input
                  type="text"
                  list="sl-cities"
                  required
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-brand-500 focus:outline-none"
                />
                <datalist id="sl-cities">
                  {SRI_LANKA_MAJOR_CITIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          {/* Payment & COD Configuration */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-navy-900 flex items-center gap-1.5 border-b border-slate-200 pb-1">
              <DollarSign className="h-3.5 w-3.5 text-brand-500" />
              Service & Collection (COD)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Service Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Service Type *
                </label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-brand-500 focus:outline-none"
                >
                  <option value="COD">CASH ON DELIVERY (COD)</option>
                  <option value="PREPAID">PREPAID (NO CASH)</option>
                </select>
              </div>

              {/* COD Collection Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  COD Amount to Collect (Rs.)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  disabled={serviceType === 'PREPAID'}
                  value={serviceType === 'PREPAID' ? 0 : codAmount}
                  onChange={(e) => setCodAmount(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-brand-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>

              {/* Delivery Fee */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Delivery Fee (Rs.)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Delivery Status & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Delivery Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DeliveryStatus)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-navy-900 focus:border-brand-500 focus:outline-none"
              >
                <option value="pending">Pending</option>
                <option value="ready">Ready for Dispatch</option>
                <option value="dispatched">Dispatched</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered (Syncs Order)</option>
                <option value="failed">Failed / Attempted</option>
                <option value="returned">Returned to Depot</option>
              </select>
              {status === 'delivered' && (
                <p className="mt-1 text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Will automatically update linked order to Delivered
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Delivery Notes / Instructions
              </label>
              <input
                type="text"
                placeholder="e.g. Fragile glass, Call before delivery"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2 text-xs font-bold text-white shadow-md shadow-brand-500/20 hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isSubmitting ? 'Saving...' : isEditing ? 'Update Delivery' : 'Create Delivery'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
