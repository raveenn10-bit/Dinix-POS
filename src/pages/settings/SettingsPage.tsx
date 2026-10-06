import React, { useState, useEffect } from 'react';
import {
  Settings,
  Store,
  MapPin,
  Phone,
  Mail,
  Receipt,
  Truck,
  Percent,
  Save,
  ShieldCheck,
  CheckCircle,
  Plus,
  Trash2,
  Building,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { fetchBusinessSettings, saveBusinessSettings } from '@/lib/dataService';
import { BusinessSettings } from '@/types';

export const SettingsPage: React.FC = () => {
  const { userProfile, isAdmin } = useAuth();
  const { notifySuccess, notifyError } = useNotification();

  const [settings, setSettings] = useState<BusinessSettings>({
    businessName: 'Danix.lk - Trusted Online Shopping',
    address: 'Akmeemana, Galle, Sri Lanka, 80054',
    phone: '076 252 4671',
    email: 'danixlkstore@gmail.com',
    currency: 'Rs.',
    invoicePrefix: 'INV-2026-',
    invoiceFooter: 'Thank you for shopping with Danix.lk! All electronics, genuine spices, and lifestyle items are backed by our verified store warranty. For support, call 076 252 4671.',
    taxSettings: {
      enabled: false,
      rate: 0,
    },
    deliverySettings: {
      defaultFee: 350,
      couriers: ['Pronto Courier', 'Prompt Xpress', 'Domex', 'Koombiyo', 'Citypak'],
    },
  });

  const [newCourier, setNewCourier] = useState('');
  const [bankDetails, setBankDetails] = useState(
    'Commercial Bank of Ceylon\nAccount Name: Danix Lanka PVT LTD\nAccount Number: 8009214455\nBranch: Galle Main Branch'
  );
  const [returnPolicy, setReturnPolicy] = useState(
    '7-Day Checking Warranty on all electronic devices. Unopened spice and tea products can be exchanged within 14 days of delivery with original receipt.'
  );

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await fetchBusinessSettings();
        setSettings(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setIsSaving(true);
    try {
      await saveBusinessSettings(settings, {
        uid: userProfile.uid,
        name: userProfile.name,
      });
      notifySuccess('Business and POS settings saved successfully!', 'Settings Saved');
    } catch (err) {
      console.error(err);
      notifyError('Failed to save settings. Please try again.', 'Error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCourier = () => {
    if (!newCourier.trim()) return;
    if (settings.deliverySettings.couriers.includes(newCourier.trim())) {
      notifyError('Courier already in the list.');
      return;
    }
    setSettings((prev) => ({
      ...prev,
      deliverySettings: {
        ...prev.deliverySettings,
        couriers: [...prev.deliverySettings.couriers, newCourier.trim()],
      },
    }));
    setNewCourier('');
  };

  const handleRemoveCourier = (courierName: string) => {
    setSettings((prev) => ({
      ...prev,
      deliverySettings: {
        ...prev.deliverySettings,
        couriers: prev.deliverySettings.couriers.filter((c) => c !== courierName),
      },
    }));
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-500" />
              Store Configuration
            </span>
          </div>
          <h1 className="text-2xl font-bold text-navy-950 sm:text-3xl">
            Business Profile & POS Settings
          </h1>
          <p className="text-xs text-slate-500">
            Customize invoice formats, default currency, delivery logistics partners, and official contact details.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: General Business Details */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-navy-950">Store Identity & Location</h2>
              <p className="text-[11px] text-slate-500">Official business details displayed on invoices</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Store / Company Name
              </label>
              <input
                type="text"
                required
                value={settings.businessName}
                onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Store Hotline Phone
              </label>
              <input
                type="text"
                required
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Official Business Email
              </label>
              <input
                type="email"
                required
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Default Currency Code / Symbol
              </label>
              <input
                type="text"
                required
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Warehouse / Head Office Address
              </label>
              <textarea
                rows={2}
                required
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Invoice & Billing Customizations */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-navy-950">Invoice & Billing Format</h2>
              <p className="text-[11px] text-slate-500">Configure numbering prefix and legal footer</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Invoice Number Prefix
              </label>
              <input
                type="text"
                required
                value={settings.invoicePrefix}
                onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <p className="mt-1 text-[11px] text-slate-400">Example output: INV-2026-00042</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                VAT / Sales Tax Configuration
              </label>
              <div className="flex items-center gap-3 mt-2">
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.taxSettings.enabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        taxSettings: { ...settings.taxSettings, enabled: e.target.checked },
                      })
                    }
                    className="rounded border-slate-300 text-brand-500 focus:ring-brand-500 h-4 w-4"
                  />
                  <span>Enable Tax on Invoices</span>
                </label>
                {settings.taxSettings.enabled && (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.1"
                      value={settings.taxSettings.rate}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          taxSettings: {
                            ...settings.taxSettings,
                            rate: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-900"
                    />
                    <span className="text-xs text-slate-500">%</span>
                  </div>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Invoice Footer Notice / Warranty Statement
              </label>
              <textarea
                rows={2}
                value={settings.invoiceFooter}
                onChange={(e) => setSettings({ ...settings, invoiceFooter: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Bank Account Details for Direct Transfer / COD Clearance
              </label>
              <textarea
                rows={3}
                value={bankDetails}
                onChange={(e) => setBankDetails(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-mono text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Logistics & Couriers */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-navy-950">Courier Logistics Settings</h2>
              <p className="text-[11px] text-slate-500">
                Authorized delivery partners and default dispatch fees
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="w-full sm:w-72">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Default Islandwide Delivery Fee (Rs.)
              </label>
              <input
                type="number"
                value={settings.deliverySettings.defaultFee}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    deliverySettings: {
                      ...settings.deliverySettings,
                      defaultFee: parseFloat(e.target.value) || 0,
                    },
                  })
                }
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Available Courier Partners
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {settings.deliverySettings.couriers.map((courier) => (
                  <div
                    key={courier}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800"
                  >
                    <span>{courier}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCourier(courier)}
                      className="text-slate-400 hover:text-rose-600 transition-colors"
                      title="Remove courier"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add courier input */}
              <div className="flex items-center gap-2 max-w-sm">
                <input
                  type="text"
                  placeholder="Add new courier..."
                  value={newCourier}
                  onChange={(e) => setNewCourier(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={handleAddCourier}
                  className="rounded-lg bg-navy-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-navy-800 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-brand-500/30 hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>Save All Business Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
