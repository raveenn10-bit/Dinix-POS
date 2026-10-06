import React, { useRef, useState } from 'react';
import {
  Printer,
  Download,
  FileSpreadsheet,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
} from 'lucide-react';
import { Invoice } from '@/types';
import { PrintableInvoice } from './PrintableInvoice';
import { useNotification } from '@/context/NotificationContext';

interface InvoiceViewModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onRecordPayment?: (invoice: Invoice) => void;
}

export const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onRecordPayment,
}) => {
  const [zoomScale, setZoomScale] = useState<number>(0.95);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const printContainerRef = useRef<HTMLDivElement>(null);
  const { notifySuccess, notifyInfo } = useNotification();

  if (!isOpen || !invoice) return null;

  // Print Handler
  const handlePrint = () => {
    notifyInfo('Opening print dialog...', 'Print Invoice');

    // Create a temporary print iframe or invoke window.print
    const printContent = document.getElementById('danix-modal-printable-invoice');
    if (!printContent) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) {
      // Popup blocked fallback: direct window.print()
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${invoice.invoiceNumber} - Danix.lk</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
          <script src="https://cdn.tailwindcss.com"></script>
          <script>
            tailwind.config = {
              theme: {
                extend: {
                  colors: {
                    brand: { 500: '#f36f21' },
                    navy: { 700: '#19476b', 800: '#0f3759', 900: '#0b2545' }
                  }
                }
              }
            }
          </script>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 10mm;
            }
            body {
              background: #ffffff !important;
              color: #000000 !important;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              margin: 0;
              padding: 0;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box;
            }
            @media print {
              .no-print { display: none !important; }
              body { margin: 0; }
            }
          </style>
        </head>
        <body class="p-0 m-0">
          <div style="max-width: 210mm; margin: 0 auto;">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.close();
              }, 400);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Download CSV Line items
  const handleDownloadCSV = () => {
    setIsExporting(true);
    try {
      const headers = ['Item No', 'Product Name', 'SKU', 'Quantity', 'Unit Price (LKR)', 'Discount (LKR)', 'Line Total (LKR)'];
      const rows = invoice.items.map((item, idx) => [
        idx + 1,
        `"${item.productName.replace(/"/g, '""')}"`,
        `"${item.sku}"`,
        item.quantity,
        item.unitPrice,
        item.discount,
        item.lineTotal,
      ]);

      const meta = [
        ['INVOICE METADATA'],
        ['Invoice Number', invoice.invoiceNumber],
        ['Order Ref', invoice.orderNumber || invoice.orderId],
        ['Date', new Date(invoice.createdAt).toISOString().split('T')[0]],
        ['Payment Status', invoice.paymentStatus.toUpperCase()],
        ['Customer Name', `"${invoice.customerSnapshot.name}"`],
        ['Customer Phone', `"${invoice.customerSnapshot.phone}"`],
        ['Customer Address', `"${(invoice.customerSnapshot.address || '').replace(/"/g, '""')}"`],
        ['Customer City', `"${invoice.customerSnapshot.city || ''}"`],
        [''],
        ['Subtotal', invoice.subtotal],
        ['Total Discount', invoice.discount],
        ['Delivery Fee', invoice.deliveryFee],
        ['Grand Total', invoice.total],
        ['Amount Paid', invoice.paidAmount || (invoice.paymentStatus === 'paid' ? invoice.total : 0)],
        ['Balance Due', Math.max(0, invoice.total - (invoice.paidAmount || (invoice.paymentStatus === 'paid' ? invoice.total : 0)))],
        [''],
        ['ITEMIZED ORDER DETAILS'],
      ];

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        meta.map((e) => e.join(',')).join('\n') +
        '\n' +
        headers.join(',') +
        '\n' +
        rows.map((e) => e.join(',')).join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Danix_Invoice_${invoice.invoiceNumber}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      notifySuccess(`Exported ${invoice.invoiceNumber} to CSV`, 'Download Complete');
    } catch (e) {
      console.error('CSV export failed:', e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-navy-950/80 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in"
    >
      <div className="flex h-[95vh] w-full max-w-5xl flex-col rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950 px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/20 text-brand-400 border border-brand-500/30">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">
                  Invoice {invoice.invoiceNumber}
                </h3>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                    invoice.paymentStatus === 'paid'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : invoice.paymentStatus === 'partial'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : invoice.paymentStatus === 'refunded'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}
                >
                  {invoice.paymentStatus}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Customer: <span className="text-slate-200">{invoice.customerSnapshot.name}</span> • Total:{' '}
                <span className="font-mono font-bold text-brand-400">
                  Rs. {invoice.total.toLocaleString()}
                </span>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center rounded-lg border border-slate-800 bg-slate-900 p-0.5 text-xs text-slate-300">
              <button
                type="button"
                onClick={() => setZoomScale((prev) => Math.max(0.6, prev - 0.1))}
                className="p-1.5 hover:text-white rounded hover:bg-slate-800"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="px-2 font-mono text-[11px] text-slate-400">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomScale((prev) => Math.min(1.2, prev + 0.1))}
                className="p-1.5 hover:text-white rounded hover:bg-slate-800"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(0.95)}
                className="p-1.5 hover:text-white rounded hover:bg-slate-800 border-l border-slate-800"
                title="Reset Zoom"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Quick Record Payment if unpaid or partial */}
            {onRecordPayment && invoice.paymentStatus !== 'paid' && invoice.paymentStatus !== 'refunded' && (
              <button
                type="button"
                onClick={() => onRecordPayment(invoice)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-sm"
              >
                <Check className="h-4 w-4" />
                <span>Record Payment</span>
              </button>
            )}

            {/* CSV Download */}
            <button
              type="button"
              onClick={handleDownloadCSV}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
              title="Download CSV report"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            {/* Print / Save PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-brand-500/20 hover:bg-brand-600 transition-colors"
            >
              <Printer className="h-4 w-4" />
              <span>Print / Save PDF</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Canvas Viewport */}
        <div className="flex-1 overflow-auto bg-slate-800/80 p-4 sm:p-8 flex justify-center items-start">
          <div
            ref={printContainerRef}
            style={{
              transform: `scale(${zoomScale})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out',
            }}
            className="shadow-2xl rounded-sm transition-all"
          >
            <PrintableInvoice
              invoice={invoice}
              id="danix-modal-printable-invoice"
            />
          </div>
        </div>

        {/* Bottom Status & Print Instructions */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-4 py-2.5 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>A4 Document Preview (210mm x 297mm standard format)</span>
          </div>
          <p className="hidden sm:block">
            In Chrome/Edge print dialog, choose <strong className="text-slate-300">"Save as PDF"</strong> to download high-resolution vector PDF.
          </p>
        </div>
      </div>
    </div>
  );
};
