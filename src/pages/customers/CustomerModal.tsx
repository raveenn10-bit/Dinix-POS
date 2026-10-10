import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Customer } from '@/types';
import { useNotification } from '@/context/NotificationContext';

interface CustomerModalProps {
  customer: Customer | null; // null if adding, Customer if editing
  existingCustomers: Customer[];
  onClose: () => void;
  onSave: (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>;
}

// Sri Lankan phone regex validator: allows 07XXXXXXXX, +947XXXXXXXX, 7XXXXXXXX, 011XXXXXXX, etc.
export const validateSriLankanPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/[\s-]/g, '');
  const slRegex = /^(?:\+94|0094|0)?(?:7\d{8}|[1-9]\d{8})$/;
  return slRegex.test(cleaned);
};

// Format phone into clean display format
export const formatSriLankanPhone = (phone: string): string => {
  const cleaned = phone.replace(/[\s-]/g, '');
  if (cleaned.startsWith('+94')) {
    return cleaned;
  }
  if (cleaned.startsWith('0')) {
    return cleaned;
  }
  if (cleaned.length === 9) {
    return `0${cleaned}`;
  }
  return phone;
};

export const CustomerModal: React.FC<CustomerModalProps> = ({
  customer,
  existingCustomers,
  onClose,
  onSave,
}) => {
  const isEditing = Boolean(customer);
  const { notifySuccess, notifyError } = useNotification();

  const [name, setName] = useState(customer?.name || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [notes, setNotes] = useState(customer?.notes || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<boolean>(false);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!name.trim()) {
      errs.name = 'Customer name is required';
    }

    if (!phone.trim()) {
      errs.phone = 'Phone number is required';
    } else if (!validateSriLankanPhone(phone)) {
      errs.phone = 'Invalid Sri Lankan phone format (e.g. 0771234567 or +94771234567)';
    } else {
      // Check duplicate phone
      const cleanInput = phone.replace(/[\s-]/g, '');
      const duplicate = existingCustomers.find(
        (c) =>
          c.phone.replace(/[\s-]/g, '') === cleanInput &&
          (!isEditing || c.id !== customer?.id)
      );
      if (duplicate) {
        errs.phone = `Phone number already registered to "${duplicate.name}"`;
      }
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please provide a valid email address';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const cleanEmail = email.trim();
      const cleanAddress = address.trim();
      const cleanNotes = notes.trim();

      await onSave({
        ...(customer?.id ? { id: customer.id } : {}),
        name: name.trim(),
        phone: formatSriLankanPhone(phone.trim()),
        ...(cleanEmail ? { email: cleanEmail } : {}),
        ...(cleanAddress ? { address: cleanAddress } : {}),
        ...(cleanNotes ? { notes: cleanNotes } : {}),
        totalOrders: customer?.totalOrders || 0,
        totalSpent: customer?.totalSpent || 0,
      });

      notifySuccess(isEditing ? 'Customer profile updated' : 'New customer added successfully');
      onClose();
    } catch (err) {
      notifyError((err as Error).message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-navy-900 px-6 py-4 text-white">
          <div>
            <h3 className="text-base font-bold text-white">
              {isEditing ? 'Edit Customer' : 'Add New Customer'}
            </h3>
            <p className="text-xs text-slate-300">
              {isEditing
                ? 'Update customer contact information and delivery preferences'
                : 'Register customer profile for faster checkout and order tracking'}
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
          {/* Customer Full Name */}
          <div>
            <label className="block text-xs font-semibold text-navy-900 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kasun Jayasuriya"
                className={`w-full rounded-xl border pl-10 pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.name
                    ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/20'
                    : 'border-slate-200 focus:ring-brand-500'
                }`}
              />
            </div>
            {errors.name && <p className="mt-1 text-[11px] text-rose-600">{errors.name}</p>}
          </div>

          {/* Sri Lankan Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-navy-900 mb-1">
              Sri Lankan Phone Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0771234567 or +94771234567"
                className={`w-full rounded-xl border pl-10 pr-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.phone
                    ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/20'
                    : 'border-slate-200 focus:ring-brand-500'
                }`}
              />
            </div>
            {errors.phone ? (
              <p className="mt-1 text-[11px] text-rose-600">{errors.phone}</p>
            ) : (
              <p className="mt-1 text-[10px] text-slate-400">
                Supports Dialog, Mobitel, Airtel, Hutch format (e.g. 077, 071, 076, 078)
              </p>
            )}
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold text-navy-900 mb-1">
              Email Address (Optional)
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. customer@gmail.com"
                className={`w-full rounded-xl border pl-10 pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.email
                    ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/20'
                    : 'border-slate-200 focus:ring-brand-500'
                }`}
              />
            </div>
            {errors.email && <p className="mt-1 text-[11px] text-rose-600">{errors.email}</p>}
          </div>

          {/* Delivery Address */}
          <div>
            <label className="block text-xs font-semibold text-navy-900 mb-1">
              Delivery Address & Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. No. 45, Temple Road, Maharagama, Western Province"
                className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Notes / Preferences */}
          <div>
            <label className="block text-xs font-semibold text-navy-900 mb-1">
              Customer Notes / Delivery Remarks
            </label>
            <div className="relative">
              <FileText className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Prefers morning deliveries, gate buzzer #402, call before arriving..."
                className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2 text-xs font-bold text-white shadow-md shadow-brand-500/25 hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isEditing ? 'Update Customer' : 'Save Customer'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
