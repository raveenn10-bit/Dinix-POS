import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Invoice } from '@/types';

interface PrintableInvoiceProps {
  invoice: Invoice;
  id?: string;
  showSignatureLines?: boolean;
}

export const PrintableInvoice: React.FC<PrintableInvoiceProps> = ({
  invoice,
  id = 'danix-printable-invoice',
  showSignatureLines = true,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    // Generate QR code encoding verifiable invoice metadata
    const qrPayload = JSON.stringify({
      inv: invoice.invoiceNumber,
      order: invoice.orderNumber || invoice.orderId,
      customer: invoice.customerSnapshot.name,
      amount: invoice.total,
      currency: 'LKR',
      status: invoice.paymentStatus,
      date: new Date(invoice.createdAt).toLocaleDateString('en-GB'),
      verifyUrl: `https://danix.lk/verify/invoice/${invoice.invoiceNumber}`,
    });

    QRCode.toDataURL(qrPayload, {
      width: 140,
      margin: 1,
      color: {
        dark: '#0b2545', // navy-900 Danix deep navy
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('Failed to generate invoice QR code:', err));
  }, [invoice]);

  const formatDate = (val: string | number | undefined) => {
    if (!val) return 'N/A';
    const d = new Date(val);
    return isNaN(d.getTime())
      ? String(val)
      : d.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
  };

  const formatLKR = (amount: number) => {
    return `Rs. ${(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStatusBadge = (status: Invoice['paymentStatus']) => {
    switch (status) {
      case 'paid':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-600',
          printBorder: 'border-emerald-600 text-emerald-800',
          label: 'PAID IN FULL',
        };
      case 'partial':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-600',
          printBorder: 'border-amber-600 text-amber-800',
          label: 'PARTIALLY PAID',
        };
      case 'refunded':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-600',
          printBorder: 'border-rose-600 text-rose-800',
          label: 'REFUNDED',
        };
      case 'unpaid':
      default:
        return {
          bg: 'bg-red-50 text-red-700 border-red-600',
          printBorder: 'border-red-600 text-red-800',
          label: 'PAYMENT PENDING',
        };
    }
  };

  const statusConfig = getStatusBadge(invoice.paymentStatus);
  const paidAmount = invoice.paidAmount || (invoice.paymentStatus === 'paid' ? invoice.total : 0);
  const balanceDue = Math.max(0, invoice.total - paidAmount);

  return (
    <div
      id={id}
      className="printable-container printable-area bg-white text-slate-900 mx-auto font-sans text-xs select-text shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-0"
      style={{
        width: '100%',
        maxWidth: '210mm',
        minHeight: '297mm',
        padding: '16mm 18mm',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
      }}
    >
      {/* ================= HEADER SECTION ================= */}
      <div className="flex items-start justify-between border-b-2 border-navy-900 pb-5">
        {/* Left: Brand Identity */}
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <img
              src="/logo.jpg"
              alt="Danix.lk Logo"
              className="h-full w-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-2xl font-black tracking-tight text-navy-900 font-sans">
                DANIX<span className="text-brand-500">.LK</span>
              </h1>
            </div>
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
              Trusted Online Shopping
            </p>
            <div className="mt-2 space-y-0.5 text-[11px] text-slate-600 leading-tight">
              <p className="font-medium">Akmeemana, Galle, Sri Lanka 80054</p>
              <p>
                Hotline: <span className="font-semibold text-slate-900">076 252 4671</span> | Email:{' '}
                <span className="font-semibold text-slate-900">danixlkstore@gmail.com</span>
              </p>
              <p className="text-[10px] text-slate-400">Web: https://danix.lk</p>
            </div>
          </div>
        </div>

        {/* Right: Invoice Title & Meta */}
        <div className="text-right">
          <div className="inline-block rounded-lg bg-navy-900 px-3 py-1 text-white">
            <h2 className="text-base font-extrabold tracking-wider uppercase font-sans">
              TAX INVOICE
            </h2>
          </div>
          <div className="mt-2 space-y-1 text-xs">
            <p>
              <span className="text-slate-500">Invoice No:</span>{' '}
              <strong className="text-navy-900 font-mono text-sm tracking-wide">
                {invoice.invoiceNumber}
              </strong>
            </p>
            {invoice.orderNumber && (
              <p>
                <span className="text-slate-500">Order Ref:</span>{' '}
                <strong className="text-slate-800 font-mono">{invoice.orderNumber}</strong>
              </p>
            )}
            <p>
              <span className="text-slate-500">Date:</span>{' '}
              <strong className="text-slate-800">{formatDate(invoice.createdAt)}</strong>
            </p>
            {invoice.dueDate && (
              <p>
                <span className="text-slate-500">Due Date:</span>{' '}
                <strong className="text-slate-800">{formatDate(invoice.dueDate)}</strong>
              </p>
            )}
            <div className="pt-1">
              <span
                className={`inline-block border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded ${statusConfig.bg} ${statusConfig.printBorder}`}
              >
                {statusConfig.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= BILLED TO & PAYMENT METHOD SECTION ================= */}
      <div className="grid grid-cols-2 gap-6 py-4 border-b border-slate-200">
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-navy-900 mb-1.5 flex items-center gap-1">
            <span className="inline-block w-1.5 h-3 bg-brand-500 rounded-sm"></span>
            Billed To
          </h3>
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 text-xs space-y-1">
            <p className="font-bold text-sm text-slate-900">
              {invoice.customerSnapshot.name}
            </p>
            <p className="text-slate-700 font-medium">
              Phone: <span className="font-bold text-slate-900">{invoice.customerSnapshot.phone}</span>
            </p>
            {invoice.customerSnapshot.email && (
              <p className="text-slate-600">Email: {invoice.customerSnapshot.email}</p>
            )}
            <p className="text-slate-700 whitespace-pre-line leading-relaxed">
              {invoice.customerSnapshot.address || 'Standard Delivery Address'}
            </p>
            {invoice.customerSnapshot.city && (
              <p className="font-semibold text-slate-800">
                City: {invoice.customerSnapshot.city}
              </p>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-navy-900 mb-1.5 flex items-center gap-1">
            <span className="inline-block w-1.5 h-3 bg-navy-700 rounded-sm"></span>
            Payment & Dispatch Information
          </h3>
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Method:</span>
              <strong className="text-slate-900 uppercase">
                {invoice.paymentMethod === 'cod'
                  ? 'Cash On Delivery (COD)'
                  : invoice.paymentMethod === 'bank_transfer'
                  ? 'Bank Wire Transfer'
                  : invoice.paymentMethod === 'card'
                  ? 'Credit / Debit Card'
                  : invoice.paymentMethod === 'cash'
                  ? 'Store Cash'
                  : 'N/A'}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Status:</span>
              <span className="font-bold uppercase text-slate-800">
                {invoice.paymentStatus}
              </span>
            </div>
            {invoice.notes && (
              <div className="pt-1 border-t border-slate-200">
                <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                  Order Note:
                </span>
                <p className="text-[11px] text-slate-700 italic">{invoice.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= ITEMIZED PRODUCTS TABLE ================= */}
      <div className="py-4">
        <table className="w-full text-left border-collapse border border-slate-300">
          <thead>
            <tr className="bg-navy-900 text-white text-[11px] uppercase tracking-wider">
              <th className="py-2.5 px-3 border border-navy-900 w-10 text-center font-bold">#</th>
              <th className="py-2.5 px-3 border border-navy-900 font-bold">Item Description</th>
              <th className="py-2.5 px-3 border border-navy-900 w-28 text-center font-bold">SKU</th>
              <th className="py-2.5 px-3 border border-navy-900 w-16 text-center font-bold">Qty</th>
              <th className="py-2.5 px-3 border border-navy-900 w-24 text-right font-bold">Unit (Rs.)</th>
              <th className="py-2.5 px-3 border border-navy-900 w-20 text-right font-bold">Disc.</th>
              <th className="py-2.5 px-3 border border-navy-900 w-28 text-right font-bold">Total (Rs.)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {invoice.items.map((item, idx) => (
              <tr
                key={`${item.productId || item.sku}-${idx}`}
                className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
              >
                <td className="py-2 px-3 text-center border-r border-slate-200 text-slate-500 font-mono">
                  {idx + 1}
                </td>
                <td className="py-2 px-3 border-r border-slate-200 font-semibold text-slate-900">
                  {item.productName}
                </td>
                <td className="py-2 px-3 text-center border-r border-slate-200 font-mono text-[11px] text-slate-600">
                  {item.sku}
                </td>
                <td className="py-2 px-3 text-center border-r border-slate-200 font-bold text-slate-800">
                  {item.quantity}
                </td>
                <td className="py-2 px-3 text-right border-r border-slate-200 font-mono text-slate-700">
                  {item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-2 px-3 text-right border-r border-slate-200 font-mono text-slate-500">
                  {item.discount > 0
                    ? `-${item.discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                    : '-'}
                </td>
                <td className="py-2 px-3 text-right font-bold font-mono text-navy-900">
                  {item.lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ================= TOTALS & SUMMARY ================= */}
      <div className="grid grid-cols-12 gap-6 py-2 border-b border-slate-200 pb-5">
        {/* Left Column: Bank Accounts & QR Verification */}
        <div className="col-span-7 flex flex-col justify-between">
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-navy-900 mb-2">
              Bank Deposit Information
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-700">
              <div className="rounded border border-slate-200 bg-slate-50 p-2">
                <p className="font-bold text-navy-900">Commercial Bank of Ceylon</p>
                <p>Account: <strong className="font-mono text-slate-900">8009231456</strong></p>
                <p>Name: <strong>Danix Lanka (Pvt) Ltd</strong></p>
                <p>Branch: Galle Fort</p>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 p-2">
                <p className="font-bold text-navy-900">Bank of Ceylon (BOC)</p>
                <p>Account: <strong className="font-mono text-slate-900">0004529810</strong></p>
                <p>Name: <strong>Danix Lanka (Pvt) Ltd</strong></p>
                <p>Branch: Akmeemana</p>
              </div>
            </div>
            <p className="mt-1.5 text-[9px] text-slate-500 italic">
              * Please mention your Invoice #{invoice.invoiceNumber} as payment reference and send slip to WhatsApp 076 252 4671.
            </p>
          </div>

          {/* QR Code and verification tag */}
          <div className="flex items-center gap-3 pt-3 mt-3 border-t border-slate-100">
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="Invoice QR Code"
                className="h-16 w-16 border border-slate-300 rounded p-0.5 bg-white shrink-0"
              />
            ) : (
              <div className="h-16 w-16 border border-slate-300 rounded bg-slate-100 animate-pulse shrink-0" />
            )}
            <div className="text-[10px] text-slate-600">
              <p className="font-bold text-navy-900 uppercase">Tamper-Proof Verification</p>
              <p>Scan with any camera or Danix scanner to verify invoice authenticity.</p>
              <p className="font-mono text-[9px] text-slate-400 mt-0.5">
                ID: {invoice.id} • Ref: {invoice.invoiceNumber}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Calculations Breakdown */}
        <div className="col-span-5">
          <div className="rounded-xl border border-slate-300 bg-slate-50/80 p-3 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-medium text-slate-900">
                {formatLKR(invoice.subtotal)}
              </span>
            </div>

            {invoice.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount / Promo:</span>
                <span className="font-mono font-medium">
                  -{formatLKR(invoice.discount)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>Delivery / Courier Fee:</span>
              <span className="font-mono font-medium text-slate-900">
                {invoice.deliveryFee > 0 ? formatLKR(invoice.deliveryFee) : 'FREE'}
              </span>
            </div>

            <div className="border-t-2 border-navy-900 pt-2 flex justify-between items-center">
              <span className="text-sm font-extrabold uppercase text-navy-900">
                Grand Total:
              </span>
              <span className="text-base font-black font-mono text-navy-900">
                {formatLKR(invoice.total)}
              </span>
            </div>

            {/* Paid & Balance section */}
            <div className="pt-2 border-t border-slate-200 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Amount Paid:</span>
                <span className="font-mono font-semibold text-emerald-700">
                  {formatLKR(paidAmount)}
                </span>
              </div>
              <div className="flex justify-between font-bold">
                <span className={balanceDue > 0 ? 'text-red-700' : 'text-slate-800'}>
                  Balance Due:
                </span>
                <span
                  className={`font-mono text-xs ${
                    balanceDue > 0 ? 'text-red-700 underline' : 'text-emerald-700'
                  }`}
                >
                  {formatLKR(balanceDue)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= TERMS & SIGNATURE LINES ================= */}
      <div className="pt-4">
        {/* Terms and Return Policy */}
        <div className="text-[10px] text-slate-500 leading-normal mb-6">
          <p className="font-semibold text-slate-700 mb-0.5">Terms & Return Policy:</p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>
              Goods once sold can only be exchanged within 7 days from delivery date with original tax invoice and undamaged packaging.
            </li>
            <li>
              All electronic devices carry manufacturer or standard Danix warranty as indicated on individual warranty cards.
            </li>
            <li>
              Perishable and food items (tea, spices, coconut oils) must be checked upon handover.
            </li>
          </ul>
        </div>

        {/* Signature placeholders */}
        {showSignatureLines && (
          <div className="grid grid-cols-2 gap-16 pt-8 pb-4">
            <div className="text-center">
              <div className="border-t border-slate-400 mx-8 pt-1.5">
                <p className="font-bold text-slate-900 text-[11px]">Authorized Signature</p>
                <p className="text-[10px] text-slate-500">For DANIX LANKA (PVT) LTD</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-slate-400 mx-8 pt-1.5">
                <p className="font-bold text-slate-900 text-[11px]">Customer Acceptance</p>
                <p className="text-[10px] text-slate-500">Received in good order & condition</p>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Banner */}
        <div className="border-t border-slate-200 pt-3 text-center text-[10px] text-slate-400">
          <p className="font-semibold text-navy-900 text-[11px]">
            Thank you for shopping with Danix.lk! We appreciate your business.
          </p>
          <p className="mt-0.5">
            Danix POS • Automated Billing System • Akmeemana Dispatch Center, Galle
          </p>
        </div>
      </div>
    </div>
  );
};
