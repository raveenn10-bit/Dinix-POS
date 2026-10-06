import React, { useState } from 'react';
import {
  Printer,
  X,
  Layers,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Tag,
} from 'lucide-react';
import { Delivery } from '@/types';
import { PrintableDeliveryLabel } from './PrintableDeliveryLabel';
import { useNotification } from '@/context/NotificationContext';

interface DeliveryLabelModalProps {
  deliveries: Delivery[];
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
}

export const DeliveryLabelModal: React.FC<DeliveryLabelModalProps> = ({
  deliveries,
  isOpen,
  onClose,
  initialIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [labelSize, setLabelSize] = useState<'4x6' | 'a4'>('4x6');
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [printMode, setPrintMode] = useState<'single' | 'all'>('single');
  const { notifyInfo } = useNotification();

  if (!isOpen || deliveries.length === 0) return null;

  const currentDelivery = deliveries[currentIndex] || deliveries[0];
  const isBatch = deliveries.length > 1;

  const handlePrint = (mode: 'single' | 'all') => {
    notifyInfo(
      mode === 'all'
        ? `Preparing batch print for ${deliveries.length} labels...`
        : `Preparing print for Order #${currentDelivery.orderNumber || currentDelivery.id}...`,
      'Print Shipping Label'
    );

    const labelsToPrint = mode === 'all' ? deliveries : [currentDelivery];

    const printWindow = window.open('', '_blank', 'width=800,height=950');
    if (!printWindow) {
      window.print();
      return;
    }

    const pageSizeCss =
      labelSize === '4x6'
        ? `@page { size: 100mm 150mm; margin: 3mm; }`
        : `@page { size: A4 portrait; margin: 8mm; }`;

    const labelHtmlList = labelsToPrint
      .map((del, i) => {
        const targetId = `batch-label-${i}`;
        const elem = document.getElementById(targetId);
        if (elem) return `<div class="page-break">${elem.outerHTML}</div>`;
        return '';
      })
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Shipping Labels (${labelsToPrint.length}) - Danix.lk</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            ${pageSizeCss}
            body {
              background: #ffffff !important;
              color: #000000 !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box;
            }
            .page-break {
              page-break-after: always;
              break-after: page;
              margin-bottom: 10mm;
            }
            .page-break:last-child {
              page-break-after: avoid;
              break-after: avoid;
              margin-bottom: 0;
            }
          </style>
        </head>
        <body class="p-2">
          ${labelHtmlList}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.close();
              }, 450);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-navy-950/80 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in"
    >
      <div className="flex h-[95vh] w-full max-w-4xl flex-col rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950 px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/20 text-brand-400 border border-brand-500/30">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">
                  Shipping Label Print Preview
                </h3>
                {isBatch && (
                  <span className="rounded-full bg-brand-500/20 border border-brand-500/30 px-2 py-0.5 text-[10px] font-bold text-brand-300">
                    {deliveries.length} Selected
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Order: <strong className="text-white">{currentDelivery.orderNumber || currentDelivery.id}</strong> • Courier:{' '}
                <strong className="text-white uppercase">{currentDelivery.courier}</strong>
              </p>
            </div>
          </div>

          {/* Controls: Size selector & actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Label Format Selector */}
            <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setLabelSize('4x6')}
                className={`px-2.5 py-1 rounded font-semibold text-xs transition-colors ${
                  labelSize === '4x6'
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                4" x 6" Thermal
              </button>
              <button
                type="button"
                onClick={() => setLabelSize('a4')}
                className={`px-2.5 py-1 rounded font-semibold text-xs transition-colors ${
                  labelSize === 'a4'
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                A4 Standard
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center rounded-lg border border-slate-800 bg-slate-900 p-0.5 text-xs text-slate-300">
              <button
                type="button"
                onClick={() => setZoomScale((prev) => Math.max(0.6, prev - 0.1))}
                className="p-1 hover:text-white"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="px-1.5 font-mono text-[11px] text-slate-400">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomScale((prev) => Math.min(1.4, prev + 0.1))}
                className="p-1 hover:text-white"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>

            {/* Print Current Label */}
            <button
              type="button"
              onClick={() => handlePrint('single')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <Printer className="h-4 w-4" />
              <span>Print This</span>
            </button>

            {/* Print All (if batch) */}
            {isBatch && (
              <button
                type="button"
                onClick={() => handlePrint('all')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-brand-500/20 hover:bg-brand-600 transition-colors"
              >
                <Layers className="h-4 w-4" />
                <span>Print All ({deliveries.length})</span>
              </button>
            )}

            {/* Close */}
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

        {/* Batch Navigator (if multiple items) */}
        {isBatch && (
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-4 py-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-mono font-semibold text-white">
                Label {currentIndex + 1} of {deliveries.length}
              </span>
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.min(deliveries.length - 1, prev + 1))}
                disabled={currentIndex === deliveries.length - 1}
                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
              <span>Tracking: {currentDelivery.trackingNumber || 'Pending'}</span>
              <span>•</span>
              <span className="text-white font-semibold">{currentDelivery.customerName}</span>
            </div>
          </div>
        )}

        {/* Hidden Container containing all labels for DOM extraction during batch print */}
        <div className="hidden" aria-hidden="true">
          {deliveries.map((del, idx) => (
            <div key={del.id} id={`batch-label-${idx}`}>
              <PrintableDeliveryLabel
                delivery={del}
                size={labelSize}
                labelIndex={idx + 1}
                totalLabels={deliveries.length}
              />
            </div>
          ))}
        </div>

        {/* Scrollable Preview Canvas */}
        <div className="flex-1 overflow-auto bg-slate-800/80 p-4 sm:p-8 flex justify-center items-start">
          <div
            style={{
              transform: `scale(${zoomScale})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out',
            }}
            className="shadow-2xl transition-all"
          >
            <PrintableDeliveryLabel
              delivery={currentDelivery}
              size={labelSize}
              labelIndex={currentIndex + 1}
              totalLabels={deliveries.length}
            />
          </div>
        </div>

        {/* Bottom Status bar */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-4 py-2.5 text-[11px] text-slate-400">
          <div>
            Recommended: Set printer layout to{' '}
            <strong className="text-slate-200">
              {labelSize === '4x6' ? '4 x 6 in (100 x 150 mm)' : 'A4 Portrait'}
            </strong>{' '}
            with margins set to <strong className="text-slate-200">"None"</strong>.
          </div>
          <div className="text-right text-[10px] text-slate-500 font-mono">
            High-Contrast Barcode (CODE 128)
          </div>
        </div>
      </div>
    </div>
  );
};
